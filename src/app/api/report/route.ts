import { NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60; // Allow long timeouts for o1-mini reasoning

export async function POST(req: Request) {
    try {
        const { transcript } = await req.json();

        if (!transcript || !Array.isArray(transcript)) {
            return NextResponse.json({ error: "Invalid transcript" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Format transcript for the prompt
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

OUTPUT FORMAT (JSON ONLY):
{
  "scores": {
    "market": number,
    "tech": number,
    "economics": number,
    "readiness": number
  },
  "summary": "2 sentence summary of the founder's performance.",
  "key_risks": ["risk 1", "risk 2"],
  "coachability_delta": "High/Medium/Low based on reaction to interruptions"
}
`;

        const response = await openai.chat.completions.create({
            model: "o1-mini",
            messages: [
                { role: "user", content: prompt }
            ]
        });

        const content = response.choices[0].message.content;

        // o1-mini might return markdown fencing around JSON
        const cleanJson = content?.replace(/```json/g, "").replace(/```/g, "").trim();
        const data = JSON.parse(cleanJson || "{}");

        return NextResponse.json(data);

    } catch (error) {
        console.error("Report Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 500 }
        );
    }
}
