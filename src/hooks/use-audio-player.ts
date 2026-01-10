import { useRef, useCallback, useEffect, useState } from 'react';

const SAMPLE_RATE = 24000;

export const useAudioPlayer = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const nextStartTimeRef = useRef<number>(0);
    const queueRef = useRef<AudioBuffer[]>([]);

    // Initialize AudioContext on user interaction (or first play)
    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
        }
    }, []);

    const addToQueue = useCallback((data: string | ArrayBuffer) => {
        if (!audioContextRef.current) initAudioContext();
        const ctx = audioContextRef.current!;

        let audioData: ArrayBuffer;
        if (typeof data === 'string') {
            audioData = base64ToArrayBuffer(data);
        } else {
            audioData = data;
        }

        const int16Array = new Int16Array(audioData);
        const float32Array = new Float32Array(int16Array.length);

        // Convert Int16 to Float32
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768;
        }

        const buffer = ctx.createBuffer(1, float32Array.length, SAMPLE_RATE);
        buffer.copyToChannel(float32Array, 0);

        playBuffer(buffer);
    }, [initAudioContext]);

    const playBuffer = (buffer: AudioBuffer) => {
        if (!audioContextRef.current) return;
        const ctx = audioContextRef.current;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const currentTime = ctx.currentTime;
        // Schedule strictly after the previous chunk
        // Ensure we don't schedule in the past
        const startTime = Math.max(currentTime, nextStartTimeRef.current);

        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;

        setIsPlaying(true);

        source.onended = () => {
            // Logic to determine if stopped playing?
            // Simple check: if currentTime > nextStartTime, we are done
            if (ctx.currentTime >= nextStartTimeRef.current) {
                setIsPlaying(false);
            }
        };
    };

    const clearQueue = useCallback(() => {
        // We can't easily stop already scheduled nodes without keeping track of them.
        // For "Barge-In", we usually just close the context or stop all sources.
        // Re-creating context is the brute-force way to silence everything immediately.
        if (audioContextRef.current) {
            audioContextRef.current.close().then(() => {
                audioContextRef.current = null;
                nextStartTimeRef.current = 0;
                setIsPlaying(false);
                initAudioContext(); // Prepare for next
            });
        }
    }, [initAudioContext]);

    return { addToQueue, clearQueue, isPlaying };
};

function base64ToArrayBuffer(base64: string) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
