import { useRef, useState, useCallback } from 'react';
import { floatTo16BitPCM, arrayBufferToBase64, AUDIO_SAMPLE_RATE } from '@/lib/audio-utils';

export const useAudioRecorder = (onAudioData: (base64: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    // State for sample rate to pass to Deepgram
    const [sampleRate, setSampleRate] = useState<number>(AUDIO_SAMPLE_RATE);

    const startRecording = useCallback(async () => {
        try {
            // ... (previous getUserMedia code) ...
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    autoGainControl: true,
                    noiseSuppression: true,
                    // Remove ideal sampleRate to avoid constraints error, we will read actual rate later
                }
            });

            streamRef.current = stream;
            setStream(stream);

            const audioContext = new AudioContext(); // Let browser decide rate
            audioContextRef.current = audioContext;
            setSampleRate(audioContext.sampleRate);
            console.log(`[AudioRecorder] Microphone started at ${audioContext.sampleRate}Hz`);

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Inline Worklet Code to avoid file loading issues
            const workletCode = `
                class AudioProcessor extends AudioWorkletProcessor {
                    process(inputs, outputs, parameters) {
                        const input = inputs[0];
                        if (input && input.length > 0) {
                            this.port.postMessage(input[0]);
                        }
                        return true;
                    }
                }
                registerProcessor('audio-processor', AudioProcessor);
            `;

            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);

            await audioContext.audioWorklet.addModule(workletUrl);

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                const inputData = event.data;
                if (inputData && inputData.length > 0) {
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64 = arrayBufferToBase64(pcm16);
                    onAudioData(base64);
                }
            };

            workletNode.onprocessorerror = (err) => {
                console.error("Audio Worklet Processor Error:", err);
            };

            source.connect(workletNode);
            workletNode.connect(audioContext.destination);

            setIsRecording(true);

            return audioContext.sampleRate; // Return rate for sync usage

        } catch (err) {
            console.error('Error starting audio with Inline Worklet:', err);
            alert(`Microphone Error: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }, [onAudioData]);

    const stopRecording = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
        if (workletNodeRef.current) {
            workletNodeRef.current.port.onmessage = null;
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
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

    return { isRecording, startRecording, stopRecording, stream, sampleRate };
};

