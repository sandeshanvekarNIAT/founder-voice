"use client";

import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface TimerProps {
    durationSeconds: number; // e.g., 180
    isActive: boolean;
    onTimeEnd?: () => void;
}

export function HotSeatTimer({ durationSeconds, isActive, onTimeEnd }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState(durationSeconds);

    const onTimeEndRef = useRef(onTimeEnd);

    // Keep the ref updated with the latest callback
    useEffect(() => {
        onTimeEndRef.current = onTimeEnd;
    }, [onTimeEnd]);

    useEffect(() => {
        if (!isActive) {
            setTimeLeft(durationSeconds);
        }
    }, [isActive, durationSeconds]);

    // Effect for the countdown
    useEffect(() => {
        if (!isActive || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    // Dedicated effect to trigger completion - fixes "update while rendering" error
    useEffect(() => {
        if (timeLeft === 0 && isActive) {
            onTimeEndRef.current?.();
        }
    }, [timeLeft, isActive]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isCritical = timeLeft < 30;

    return (
        <div className={cn(
            "font-mono text-6xl tracking-tighter tabular-nums",
            isCritical ? "text-destructive animate-pulse" : "text-foreground"
        )}>
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
    );
}
