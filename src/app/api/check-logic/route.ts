import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { LOGIC_GUARD_PROMPT } from "@/lib/prompts";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { transcript, deckContext } = await req.json();

        if (!transcript || !deckContext) {
            return NextResponse.json({ shouldInterrupt: false, reason: "Missing context" });
        }

        const prompt = LOGIC_GUARD_PROMPT
            .replace("{{DECK_CONTEXT}}", deckContext)
            .replace("{{TRANSCRIPT}}", transcript);

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: "llama-3.3-70b-versatile", // Use a fast but capable model
            response_format: { type: "json_object" },
            temperature: 0,
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        return NextResponse.json(result);

    } catch (e) {
        console.error("Logic Guard API Error:", e);
        return NextResponse.json({ shouldInterrupt: false, reason: "Error in check" });
    }
}
