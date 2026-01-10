import { useCallback, useEffect, useRef, useState } from 'react';
import { TranscriptItem } from '@/components/war-room/LiveTranscript';
import { searchTavily } from '@/actions/tavily';

// Types for Realtime API Events
type SessionUpdateEvent = {
    type: 'session.updated';
    session: any;
};

interface UseRealtimeProps {
    onAudioDelta: (base64: string) => void;
    onInterruption: () => void;
}

export const useRealtime = ({ onAudioDelta, onInterruption }: UseRealtimeProps) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isThinking, setIsThinking] = useState(false); // AI is processing
    const [isSpeaking, setIsSpeaking] = useState(false); // AI is generating audio
    const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);

    const socketRef = useRef<WebSocket | null>(null);

    const connect = useCallback(async () => {
        try {
            // 1. Get Ephemeral Token
            const tokenRes = await fetch('/api/session', { method: 'POST' });
            if (!tokenRes.ok) throw new Error('Failed to get token');
            const data = await tokenRes.json();
            const ephemeralKey = data.client_secret.value;

            // 2. Connect to WebSocket
            const ws = new WebSocket(
                'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
                ['realtime', `openai-insecure-api-key.${ephemeralKey}`, 'openai-beta.realtime-v1']
            );

            ws.onopen = () => {
                console.log('Connected to OpenAI Realtime API');
                setIsConnected(true);
                // Configure Session with Tools
                ws.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        modalities: ['text', 'audio'],
                        voice: 'verse',
                        instructions: "You are 'Founder Voice', a ruthless Venture Capitalist. Your goal is to stress-test the founder. You interrupt frequently. If they claim they have no competitors, use the 'search_competitors' tool to find the truth and call them out. Be concise, aggressive, and data-driven.",
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.5,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 500
                        },
                        tools: [
                            {
                                type: "function",
                                name: "search_competitors",
                                description: "Search for competitors or market data to fact-check the founder.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        query: {
                                            type: "string",
                                            description: "Search query, e.g. 'AI video editor competitors'"
                                        }
                                    },
                                    required: ["query"]
                                }
                            }
                        ],
                        tool_choice: "auto",
                    }
                }));
            };

            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);
                await handleServerEvent(message, ws);
            };

            ws.onclose = () => {
                console.log('Disconnected');
                setIsConnected(false);
                socketRef.current = null;
            };

            socketRef.current = ws;

        } catch (error) {
            console.error('Connection failed:', error);
        }
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    }, []);

    const sendAudio = useCallback((base64Audio: string) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64Audio
            }));
        }
    }, []);

    const handleServerEvent = async (event: any, ws: WebSocket) => {
        switch (event.type) {
            case 'response.created':
                setIsThinking(true);
                break;
            case 'response.audio.delta':
                setIsSpeaking(true);
                onAudioDelta(event.delta);
                break;
            case 'response.audio_transcript.done':
                addTranscriptItem('assistant', event.transcript);
                break;
            case 'conversation.item.input_audio_transcription.completed':
                addTranscriptItem('user', event.transcript);
                break;

            // --- Tool Handling ---
            case 'response.function_call_arguments.done':
                const callId = event.call_id;
                const name = event.name;
                const args = JSON.parse(event.arguments);

                if (name === 'search_competitors') {
                    console.log(`Calling tool ${name} with`, args);
                    const result = await searchTavily(args.query);

                    // Send output back
                    ws.send(JSON.stringify({
                        type: 'conversation.item.create',
                        item: {
                            type: 'function_call_output',
                            call_id: callId,
                            output: result
                        }
                    }));

                    // Trigger AI to respond to the tool output
                    ws.send(JSON.stringify({
                        type: 'response.create'
                    }));
                }
                break;

            case 'response.done':
                setIsThinking(false);
                setIsSpeaking(false);
                break;

            case 'input_audio_buffer.speech_started':
                console.log('Interruption detected!');
                onInterruption();
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'response.cancel' }));
                }
                break;
            default:
                break;
        }
    };

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

    return {
        isConnected,
        isThinking,
        isSpeaking,
        connect,
        disconnect,
        sendAudio,
        transcriptItems
    };
};
