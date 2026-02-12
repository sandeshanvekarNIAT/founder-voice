
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
    // 1. Rate Limit
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
        const body = await req.json();
        const { interests, industry, time, budget, problem } = body;

        const systemPrompt = `
        You are a startup idea generator.
        User Input:
        - Interests: ${interests}
        - Industry: ${industry}
        - Time: ${time}
        - Budget: ${budget}
        - Problem they care about: ${problem}

        TASK:
        Generate a startup idea that fits these constraints.
        
        OUTPUT FORMAT (JSON ONLY):
        {
            "problem": "1 sentence description of claim.",
            "solution": "1 sentence solution.",
            "market": "Target audience definition.",
            "business_model": "How it makes money.",
            "why_now": "Why this is the right time."
        }
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt }],
            model: "gpt-4o-mini", // Fast & Cheap
            max_tokens: 300,
            response_format: { type: "json_object" },
        });

        const idea = JSON.parse(completion.choices[0].message.content || "{}");

        // Format for Deck Context
        const deckContext = `
        PROBLEM: ${idea.problem}
        SOLUTION: ${idea.solution}
        MARKET: ${idea.market}
        BUSINESS MODEL: ${idea.business_model}
        WHY NOW: ${idea.why_now}
        `;

        return NextResponse.json({ deckContext, idea });

    } catch (error: any) {
        console.error("Idea Gen Error Detailed:", error);
        return NextResponse.json({
            error: error.message || "Failed to generate idea",
            details: error.response?.data || "No additional details"
        }, { status: 500 });
    }
}
