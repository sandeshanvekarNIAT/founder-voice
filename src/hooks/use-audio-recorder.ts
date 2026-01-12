import { useRef, useState, useCallback } from 'react';
import { floatTo16BitPCM, arrayBufferToBase64, AUDIO_SAMPLE_RATE } from '@/lib/audio-utils';

export const useAudioRecorder = (onAudioData: (base64: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    echoCancellation: true,
                    autoGainControl: true,
                    noiseSuppression: true,
                    sampleRate: AUDIO_SAMPLE_RATE
                }
            });

            streamRef.current = stream;

            const audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
            audioContextRef.current = audioContext;

            // Load the custom audio processor worklet
            await audioContext.audioWorklet.addModule('/audio-processor.js');

            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;

            const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
            workletNodeRef.current = workletNode;

            workletNode.port.onmessage = (event) => {
                const inputData = event.data;
                const pcm16 = floatTo16BitPCM(inputData);
                const base64 = arrayBufferToBase64(pcm16);
                onAudioData(base64);
            };

            source.connect(workletNode);
            workletNode.connect(audioContext.destination);

            setIsRecording(true);

        } catch (err) {
            console.error('Error starting audio with AudioWorklet:', err);
            // Fallback or alert could go here
        }
    }, [onAudioData]);

    const stopRecording = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
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

    return { isRecording, startRecording, stopRecording, stream: streamRef.current };
};

