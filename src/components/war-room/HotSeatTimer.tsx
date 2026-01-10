"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TimerProps {
    durationSeconds: number; // e.g., 180
    isActive: boolean;
    onTimeEnd?: () => void;
}

export function HotSeatTimer({ durationSeconds, isActive, onTimeEnd }: TimerProps) {
    const [timeLeft, setTimeLeft] = useState(durationSeconds);

    useEffect(() => {
        if (!isActive || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onTimeEnd?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, timeLeft, onTimeEnd]);

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
