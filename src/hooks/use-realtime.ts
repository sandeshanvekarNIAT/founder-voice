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
    timeLeftRef: React.MutableRefObject<number>;
}

export const useRealtime = ({ onAudioDelta, onInterruption, onInterrogated, deckContext, voiceMode, timeLeftRef }: UseRealtimeProps) => {
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

    // Buffering Refs
    const transcriptBufferRef = useRef<string>("");
    const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Reused as debounce timer

    // Interrogation State
    const lastInterruptionTimeRef = useRef<number>(0);
    const interrogationCooldown = 20000; // 20 seconds (up from 15s)
    const redFlags = ['no competitors', 'zero competition', 'everyone will buy', 'billion dollar', 'easy money', 'perfect product'];

    // Logic Guard State
    const lastLogicCheckTimeRef = useRef<number>(0);
    const logicCheckInterval = 12000; // 12 seconds (up from 5s)

    const fetchTTS = useCallback(async (text: string): Promise<ArrayBuffer | null> => {
        if (!text || text.trim().length === 0) {
            if (process.env.NODE_ENV === 'development') console.warn("[TTS] Skipped empty text request");
            return null;
        }
        if (process.env.NODE_ENV === 'development') console.log(`[TTS] Requesting speak for: "${text}"`);
        try {
            const key = deepgramKeyRef.current;
            if (!key) {
                console.warn("[TTS] Skipped: No Deepgram Key available (Session likely ended).");
                return null;
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

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`TTS Failed: ${response.status} ${errText}`);
            }

            const audioBuffer = await response.arrayBuffer();
            return audioBuffer;

        } catch (e) {
            console.error("[TTS] Critical Error:", e);
            return null;
        }
    }, []);

    // Helper for legacy single calls (if any)
    const speakText = useCallback(async (text: string) => {
        const buffer = await fetchTTS(text);
        if (buffer) onAudioDelta(buffer);
    }, [fetchTTS, onAudioDelta]);

    const handleUserMessage = useCallback(async (text: string, isInterruption = false, skipResponse = false) => {
        // FILTER: Ignore short noise/blips (less than 5 chars) unless it's a manual trigger
        if (text.trim().length < 5 && voiceMode !== 'manual') {
            console.log("Ignored short utterance (noise):", text);
            return;
        }

        // ALWAYS LOG, even if AI is busy
        addTranscriptItem('user', text);
        fullTranscriptRef.current.push({ role: 'user', content: text });

        // Sliding window for context as well
        if (fullTranscriptRef.current.length > 50) {
            fullTranscriptRef.current = fullTranscriptRef.current.slice(fullTranscriptRef.current.length - 50);
        }

        // Only prevent TRIGGERING a new response if busy
        if (isThinking || isSpeaking) return;

        // Manual Mode: NEVER auto-trigger response on silence
        if (voiceMode === 'manual' && !isInterruption) return;

        // Interview Mode: If skipping response (waiting for confirmation), stop here.
        if (skipResponse) return;

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

            // Count how many times AI has spoke (questions/comments)
            const interactionCount = fullTranscriptRef.current.filter(t => t.role === 'assistant').length;

            const aiResponseText = await generateVCResponse(fullTranscriptRef.current, deckContext, interactionCount, timeLeftRef.current);
            setIsThinking(false);

            if (!aiResponseText || aiResponseText.trim().length === 0) {
                console.warn("Empty AI response received, skipping transcript.");
                setIsThinking(false);
                setIsSpeaking(false);
                return;
            }

            addTranscriptItem('assistant', aiResponseText);
            fullTranscriptRef.current.push({ role: 'assistant', content: aiResponseText });

            setIsSpeaking(true);

            // SENTENCE-LEVEL STREAMING OPTIMIZATION
            // Split by sentence but keep punctuation. 
            // Regex matches sentence endings (. ? !) followed by space or end of string.
            const sentencer = aiResponseText.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [aiResponseText];

            if (process.env.NODE_ENV === 'development') {
                console.log(`[TTS] Streaming ${sentencer.length} sentences:`, sentencer);
            }

            // 1. Start all downloads in parallel
            // const audioPromises = sentencer.map(sentence => fetchTTS(sentence.trim()));

            // DISABLED INTERNAL TTS TO PREVENT DOUBLE AUDIO
            // We are using the high-level useTTS hook in PitchSessionPage again because
            // the ephemeral key here often lacks TTS permissions.
            /*
            // 2. Play them in order as they finish
            for (const promise of audioPromises) {
                // Check connectionRef directly to avoid closure staleness
                if (!connectionRef.current) { 
                    console.log("Session ended, aborting audio stream.");
                    break; 
                }
                
                try {
                    const buffer = await promise;
                    if (buffer) {
                         // Double check before playing
                        if (!connectionRef.current) break;
                        onAudioDelta(buffer);
                    }
                } catch (e) {
                    console.error("Skipped sentence TTS error", e);
                }
            }
            */

            setIsSpeaking(false);
        } catch (err) {
            console.error("AI Logic Error:", err);
            setIsThinking(false);
            setIsSpeaking(false);
        }
    }, [fetchTTS, onAudioDelta, deckContext, isConnected]); // Updated dependencies


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
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Deepgram API Error: ${res.status}`);
            }
            const { key } = await res.json();
            if (!key) throw new Error("No Deepgram key received from server.");
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

            connection.on(LiveTranscriptionEvents.Error, (err: any) => {
                console.error("Deepgram Error (Detailed):", {
                    message: err?.message || "Unknown Error",
                    type: err?.type,
                    code: err?.code,
                    raw: err
                });
                if (connectionRef.current === connection) {
                    setIsConnecting(false);
                    connectingRef.current = false;
                    setIsConnected(false);
                }
            });

            connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
                // DISABLED: UtteranceEnd might be triggering too early, causing fragmentation.
                // We will rely SOLELY on the debounce timer for now.
                /*
                if (transcriptBufferRef.current.trim().length > 0) {
                    if (process.env.NODE_ENV === 'development') console.log("UtteranceEnd: Flushing buffer");
                    handleUserMessage(transcriptBufferRef.current);
                    transcriptBufferRef.current = "";
                }
                if (disconnectTimeoutRef.current) {
                    clearTimeout(disconnectTimeoutRef.current);
                    disconnectTimeoutRef.current = null;
                }
                */
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

                /* 
                // DISABLED: Interim interruptions cause "chunking" issues where the AI replies to partial sentences.
                // We will rely purely on the final buffered transcript to ensure full context.

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
                */

                // BUFFERING LOGIC for Final Transcripts
                if (data.is_final && sentence.trim().length > 0) {

                    // NORMAL BUFFERING
                    transcriptBufferRef.current += " " + sentence;

                    // Clear existing debounce timer
                    if (disconnectTimeoutRef.current) {
                        clearTimeout(disconnectTimeoutRef.current);
                    }

                    // Set new debounce timer
                    disconnectTimeoutRef.current = setTimeout(() => {
                        if (transcriptBufferRef.current.trim().length > 0) {
                            // NORMAL MODES: Flush buffer and respond
                            if (process.env.NODE_ENV === 'development') console.log("Debounce: Flushing buffer");
                            handleUserMessage(transcriptBufferRef.current);
                            transcriptBufferRef.current = "";
                        }
                    }, voiceMode === 'patient' ? 2500 : 1200);
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
        setTranscriptItems(prev => {
            const newItem = {
                id: crypto.randomUUID(),
                role,
                text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            const newItems = [...prev, newItem];
            // Sliding window: keep only last 50 items to prevent memory leaks
            if (newItems.length > 50) {
                return newItems.slice(newItems.length - 50);
            }
            return newItems;
        });
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
