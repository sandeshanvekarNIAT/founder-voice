"use client";

import { useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";

export interface TranscriptItem {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: string;
}

interface TranscriptProps {
    items: TranscriptItem[];
}

function LiveTranscriptComponent({ items }: TranscriptProps) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [items]);

    return (
        <div className="flex flex-col h-full w-full bg-black/40 border border-white/10 rounded-lg overflow-hidden font-mono text-sm">
            <div className="flex items-center px-4 py-2 border-b border-white/10 bg-white/5">
                <span className="text-muted-foreground uppercase tracking-widest text-xs">Session Log</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {items.length === 0 && (
                    <div className="text-muted-foreground italic text-center opacity-50 mt-10">
                        Connection established. Waiting for audio input...
                    </div>
                )}

                {items.filter(i => i.text && i.text.trim().length > 0).map((item) => (
                    <div key={item.id} className={cn(
                        "flex flex-col space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        item.role === "assistant" ? "items-start" : "items-end"
                    )}>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>[{item.timestamp}]</span>
                            <span className="uppercase">{item.role === 'assistant' ? 'AI_VC' : 'FOUNDER'}</span>
                        </div>

                        <div className={cn(
                            "max-w-[80%] rounded px-3 py-2",
                            item.role === "assistant"
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-white/10 text-foreground"
                        )}>
                            {item.text}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>
        </div>
    );
}

export const LiveTranscript = memo(LiveTranscriptComponent);
