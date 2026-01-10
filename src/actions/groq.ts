"use server";

import Groq from "groq-sdk";
import { searchTavily } from "./tavily";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function generateVCResponse(transcript: { role: string; content: string }[]) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not set");
    }

    // System Prompt for the VC Persona
    const systemPrompt = `
You are 'Founder Voice', a ruthless, impatient Venture Capitalist.
Your goal is to stress-test the founder.
You interrupt frequently.
Be concise (max 1-2 sentences).
Be aggressive and data-driven.
If the founder makes a wild claim, call it out.

AVAILABLE TOOLS:
[SEARCH_COMPETITORS]: specific_query
(If you need to fact check competitors, output ONLY this token followed by the query)

Example:
Founder: "We have no competitors."
You: "[SEARCH_COMPETITORS]: AI video editing competitors"
`;

    // Flatten transcript for Llama 3
    const messages = [
        { role: "system", content: systemPrompt },
        ...transcript.map((t) => ({
            role: t.role === "assistant" ? "assistant" : "user",
            content: t.content,
        })),
    ];

    try {
        const completion = await groq.chat.completions.create({
            messages: messages as any,
            model: "llama-3.1-70b-versatile",
            temperature: 0.7,
            max_tokens: 150,
        });

        const responseText = completion.choices[0]?.message?.content || "";

        // Check for Tool Use
        if (responseText.includes("[SEARCH_COMPETITORS]:")) {
            const query = responseText.split("[SEARCH_COMPETITORS]:")[1].trim();
            console.log("VC requesting search:", query);

            // Perform the search (Server-side)
            const searchResult = await searchTavily(query);

            // Feed the search result back to Groq for a final comment
            const toolMessages = [
                ...messages,
                { role: "assistant", content: responseText },
                { role: "user", content: `Tool Output: ${searchResult}. Now respond to the founder based on this data.` }
            ];

            const toolCompletion = await groq.chat.completions.create({
                messages: toolMessages as any,
                model: "llama-3.1-70b-versatile",
                temperature: 0.7,
                max_tokens: 150,
            });

            return toolCompletion.choices[0]?.message?.content || "Interesting.";
        }

        return responseText;

    } catch (error) {
        console.error("Groq Error:", error);
        return "I'm listening. Go on."; // Fallback response
    }
}
