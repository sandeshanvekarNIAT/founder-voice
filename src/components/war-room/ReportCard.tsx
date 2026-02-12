"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ScoreProps {
    label: string;
    score: number;
    color: string;
    explanation?: string;
}

function ScoreMetric({ label, score, color, explanation }: ScoreProps) {
    return (
        <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-lg border border-white/10 h-full">
            <div className="flex justify-between items-end">
                <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">{label}</span>
                <span className="text-2xl font-bold font-mono">{score}%</span>
            </div>
            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden mb-1">
                <div
                    className={cn("h-full transition-all duration-1000", color)}
                    style={{ width: `${score}%` }}
                />
            </div>
            {explanation && (
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-white/5 pt-2 mt-auto">
                    {explanation}
                </p>
            )}
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
    explanations?: {
        market: string;
        tech: string;
        economics: string;
        readiness: string;
    };
    summary: string;
    key_risks: string[];
    coachability_delta: string;
}

export function ReportCard({ data }: { data: ReportData }) {
    if (!data) return null;

    const scores = data.scores || {
        market: 0,
        tech: 0,
        economics: 0,
        readiness: 0
    };

    const explanations = data.explanations || {
        market: "",
        tech: "",
        economics: "",
        readiness: ""
    };

    const risks = Array.isArray(data.key_risks) ? data.key_risks : [];
    const coachability = data.coachability_delta || "Unknown";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-500">

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
                <ScoreMetric label="Market Clarity" score={scores.market} color="bg-chart-1" explanation={explanations.market} />
                <ScoreMetric label="Tech Defensibility" score={scores.tech} color="bg-chart-2" explanation={explanations.tech} />
                <ScoreMetric label="Unit Economics" score={scores.economics} color="bg-chart-3" explanation={explanations.economics} />
                <ScoreMetric label="Investor Readiness" score={scores.readiness} color="bg-chart-4" explanation={explanations.readiness} />
            </div>

            {/* Analysis */}
            <div className="flex flex-col gap-4">
                <Card className="p-4 bg-white/5 border-white/10">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">VC Summary</h3>
                    <p className="text-sm leading-relaxed">{data.summary || "No summary available."}</p>
                </Card>

                <Card className="p-4 bg-white/5 border-white/10 flex-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-destructive mb-2">Key Risks</h3>
                    <ul className="space-y-2">
                        {risks.length > 0 ? risks.map((risk, i) => (
                            <li key={i} className="text-sm flex gap-2 items-start">
                                <span className="text-destructive font-mono">[{i + 1}]</span>
                                {risk}
                            </li>
                        )) : (
                            <li className="text-sm text-muted-foreground italic">No critical risks identified.</li>
                        )}
                    </ul>
                </Card>

                <div className="flex justify-between items-center p-4 bg-white/5 border-white/10 rounded-lg">
                    <span className="text-xs uppercase text-muted-foreground">Coachability Delta</span>
                    <span className={cn(
                        "font-bold font-mono",
                        coachability === 'High' ? 'text-green-500' :
                            coachability === 'Low' ? 'text-red-500' : 'text-yellow-500'
                    )}>
                        {coachability.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    );
}
