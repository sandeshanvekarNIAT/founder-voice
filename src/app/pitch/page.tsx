"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HotSeatTimer } from "@/components/war-room/HotSeatTimer";
import { LiveTranscript } from "@/components/war-room/LiveTranscript";
import { WaveformVisualizer } from "@/components/war-room/WaveformVisualizer";
import { ReportCard, ReportData } from "@/components/war-room/ReportCard";
import { useRealtime } from "@/hooks/use-realtime";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Mic, MicOff, Play, Square, Loader2, RotateCcw } from "lucide-react";

export default function PitchSessionPage() {
    const [sessionActive, setSessionActive] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const { addToQueue, clearQueue, isPlaying } = useAudioPlayer();

    const {
        connect,
        disconnect,
        isConnected,
        sendAudio,
        transcriptItems,
        clearTranscript,
        isSpeaking // AI Speaking status
    } = useRealtime({
        onAudioDelta: (delta) => addToQueue(delta),
        onInterruption: () => clearQueue()
    });

    const { startRecording, stopRecording, isRecording, stream } = useAudioRecorder((base64) => {
        if (isConnected) {
            sendAudio(base64);
        }
    });

    const handleStartSession = async () => {
        setReportData(null);
        await connect();
        setSessionActive(true);
        // Give a small delay before recording starts or wait for connection
    };

    const handleResetSession = async () => {
        // Stop Everything
        stopRecording();
        disconnect();
        clearQueue();
        clearTranscript();

        // Return to Start Screen
        setSessionActive(false);
        setReportData(null);
    };

    const handleEndSession = async () => {
        setSessionActive(false);
        disconnect();
        stopRecording();
        clearQueue();

        // Generate Report
        if (transcriptItems.length > 0) {
            setIsGeneratingReport(true);
            try {
                const res = await fetch('/api/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transcript: transcriptItems })
                });
                const data = await res.json();
                setReportData(data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsGeneratingReport(false);
            }
        }
    };

    // Auto-start recording when connected
    useEffect(() => {
        if (isConnected && !isRecording) {
            startRecording();
        }
    }, [isConnected, isRecording, startRecording]);

    return (
        <div className="min-h-screen bg-background text-foreground p-8 flex flex-col gap-6 font-sans">

            {/* Header / Status Bar */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">FOUNDER INTERROGATION PROTOCOL</h1>
                    <p className="text-muted-foreground text-sm font-mono">MODE: AGGRESSIVE_VC // LATENCY: LOW</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="font-mono text-sm">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
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
                                {isGeneratingReport ? (
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
                                            durationSeconds={180}
                                            isActive={sessionActive}
                                            onTimeEnd={handleEndSession}
                                        />

                                        <div className="flex gap-4">
                                            {!sessionActive ? (
                                                <Button onClick={handleStartSession} size="lg" className="bg-primary hover:bg-primary/90 text-white gap-2">
                                                    <Play className="w-4 h-4" /> START PITCH
                                                </Button>
                                            ) : (
                                                <div className="flex gap-4">
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
                                    mode={isSpeaking ? 'agent' : (isRecording ? 'user' : 'listening')}
                                    audioStream={stream}
                                />

                                {/* Status Overlay */}
                                <div className="absolute top-4 right-4 font-mono text-xs text-muted-foreground">
                                    {isSpeaking ? 'AI_SPEAKING' : (isRecording ? 'LISTENING...' : 'IDLE')}
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
        </div>
    );
}
