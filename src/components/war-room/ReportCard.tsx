"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ScoreProps {
    label: string;
    score: number;
    color: string; // Tailwind class like 'bg-blue-500'
}

function ScoreMetric({ label, score, color }: ScoreProps) {
    return (
        <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex justify-between items-end">
                <span className="text-muted-foreground text-xs uppercase tracking-wider">{label}</span>
                <span className="text-2xl font-bold font-mono">{score}%</span>
            </div>
            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-1000", color)}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    );
}

export interface ReportData {
    scores: {
        market: number;
        tech: number;
        economics: number;
        readiness: number;
    };
    summary: string;
    key_risks: string[];
    coachability_delta: string;
}

export function ReportCard({ data }: { data: ReportData }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
                <ScoreMetric label="Market Clarity" score={data.scores.market} color="bg-chart-1" />
                <ScoreMetric label="Tech Defensibility" score={data.scores.tech} color="bg-chart-2" />
                <ScoreMetric label="Unit Economics" score={data.scores.economics} color="bg-chart-3" />
                <ScoreMetric label="Investor Readiness" score={data.scores.readiness} color="bg-chart-4" />
            </div>

            {/* Analysis */}
            <div className="flex flex-col gap-4">
                <Card className="p-4 bg-white/5 border-white/10">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">VC Summary</h3>
                    <p className="text-sm leading-relaxed">{data.summary}</p>
                </Card>

                <Card className="p-4 bg-white/5 border-white/10 flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-destructive mb-2">Key Risks</h3>
                    <ul className="space-y-2">
                        {data.key_risks.map((risk, i) => (
                            <li key={i} className="text-sm flex gap-2 items-start">
                                <span className="text-destructive font-mono">[{i + 1}]</span>
                                {risk}
                            </li>
                        ))}
                    </ul>
                </Card>

                <div className="flex justify-between items-center p-4 bg-white/5 border-white/10 rounded-lg">
                    <span className="text-xs uppercase text-muted-foreground">Coachability Delta</span>
                    <span className={cn(
                        "font-bold font-mono",
                        data.coachability_delta === 'High' ? 'text-green-500' :
                            data.coachability_delta === 'Low' ? 'text-red-500' : 'text-yellow-500'
                    )}>
                        {data.coachability_delta.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    );
}
