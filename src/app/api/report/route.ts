import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { transcript } = await req.json();

        if (!transcript || !Array.isArray(transcript)) {
            return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "GOOGLE_API_KEY missing" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Format transcript
        const conversationText = transcript
            .map((t: any) => `${t.role.toUpperCase()}: ${t.text}`)
            .join("\n");

        const prompt = `
You are a ruthless, data-driven Venture Capitalist. 
Analyze the following pitch transcript and generate a "Fundability Report Card".

SCORECARD CRITERIA:
1. Market Clarity (0-100): Clear TAM/SAM/SOM? Competitor awareness?
2. Tech Defensibility (0-100): Is it a wrapper or real IP?
3. Unit Economics (0-100): LTV/CAC logic, burn rate sustainability.
4. Investor Readiness (0-100): Communication style, handling interruptions.

TRANSCRIPT:
${conversationText}

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):
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

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Clean up markdown if Gemini adds it
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            const data = JSON.parse(cleanJson);
            return NextResponse.json(data);
        } catch (e) {
            console.error("JSON Parse Error:", text);
            return NextResponse.json({ error: "Failed to parse report" }, { status: 500 });
        }

    } catch (error) {
        console.error("Report Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 500 }
        );
    }
}
