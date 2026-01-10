import { useRef, useState, useCallback } from 'react';

const INPUT_SAMPLE_RATE = 24000; // Realtime API expects 24kHz

export const useAudioRecorder = (onAudioData: (base64: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    autoGainControl: true,
                    noiseSuppression: true,
                    sampleRate: INPUT_SAMPLE_RATE // Try to request 24kHz directly
                }
            });

            streamRef.current = stream;
            setIsRecording(true);

            const audioContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Use ScriptProcessor for wide compatibility/simplicity
            // Buffer size 4096 = ~170ms latency at 24kHz. Maybe lower? 2048 = ~85ms
            const processor = audioContext.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert Float32 to Int16
                const pcm16 = floatTo16BitPCM(inputData);
                // Convert to Base64
                const base64 = arrayBufferToBase64(pcm16);
                onAudioData(base64);
            };

            source.connect(processor);
            processor.connect(audioContext.destination); // Needed for Chrome to activate processor

        } catch (err) {
            console.error('Error starting audio:', err);
        }
    }, [onAudioData]);

    const stopRecording = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsRecording(false);
    }, []);

    return { isRecording, startRecording, stopRecording, stream: streamRef.current };
};

// --- Utilities ---

function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
