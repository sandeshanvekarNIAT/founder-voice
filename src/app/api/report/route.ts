
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

interface TranscriptItem {
    role: string;
    text: string;
}

interface ReportRequestBody {
    transcript: TranscriptItem[];
    deckContext?: string;
}

export async function POST(req: Request) {
    console.log(">>> REPORT API: START");

    // 1. Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    try {
        checkRateLimit(ip);
    } catch (e) {
        return NextResponse.json(
            { error: "Daily limit reached. Please try again later." },
            { status: 429 }
        );
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const body = await req.json().catch(e => {
            console.error(">>> REPORT API: JSON Parse Error", e);
            return null;
        }) as ReportRequestBody | null;

        if (!body || !body.transcript || !Array.isArray(body.transcript)) {
            console.warn(">>> REPORT API: INVALID TRANSCRIPT (Not an array or missing)");
            return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
        }

        const { transcript, deckContext } = body;
        console.log(`>>> REPORT API: TRANSCRIPT RECEIVED (${transcript.length} items)`);

        if (!process.env.OPENAI_API_KEY) {
            console.error(">>> REPORT API: OPENAI_API_KEY MISSING");
            return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });
        }

        // Format transcript
        const conversationText = transcript
            .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
            .join("\n");

        const prompt = `
You are a ruthless, data-driven Venture Capitalist. 
Analyze the following pitch transcript and generate a "Fundability Report Card".

${deckContext ? `PITCH DECK CONTEXT (Reference this for contradictions or missing info):
${deckContext}` : "No deck provided."}

SCORECARD CRITERIA:
1. Market Clarity (0-100): Clear TAM/SAM/SOM? Competitor awareness?
2. Tech Defensibility (0-100): Is it a wrapper or real IP?
3. Unit Economics (0-100): LTV/CAC logic, burn rate sustainability.
4. Investor Readiness (0-100): Communication style, handling interruptions.

TRANSCRIPT:
${conversationText}

TASK:
Judge the founder based on the transcript. If a deck was provided, highlight any contradictions between what they said and what the deck claims. 

OUTPUT FORMAT (JSON ONLY):
{
  "scores": {
    "market": 0,
    "tech": 0,
    "economics": 0,
    "readiness": 0
  },
  "explanations": {
    "market": "Reasoning + Improvement Tip",
    "tech": "Reasoning + Improvement Tip",
    "economics": "Reasoning + Improvement Tip",
    "readiness": "Reasoning + Improvement Tip"
  },
  "summary": "2 sentence summary.",
  "key_risks": ["risk 1", "risk 2"],
  "coachability_delta": "High/Medium/Low"
}
`;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o", // High intelligence model for report
            temperature: 0.2,
            max_tokens: 1000, // Explicit cost control
            response_format: { type: "json_object" }, // Guarantee JSON
        });

        const text = completion.choices[0]?.message?.content || "";
        console.log(`>>> REPORT API: OPENAI RESPONSE RECEIVED (${text.length} chars)`);

        try {
            const data = JSON.parse(text);
            console.log(">>> REPORT API: JSON PARSE SUCCESSFUL");

            // Validate Schema
            const validatedData = {
                scores: {
                    market: Number(data.scores?.market) || 0,
                    tech: Number(data.scores?.tech) || 0,
                    economics: Number(data.scores?.economics) || 0,
                    readiness: Number(data.scores?.readiness) || 0,
                },
                explanations: {
                    market: String(data.explanations?.market || "No feedback provided."),
                    tech: String(data.explanations?.tech || "No feedback provided."),
                    economics: String(data.explanations?.economics || "No feedback provided."),
                    readiness: String(data.explanations?.readiness || "No feedback provided."),
                },
                summary: String(data.summary || "Summary generation failed."),
                key_risks: Array.isArray(data.key_risks) ? data.key_risks : [],
                coachability_delta: String(data.coachability_delta || "Medium")
            };

            return NextResponse.json(validatedData);
        } catch (e: any) {
            console.error(`>>> REPORT API: JSON PARSE ERROR: ${e.message}`);
            return NextResponse.json({
                scores: { market: 0, tech: 0, economics: 0, readiness: 0 },
                summary: "The VC was unable to generate a coherent report.",
                key_risks: ["Insufficient data for analysis"],
                coachability_delta: "Medium"
            });
        }

    } catch (error: any) {
        console.error(`>>> REPORT API: CRITICAL ERROR - ${error.message}`);
        return NextResponse.json(
            { error: "Failed to generate report", details: error.message },
            { status: 500 }
        );
    }
}
