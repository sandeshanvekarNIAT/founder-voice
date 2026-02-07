"use server";

import Groq from "groq-sdk";
import { searchTavily } from "./tavily";
import { VC_SYSTEM_PROMPT, getDeckContextPrompt } from "@/lib/prompts";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Define type for transcript items
interface TranscriptItem {
    role: string;
    content: string;
}

export async function generateVCResponse(transcript: TranscriptItem[], deckContext: string | null = null, interactionCount: number = 0) {
    if (!process.env.GROQ_API_KEY) {
        return "System Error: Groq API Key missing.";
    }

    // System Prompt for the VC Persona
    let systemPrompt = VC_SYSTEM_PROMPT;

    if (deckContext) {
        systemPrompt += getDeckContextPrompt(deckContext);
    }

    // Dynamic Instruction based on interaction count
    if (interactionCount >= 2) {
        systemPrompt += `
        \n[CRITICAL INSTRUCTION]: You have already asked ${interactionCount} questions. 
        DO NOT request any more information or ask any more questions. 
        Simply acknowledge the founder ("I see", "Go on", "Understood") or agree/disagree briefly. 
        Let them finish their pitch.
        `;
    }

    systemPrompt += `
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
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 150,
        });

        const responseText = completion.choices[0]?.message?.content || "";

        // Improved Tool Use Extraction
        const toolMatch = responseText.match(/\[SEARCH_COMPETITORS\]:\s*(.*)/);
        if (toolMatch) {
            const query = toolMatch[1].trim();
            console.log("VC requesting search:", query);

            // Perform the search (Server-side)
            const searchResult = await searchTavily(query);

            // Feed the search result back to Groq for a final comment
            const toolMessages = [
                ...messages,
                { role: "assistant", content: responseText },
                { role: "user", content: `Tool Output: ${searchResult}. Now respond to the founder based on this data. Be brief and punchy.` }
            ];

            const toolCompletion = await groq.chat.completions.create({
                messages: toolMessages as any,
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 150,
            });

            return toolCompletion.choices[0]?.message?.content || "Interesting.";
        }

        return responseText;

    } catch (error: any) {
        console.error("Groq Error:", error);

        // Return specific error messages for better debugging
        if (error?.code === 'invalid_api_key') {
            return "Configuration Error: Invalid Groq API Key. Please check your .env.local file.";
        }

        return `Error: ${error.message || "I'm having trouble thinking right now."}`;
    }
}
