import { NextResponse } from "next/server";
import Groq from "groq-sdk";

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
    try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY?.trim() });

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

        if (!process.env.GROQ_API_KEY) {
            console.error(">>> REPORT API: GROQ_API_KEY MISSING");
            return NextResponse.json({ error: "GROQ_API_KEY missing" }, { status: 500 });
        }
        console.log(">>> REPORT API: GROQ_API_KEY FOUND");

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

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN, NO EXPLANATION BEFORE OR AFTER):
{
  "scores": {
    "market": 0,
    "tech": 0,
    "economics": 0,
    "readiness": 0
  },
  "summary": "2 sentence summary.",
  "key_risks": ["risk 1", "risk 2"],
  "coachability_delta": "High/Medium/Low"
}
`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1, // Low temp for more consistent JSON
        });

        const text = completion.choices[0]?.message?.content || "";
        console.log(`>>> REPORT API: GROQ RESPONSE RECEIVED (${text.length} chars)`);

        // Clean up markdown if LLM adds it
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const data = JSON.parse(cleanJson);
            console.log(">>> REPORT API: JSON PARSE SUCCESSFUL");

            // Validate Schema
            const validatedData = {
                scores: {
                    market: Number(data.scores?.market) || 0,
                    tech: Number(data.scores?.tech) || 0,
                    economics: Number(data.scores?.economics) || 0,
                    readiness: Number(data.scores?.readiness) || 0,
                },
                summary: String(data.summary || "Summary generation failed."),
                key_risks: Array.isArray(data.key_risks) ? data.key_risks : [],
                coachability_delta: String(data.coachability_delta || "Medium")
            };

            return NextResponse.json(validatedData);
        } catch (e: any) {
            console.error(`>>> REPORT API: JSON PARSE ERROR: ${e.message}`);
            console.error(`>>> REPORT API: RAW LLM OUTPUT: ${text}`);
            // Return a "Graceful Failure" report instead of 500
            return NextResponse.json({
                scores: { market: 0, tech: 0, economics: 0, readiness: 0 },
                summary: "The VC was unable to generate a coherent report. You likely didn't provide enough data.",
                key_risks: ["Insufficient data for analysis"],
                coachability_delta: "Medium"
            });
        }

    } catch (error: unknown) {
        const err = error as Error;
        console.error(`>>> REPORT API: CRITICAL ERROR - ${err.message}`);
        if (err.stack) console.error(err.stack);

        return NextResponse.json(
            {
                error: "Failed to generate report",
                details: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
            },
            { status: 500 }
        );
    }
}
