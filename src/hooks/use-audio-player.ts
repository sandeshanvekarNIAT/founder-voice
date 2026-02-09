import { useRef, useCallback, useEffect, useState } from 'react';

const SAMPLE_RATE = 24000;

export const useAudioPlayer = () => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const nextStartTimeRef = useRef<number>(0);
    const queueRef = useRef<AudioBuffer[]>([]);

    // Initialize AudioContext on user interaction
    const initAudio = useCallback(async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        console.log("AudioContext Initialized & Resumed:", audioContextRef.current.state);
    }, []);

    const playBuffer = useCallback((buffer: AudioBuffer) => {
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
            if (ctx.currentTime >= nextStartTimeRef.current) {
                setIsPlaying(false);
            }
        };
    }, []);

    const addToQueue = useCallback((data: string | ArrayBuffer) => {
        if (!audioContextRef.current) {
            console.warn("AudioContext not initialized. Call initAudio() first.");
            return;
        }
        const ctx = audioContextRef.current;

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
    }, [playBuffer]);

    const clearQueue = useCallback(() => {
        if (audioContextRef.current) {
            audioContextRef.current.close().then(() => {
                audioContextRef.current = null;
                nextStartTimeRef.current = 0;
                setIsPlaying(false);
                // Re-init doesn't need to be automatic here, let the UI trigger it if needed
            });
        }
    }, []);

    return { initAudio, addToQueue, clearQueue, isPlaying };
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
