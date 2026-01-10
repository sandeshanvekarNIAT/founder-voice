import { useCallback, useEffect, useRef, useState } from 'react';
import { TranscriptItem } from '@/components/war-room/LiveTranscript';
import { createClient, LiveClient, LiveSchema, LiveTranscriptionEvents } from "@deepgram/sdk";
import { generateVCResponse } from '@/actions/groq';

interface UseRealtimeProps {
    onAudioDelta: (audio: ArrayBuffer) => void;
    onInterruption: () => void;
}

export const useRealtime = ({ onAudioDelta, onInterruption }: UseRealtimeProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);

    // We need to keep a clean history for Groq
    // Using a ref because connection closures might stale closures in event listeners
    const fullTranscriptRef = useRef<{ role: string, content: string }[]>([]);

    const connectionRef = useRef<LiveClient | null>(null);
    const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);

    const speakText = useCallback(async (text: string) => {
        try {
            const keyRes = await fetch('/api/deepgram');
            const { key } = await keyRes.json();

            const url = `https://api.deepgram.com/v1/speak?model=aura-asteria-en`;

            // We want raw PCM 24kHz to match our player
            // container=none, encoding=linear16, sample_rate=24000
            const ttsUrl = `${url}&container=none&encoding=linear16&sample_rate=24000`;

            const response = await fetch(ttsUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error("TTS Failed");

            const audioBuffer = await response.arrayBuffer();
            onAudioDelta(audioBuffer);

        } catch (e) {
            console.error("TTS Error:", e);
        }
    }, [onAudioDelta]);

    const handleUserMessage = useCallback(async (text: string) => {
        // 1. Update UI
        addTranscriptItem('user', text);
        fullTranscriptRef.current.push({ role: 'user', content: text });

        // 2. Think (Groq)
        setIsThinking(true);
        try {
            const aiResponseText = await generateVCResponse(fullTranscriptRef.current);

            setIsThinking(false);

            // 3. Update UI (Assistant)
            addTranscriptItem('assistant', aiResponseText);
            fullTranscriptRef.current.push({ role: 'assistant', content: aiResponseText });

            // 4. Speak (Deepgram TTS)
            setIsSpeaking(true);
            await speakText(aiResponseText);
            setIsSpeaking(false);

        } catch (err) {
            console.error("AI Logic Error:", err);
            setIsThinking(false);
        }
    }, [speakText]);

    const connect = useCallback(async () => {
        try {
            // 1. Get Ephemeral Key
            const res = await fetch('/api/deepgram');
            const { key } = await res.json();

            if (!key) throw new Error("No Deepgram key");

            // 2. Setup Deepgram Live Client (STT)
            const deepgram = createClient(key);
            const connection = deepgram.listen.live({
                model: "nova-2",
                language: "en-US",
                smart_format: true,
                interim_results: true,
                endpointing: 300, // wait 300ms of silence to finalize
                utterance_end_ms: 1000,
            });

            connection.on(LiveTranscriptionEvents.Open, () => {
                // If connection changed, ignore
                if (connectionRef.current !== connection) return;

                console.log("Deepgram STT Connected");
                setIsConnected(true);

                // Keep Alive
                keepAliveInterval.current = setInterval(() => {
                    connection.keepAlive();
                }, 10000);
            });

            connection.on(LiveTranscriptionEvents.Close, () => {
                // If connection changed, ignore (it means we manually disconnected/reconnected already)
                if (connectionRef.current !== connection) return;

                console.log("Deepgram STT Disconnected");
                setIsConnected(false);
                clearInterval(keepAliveInterval.current!);
            });

            connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
                const sentence = data.channel.alternatives[0].transcript;
                if (!sentence) return;

                // Interruption: If user starts speaking, stop AI audio
                if (sentence.trim().length > 0) {
                    onInterruption();
                }

                const isFinal = data.is_final;

                // Logic: 
                // We want to update the UI with interim results (user typing effect)
                // But only send to Groq when the user pauses (is_final or utterance end)

                if (isFinal && sentence.trim().length > 0) {
                    // Add User line to transcript
                    handleUserMessage(sentence);
                }
            });

            connectionRef.current = connection;

        } catch (error) {
            console.error('Connection failed:', error);
        }
    }, [handleUserMessage]);

    const disconnect = useCallback(() => {
        if (connectionRef.current) {
            connectionRef.current.requestClose();
            connectionRef.current = null;
        }
        if (keepAliveInterval.current) {
            clearInterval(keepAliveInterval.current);
        }
        setIsConnected(false);
    }, []);

    const sendAudio = useCallback((base64Audio: string) => {
        // Deepgram Live Client expects raw Blob or Buffer.
        // We receive Base64 from the recorder hook.
        // Convert to Buffer/Blob
        if (connectionRef.current && connectionRef.current.getReadyState() === 1) { // 1 = Open
            const binary = atob(base64Audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            connectionRef.current.send(bytes.buffer);
        }
    }, []);

    const addTranscriptItem = (role: 'user' | 'assistant', text: string) => {
        setTranscriptItems(prev => [
            ...prev,
            {
                id: Math.random().toString(36).substring(7),
                role,
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }
        ]);
    };

    const clearTranscript = useCallback(() => {
        setTranscriptItems([]);
        fullTranscriptRef.current = [];
    }, []);

    return {
        isConnected,
        isThinking,
        isSpeaking,
        connect,
        disconnect,
        sendAudio,
        transcriptItems,
        clearTranscript
    };
};
