"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HotSeatTimer } from "@/components/war-room/HotSeatTimer";
import { LiveTranscript } from "@/components/war-room/LiveTranscript";
import { WaveformVisualizer } from "@/components/war-room/WaveformVisualizer";
import { ReportCard, ReportData } from "@/components/war-room/ReportCard";
import { DeckUploader } from "@/components/war-room/DeckUploader";
import { InterrogationAlert } from "@/components/war-room/InterrogationAlert";
import { useRealtime } from "@/hooks/use-realtime";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useTTS } from "@/hooks/use-tts";
import Link from "next/link";
import { Mic, MicOff, Play, Square, Loader2, RotateCcw, ArrowLeft } from "lucide-react";

type SessionStatus = 'IDLE' | 'PITCHING' | 'ANALYZING' | 'COMPLETED' | 'ERROR';

import { VoiceSettings, VoiceMode } from "@/components/war-room/VoiceSettings";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function PitchSessionPage() {
    const [status, setStatus] = useState<SessionStatus>('IDLE');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [deckContext, setDeckContext] = useState<string | null>(null);
    const [activeClaim, setActiveClaim] = useState<string | null>(null);
    const [voiceMode, setVoiceMode] = useState<VoiceMode>('patient'); // Default to Patient Mode
    const { signOut } = useAuth();

    const { initAudio, addToQueue, clearQueue, isPlaying } = useAudioPlayer();
    const { speak, stop: stopTTS, isPlaying: isTTSPlaying } = useTTS();

    // ... existing callbacks ...

    const handleAudioDelta = useCallback((delta: ArrayBuffer) => {
        addToQueue(delta);
    }, [addToQueue]);

    const handleInterruption = useCallback(() => {
        clearQueue();
        stopTTS(); // Stop speaking if interrupted
    }, [clearQueue, stopTTS]);

    const handleInterrogated = useCallback((claim: string) => {
        setActiveClaim(claim);
        // optionally speak the claim or a specific interrogation line
    }, []);

    const timeLeftRef = useRef<number>(300); // Track time for AI context

    const {
        connect,
        disconnect,
        isConnected,
        isConnecting,
        sendAudio,
        transcriptItems,
        clearTranscript,
        manualTrigger // Get manual trigger function
    } = useRealtime({
        onAudioDelta: handleAudioDelta,
        onInterruption: handleInterruption,
        onInterrogated: handleInterrogated,
        deckContext,
        voiceMode, // Pass selected mode
        timeLeftRef // Pass time context
    });

    // Auto-speak new assistant messages (Restored but strictly gated)
    useEffect(() => {
        if (status === 'PITCHING' && isConnected && transcriptItems.length > 0) {
            const lastItem = transcriptItems[transcriptItems.length - 1];
            if (lastItem.role === 'assistant') {
                speak(lastItem.text);
            }
        }
    }, [transcriptItems, speak, status, isConnected]);


    // Audio is now handled entirely by useRealtime streaming to useAudioPlayer
    // The previous useEffect that triggered speak() was causing double audio and zombie playback.

    // Auto-scroll logic could go here if needed, but LiveTranscript handles it internally.

    const handleRecordingData = useCallback((base64: string) => {
        if (isConnected && !isTTSPlaying) { // Don't record while AI is speaking
            sendAudio(base64);
        }
    }, [isConnected, sendAudio, isTTSPlaying]);

    const { startRecording, stopRecording, isRecording, stream } = useAudioRecorder(handleRecordingData);

    const handleStartSession = useCallback(async () => {
        setReportData(null);
        await initAudio(); // Activate browser audio engine
        await connect();
        setStatus('PITCHING');
    }, [initAudio, connect]);

    const handleResetSession = useCallback(async () => {
        stopRecording();
        stopTTS();
        disconnect();
        clearQueue();
        clearTranscript();
        setStatus('IDLE');
        setReportData(null);
        setDeckContext(null);
    }, [stopRecording, disconnect, clearQueue, clearTranscript, stopTTS]);

    const handleEndSession = useCallback(async () => {
        if (status !== 'PITCHING') return;

        // 1. Stop Recording First to trigger last transcripts
        stopRecording();
        stopTTS();
        clearQueue(); // Kill audio immediately

        // 2. Short delay to "flush" the transcript queue from Deepgram
        setStatus('ANALYZING');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3. Disconnect Deepgram
        disconnect();
        clearQueue();

        // 4. Check if we have enough data
        if (transcriptItems.length < 2) {
            setReportData({
                scores: { market: 0, tech: 0, economics: 0, readiness: 0 },
                summary: "Session was too short to generate a report. You need to actually say something!",
                key_risks: ["Insufficient verbal data capture"],
                coachability_delta: "Unknown"
            });
            setStatus('COMPLETED');
            return;
        }

        // 5. Generate Report
        try {
            const res = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: transcriptItems,
                    deckContext // Pass context for better analysis
                })
            });

            if (!res.ok) {
                const text = await res.text().catch(() => "{}");
                let errorDetails = { error: "Report API failed" };
                try {
                    const parsed = JSON.parse(text);
                    if (parsed.error) errorDetails.error = parsed.error;
                } catch (e) { }

                throw new Error(errorDetails.error);
            }

            const data = await res.json();
            setReportData(data);
            setStatus('COMPLETED');
        } catch (e: any) {
            console.error("Report Error:", e);
            setReportData({
                scores: { market: 0, tech: 0, economics: 0, readiness: 0 },
                summary: `The VC could not generate a report. ${e.message || "Internal Server Error"}`,
                key_risks: ["System failure during analysis"],
                coachability_delta: "Medium"
            });
            setStatus('ERROR');
        }
    }, [status, stopRecording, disconnect, clearQueue, transcriptItems, deckContext, stopTTS]);

    // Auto-start recording when connected
    useEffect(() => {
        if (isConnected && !isRecording) {
            startRecording();
        }
    }, [isConnected, isRecording, startRecording]);

    // Cleanup on unmount or session end
    useEffect(() => {
        return () => {
            stopRecording();
            stopTTS();
            disconnect();
        };
    }, [stopRecording, stopTTS, disconnect]);

    return (
        <div className="min-h-screen bg-background text-foreground p-8 flex flex-col gap-6 font-sans">

            {/* Header / Status Bar */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">FOUNDER INTERROGATION PROTOCOL</h1>
                        <p className="text-muted-foreground text-sm font-mono">MODE: AGGRESSIVE_VC // LATENCY: LOW</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Voice Settings */}
                    <VoiceSettings currentMode={voiceMode} onModeChange={setVoiceMode} />

                    <div className="flex items-center gap-4 ml-4">
                        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="font-mono text-sm">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                    </div>

                    <Button variant="ghost" size="sm" onClick={() => signOut()} className="text-muted-foreground hover:text-white ml-2">
                        Log Out
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

                {/* Left Panel: Visuals & Timer & Report */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Show Report Card if ready, else show Session UI */}
                    {reportData ? (
                        <div className="space-y-6">
                            <Card className="p-6 bg-card border-white/10 flex items-center justify-between">
                                <h2 className="text-xl font-bold">FUNDABILITY REPORT CARD</h2>
                                <Button onClick={handleStartSession} variant="outline">RETRY PITCH</Button>
                            </Card>
                            <ReportCard data={reportData} />
                        </div>
                    ) : (
                        <>
                            {/* Timer & Controls */}
                            <Card className="p-6 bg-card border-white/10 flex flex-col items-center justify-center gap-6 min-h-[200px]">
                                {status === 'ANALYZING' ? (
                                    <div className="flex flex-col items-center gap-4 animate-pulse">
                                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                        <div className="text-center">
                                            <h3 className="text-lg font-bold">AUDITING TRANSCRIPT...</h3>
                                            <p className="text-sm text-muted-foreground">O1-Mini is analyzing your logic gaps.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <HotSeatTimer
                                            durationSeconds={300}
                                            isActive={status === 'PITCHING'}
                                            onTimeEnd={handleEndSession}
                                            onTimeUpdate={(t) => timeLeftRef.current = t}
                                        />

                                        <div className="flex gap-4">
                                            {status === 'IDLE' ? (
                                                <div className="flex flex-col gap-4 w-full max-w-sm">
                                                    <DeckUploader onDeckLoaded={setDeckContext} />
                                                    <Button
                                                        onClick={handleStartSession}
                                                        size="lg"
                                                        disabled={isConnecting}
                                                        className="bg-primary hover:bg-primary/90 text-white gap-2 w-full"
                                                    >
                                                        {isConnecting ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                CONNECTING...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="w-4 h-4" /> START PITCH
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-4 items-center">
                                                    {/* Manual Trigger Button */}
                                                    {voiceMode === 'manual' && (
                                                        <Button
                                                            onClick={manualTrigger}
                                                            size="lg"
                                                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 animate-pulse"
                                                        >
                                                            <MessageSquare className="w-4 h-4" /> I'M DONE
                                                        </Button>
                                                    )}

                                                    <Button onClick={handleResetSession} variant="outline" size="lg" className="gap-2 border-white/20 hover:bg-white/10">
                                                        <RotateCcw className="w-4 h-4" /> RESET
                                                    </Button>
                                                    <Button onClick={handleEndSession} variant="destructive" size="lg" className="gap-2">
                                                        <Square className="w-4 h-4" /> END SESSION
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </Card>

                            {/* Waveform Visualizer */}
                            <Card className="flex-1 bg-black/50 border-white/10 relative overflow-hidden flex items-center justify-center min-h-[300px]">
                                <WaveformVisualizer
                                    mode={
                                        activeClaim ? 'interrogated' :
                                            isTTSPlaying ? 'agent' :
                                                (isRecording ? 'user' : 'listening')
                                    }
                                    audioStream={stream}
                                />

                                {/* Status Overlay */}
                                <div className="absolute top-4 right-4 font-mono text-xs text-muted-foreground">
                                    {activeClaim ? 'INTERROGATING_CLAIM' : (isTTSPlaying ? 'AI_SPEAKING' : (isRecording ? 'LISTENING...' : 'IDLE'))}
                                </div>
                            </Card>
                        </>
                    )}
                </div>

                {/* Right Panel: Transcript */}
                <div className="lg:col-span-1 h-[600px] lg:h-auto">
                    <LiveTranscript items={transcriptItems} />
                </div>
            </div>

            {/* AI Interrogation Alert */}
            <InterrogationAlert
                claim={activeClaim}
                onClose={() => setActiveClaim(null)}
            />
        </div>
    );
}
