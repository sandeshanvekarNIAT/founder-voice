import { useState, useRef, useCallback, useEffect } from 'react';

export function useTTS() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const queueRef = useRef<string[]>([]); // Queue of audio URLs
    const processingRef = useRef(false);   // Is the loop currently running?
    const stopSignalRef = useRef(false);   // Flag to abort processing

    const playNext = useCallback(async () => {
        if (queueRef.current.length === 0) {
            setIsPlaying(false);
            processingRef.current = false;
            return;
        }

        processingRef.current = true;
        const audioUrl = queueRef.current.shift()!;

        try {
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            await new Promise<void>((resolve, reject) => {
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                audio.onerror = (e) => {
                    console.error("Audio playback error:", e);
                    URL.revokeObjectURL(audioUrl);
                    resolve(); // Skip error and continue
                };
                // If stopped mid-playback
                if (stopSignalRef.current) {
                    audio.pause();
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                } else {
                    audio.play().catch(reject);
                }
            });

        } catch (err) {
            console.error("Playback failed:", err);
        }

        if (!stopSignalRef.current) {
            playNext();
        } else {
            setIsPlaying(false);
            processingRef.current = false;
        }
    }, []);

    const fetchAndQueue = useCallback(async (text: string) => {
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) throw new Error('TTS Failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);

            if (stopSignalRef.current) {
                URL.revokeObjectURL(url);
                return;
            }

            queueRef.current.push(url);

            // If not currently playing, start the loop
            if (!processingRef.current) {
                playNext();
            }

        } catch (e) {
            console.error("TTS Fetch Error:", e);
        }
    }, [playNext]);

    const speak = useCallback(async (text: string) => {
        // Stop any previous playback
        stopSignalRef.current = true;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        queueRef.current.forEach(url => URL.revokeObjectURL(url));
        queueRef.current = [];
        processingRef.current = false;

        // Allow state to settle, then reset signal
        setTimeout(async () => {
            stopSignalRef.current = false;
            setError(null);
            setIsPlaying(true);

            // Split text into sentences (approximate)
            // Match sentences ending in punctuation or end of string
            const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

            // Fetch sequentially to ensure order, or parallel?
            // Parallel fetching is faster but we must queue in order.
            // Since `fetchAndQueue` pushes to array, we must call it in order.

            // We want the first sentence ASAP.
            for (const sentence of sentences) {
                if (!sentence.trim()) continue;
                if (stopSignalRef.current) break;
                await fetchAndQueue(sentence.trim());
            }
        }, 50);

    }, [fetchAndQueue]);

    const stop = useCallback(() => {
        stopSignalRef.current = true;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        queueRef.current.forEach(url => URL.revokeObjectURL(url));
        queueRef.current = [];
        setIsPlaying(false);
        processingRef.current = false;
    }, []);

    return { speak, stop, isPlaying, error };
}
