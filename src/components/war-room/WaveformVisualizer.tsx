"use client";

import { useEffect, useRef } from "react";

type VisualizerMode = "agent" | "user" | "listening" | "interrogated";

interface WaveformProps {
    mode: VisualizerMode;
    audioStream?: MediaStream | null; // For User mode
}

export function WaveformVisualizer({ mode, audioStream }: WaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    useEffect(() => {
        if (!audioStream || mode !== "user") return;

        const audioContext = new AudioContext(); // Or reuse one? Better to pass context if possible
        const source = audioContext.createMediaStreamSource(audioStream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);

        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        return () => {
            audioContext.close();
        };
    }, [audioStream, mode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let phase = 0;

        const draw = () => {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            // AI Speaking (Sine Wave)
            if (mode === "agent") {
                ctx.beginPath();
                ctx.lineWidth = 3;
                ctx.strokeStyle = "#5E6AD2"; // Electric Blue

                for (let x = 0; x < width; x++) {
                    const y = height / 2 + Math.sin(x * 0.05 + phase) * 20 * Math.sin(phase * 0.5);
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                phase += 0.2;
            }

            // User Speaking (Frequency Bars)
            else if (mode === "user" && analyserRef.current && dataArrayRef.current) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
                const barWidth = (width / dataArrayRef.current.length) * 2;
                let x = 0;

                ctx.fillStyle = "#F4F5F8"; // Mercury White

                for (let i = 0; i < dataArrayRef.current.length; i++) {
                    const barHeight = (dataArrayRef.current[i] / 255) * height;
                    ctx.fillRect(x, height / 2 - barHeight / 2, barWidth - 2, barHeight);
                    x += barWidth;
                }
            }

            // INTERROGATED (Red Flatline/Jitter)
            else if (mode === "interrogated") {
                ctx.beginPath();
                ctx.lineWidth = 4;
                ctx.strokeStyle = "#ef4444"; // Red 500
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ef4444";

                for (let x = 0; x < width; x++) {
                    // Jittery horizontal line
                    const jitter = (Math.random() - 0.5) * 4;
                    const y = height / 2 + jitter;
                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset
            }

            // Passive Listening (Subtle Pulse)
            else {
                ctx.beginPath();
                ctx.strokeStyle = "#1f2937"; // Muted
                ctx.moveTo(0, height / 2);
                ctx.lineTo(width, height / 2);
                ctx.stroke();
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [mode]);

    return (
        <canvas
            ref={canvasRef}
            width={600}
            height={150}
            className="w-full h-full rounded-lg bg-black/20 backdrop-blur-sm border border-white/5"
        />
    );
}
