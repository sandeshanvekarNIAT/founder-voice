import { useCallback, useEffect, useRef, useState } from 'react';
import { TranscriptItem } from '@/components/war-room/LiveTranscript';
import { createClient, LiveClient, LiveSchema, LiveTranscriptionEvents } from "@deepgram/sdk";
import { generateVCResponse } from '@/actions/groq';
import { VoiceMode } from '@/components/war-room/VoiceSettings';

interface UseRealtimeProps {
    onAudioDelta: (audio: ArrayBuffer) => void;
    onInterruption: () => void;
    onInterrogated?: (claim: string) => void; // Called when AI cuts in
    deckContext: string | null;
    voiceMode: VoiceMode;
}

export const useRealtime = ({ onAudioDelta, onInterruption, onInterrogated, deckContext, voiceMode }: UseRealtimeProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const connectingRef = useRef(false); // Synchronous lock
    const [isThinking, setIsThinking] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);

    const connectionRef = useRef<LiveClient | null>(null);
    const keepAliveInterval = useRef<NodeJS.Timeout | null>(null);
    const fullTranscriptRef = useRef<{ role: string, content: string }[]>([]);
    const deepgramKeyRef = useRef<string | null>(null);

    // Interrogation State
    const lastInterruptionTimeRef = useRef<number>(0);
    const interrogationCooldown = 20000; // 20 seconds (up from 15s)
    const redFlags = ['no competitors', 'zero competition', 'everyone will buy', 'billion dollar', 'easy money', 'perfect product'];

    // Logic Guard State
    const lastLogicCheckTimeRef = useRef<number>(0);
    const logicCheckInterval = 12000; // 12 seconds (up from 5s)

    const speakText = useCallback(async (text: string) => {
        try {
            const key = deepgramKeyRef.current;
            if (!key) {
                console.log("TTS Ignored: Session disconnected or key cleared.");
                return;
            }
            const url = `https://api.deepgram.com/v1/speak?model=aura-asteria-en&container=none&encoding=linear16&sample_rate=24000`;

            const response = await fetch(url, {
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

    const handleUserMessage = useCallback(async (text: string, isInterruption = false) => {
        // ALWAYS LOG, even if AI is busy
        addTranscriptItem('user', text);
        fullTranscriptRef.current.push({ role: 'user', content: text });

        // Only prevent TRIGGERING a new response if busy
        if (isThinking || isSpeaking) return;

        // Manual Mode: NEVER auto-trigger response on silence
        if (voiceMode === 'manual' && !isInterruption) return;

        // Dynamic Mode: Check for keywords or rely on longer silence (which is handled by utterance_end in Deepgram, but we add extra checks here if needed)
        if (voiceMode === 'dynamic' && !isInterruption) {
            const keywords = ['over', 'done', 'finished', 'question', 'what do you think'];
            const lowerText = text.toLowerCase();
            const hasKeyword = keywords.some(k => lowerText.includes(k));
            const isLongEnough = text.split(' ').length > 5; // Avoid short fragments

            if (!hasKeyword && !isLongEnough) {
                console.log("Dynamic Mode: Ignoring short/keyword-less utterance.");
                return;
            }
        }

        triggerResponse(text, isInterruption);
    }, [speakText, deckContext, isThinking, isSpeaking, voiceMode]);

    const triggerResponse = useCallback(async (text: string, isInterruption = false) => {
        setIsThinking(true);
        try {
            const processedText = isInterruption ? `[INTERRUPTING USER AT: "${text}"]` : text;
            const lastMsg = fullTranscriptRef.current[fullTranscriptRef.current.length - 1];
            if (lastMsg) lastMsg.content = processedText;

            const aiResponseText = await generateVCResponse(fullTranscriptRef.current, deckContext);
            setIsThinking(false);

            addTranscriptItem('assistant', aiResponseText);
            fullTranscriptRef.current.push({ role: 'assistant', content: aiResponseText });

            setIsSpeaking(true);
            await speakText(aiResponseText);
            setIsSpeaking(false);
        } catch (err) {
            console.error("AI Logic Error:", err);
            setIsThinking(false);
            setIsSpeaking(false);
        }
    }, [speakText, deckContext]);

    const connect = useCallback(async () => {
        if (connectingRef.current || isConnected) {
            console.log("Connection attempt ignored: already connecting or connected.");
            return;
        }

        // Synchronous Lock
        connectingRef.current = true;
        setIsConnecting(true);

        // Cleanup any existing connection/interval synchronously
        if (connectionRef.current) {
            console.log("Cleaning up existing connection before reconnecting...");
            connectionRef.current.finish();
            connectionRef.current = null;
        }
        if (keepAliveInterval.current) {
            clearInterval(keepAliveInterval.current);
            keepAliveInterval.current = null;
        }

        try {
            const res = await fetch('/api/deepgram');
            const { key } = await res.json();
            if (!key) throw new Error("No Deepgram key");
            deepgramKeyRef.current = key;

            // Determine endpointing based on mode
            let endpointing = 1000;
            let utteranceEndMs = 1500;

            if (voiceMode === 'patient') {
                endpointing = 3000; // Wait 3s for silence (Increased)
                utteranceEndMs = 5000; // Wait 5s before finalizing (Increased)
            } else if (voiceMode === 'dynamic') {
                endpointing = 1500;
                utteranceEndMs = 2500; // Increased slightly
            } else if (voiceMode === 'manual') {
                // In manual mode, we still want transcripts, but we ignore them in handleUserMessage
                endpointing = 1000;
                utteranceEndMs = 1500;
            }

            const deepgram = createClient(key);
            const connection = deepgram.listen.live({
                model: "nova-2",
                language: "en-US",
                smart_format: true,
                interim_results: true,
                encoding: "linear16",
                sample_rate: 24000,
                endpointing: endpointing,
                utterance_end_ms: utteranceEndMs,
            });

            // CRITICAL: Set immediately so handlers refer to the correct instance
            connectionRef.current = connection;

            connection.on(LiveTranscriptionEvents.Open, () => {
                if (connectionRef.current !== connection) {
                    connection.finish();
                    return;
                }
                console.log("Deepgram STT Connected");
                setIsConnected(true);
                setIsConnecting(false);
                connectingRef.current = false;

                keepAliveInterval.current = setInterval(() => {
                    if (connection.getReadyState() === 1) {
                        connection.keepAlive();
                    }
                }, 10000);
            });

            connection.on(LiveTranscriptionEvents.Close, () => {
                if (connectionRef.current === connection) {
                    console.log("Deepgram STT Disconnected (Self)");
                    setIsConnected(false);
                    setIsConnecting(false);
                    connectingRef.current = false;
                    connectionRef.current = null;
                    if (keepAliveInterval.current) {
                        clearInterval(keepAliveInterval.current);
                        keepAliveInterval.current = null;
                    }
                }
            });

            connection.on(LiveTranscriptionEvents.Error, (err) => {
                console.error("Deepgram Error:", err);
                if (connectionRef.current === connection) {
                    setIsConnecting(false);
                    connectingRef.current = false;
                    setIsConnected(false);
                }
            });

            connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
                const sentence = data.channel.alternatives[0].transcript;
                if (!sentence) return;

                // Only barge-in if we have enough confidence/length
                // Ignore short blips like "um" or noise
                if (sentence.trim().length > 15) {
                    onInterruption();
                }

                const now = Date.now();
                const canInterrupt = now - lastInterruptionTimeRef.current > interrogationCooldown;

                // INTERRUPTION LOGIC
                // In manual mode, AI NEVER interrupts automatically based on red flags
                if (voiceMode !== 'manual' && !data.is_final && canInterrupt && !isThinking && !isSpeaking) {
                    const lowerSentence = sentence.toLowerCase();
                    const hasRedFlag = redFlags.find(flag => lowerSentence.includes(flag));
                    const isTooLong = sentence.split(' ').length > 50; // Increased from 25

                    if (hasRedFlag || isTooLong) {
                        lastInterruptionTimeRef.current = now;
                        if (onInterrogated) onInterrogated(hasRedFlag || "Vague Pitching");
                        handleUserMessage(sentence, true);
                        return;
                    }
                }

                if (voiceMode !== 'manual' && !data.is_final && canInterrupt && !isThinking && !isSpeaking && deckContext) {
                    const timeSinceLastCheck = now - lastLogicCheckTimeRef.current;
                    if (timeSinceLastCheck > logicCheckInterval && sentence.split(' ').length > 20) { // Increased from 10
                        lastLogicCheckTimeRef.current = now;
                        fetch('/api/check-logic', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ transcript: sentence, deckContext })
                        })
                            .then(res => res.json())
                            .then(result => {
                                if (result.shouldInterrupt) {
                                    lastInterruptionTimeRef.current = Date.now();
                                    if (onInterrogated) onInterrogated(result.reason);
                                    handleUserMessage(sentence, true);
                                }
                            })
                            .catch(err => console.error("Logic Guard check failed:", err));
                    }
                }

                if (data.is_final && sentence.trim().length > 0) {
                    handleUserMessage(sentence);
                }
            });

        } catch (error) {
            console.error('Connection failed:', error);
            setIsConnecting(false);
            connectingRef.current = false;
        }
    }, [handleUserMessage, onInterruption, onInterrogated, isThinking, isSpeaking, isConnected, deckContext, voiceMode]); // Added voiceMode dependency

    const disconnect = useCallback(() => {
        if (connectionRef.current) {
            connectionRef.current.finish();
            connectionRef.current = null;
        }
        if (keepAliveInterval.current) {
            clearInterval(keepAliveInterval.current);
            keepAliveInterval.current = null;
        }
        setIsConnected(false);
        setIsConnecting(false);
        connectingRef.current = false;
        deepgramKeyRef.current = null;
    }, []);

    const sendAudio = useCallback((base64Audio: string) => {
        if (connectionRef.current && connectionRef.current.getReadyState() === 1) {
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
                id: crypto.randomUUID(),
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

    // Manual Trigger for Push-to-Talk
    const manualTrigger = useCallback(() => {
        const lastMsg = fullTranscriptRef.current[fullTranscriptRef.current.length - 1];
        if (lastMsg && lastMsg.role === 'user') {
            // If the last message was user, assume they just finished speaking and want a reply
            triggerResponse(lastMsg.content);
        } else {
            // Nothing to reply to, or AI already spoke.
            console.log("Manual trigger ignored: No recent user message to reply to.");
        }
    }, [triggerResponse]);

    return {
        isConnected,
        isConnecting,
        isThinking,
        isSpeaking,
        connect,
        disconnect,
        sendAudio,
        transcriptItems,
        clearTranscript,
        manualTrigger // Exporting manual trigger
    };
};
