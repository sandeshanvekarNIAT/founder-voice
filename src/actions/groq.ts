"use server";

import { Groq } from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import { searchTavily } from "./tavily";
import { VC_SYSTEM_PROMPT, getDeckContextPrompt } from "@/lib/prompts";

// Groq client initialized lazily inside function


// Define type for transcript items
interface TranscriptItem {
    role: string;
    content: string;
}

export async function generateVCResponse(transcript: TranscriptItem[], deckContext: string | null = null, timeLeft: number = 180) {
    if (!process.env.GROQ_API_KEY) {
        return "System Error: Groq API Key missing.";
    }

    const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
    });

    // System Prompt for the VC Persona
    let systemPrompt = VC_SYSTEM_PROMPT;

    // ENFORCE CONCISENESS
    systemPrompt += `
    \n[IMPORTANT]: Keep your questions short, punchy, and under 20 words. Test the founder's logic directly. Do not ramble.
    `;

    if (deckContext) {
        systemPrompt += getDeckContextPrompt(deckContext);
    }

    // CLIMAX MODE LOGIC
    if (timeLeft < 30) {
        systemPrompt += `
        \n[CLIMAX MODE ACTIVATED]: There are only ${timeLeft} seconds left in the pitch.
        DO NOT ask new open-ended questions.
        Instead, either:
        1. Ask a final "deal-breaker" question.
        2. Deliver a final verdict or skepticism.
        3. Push them to wrap up.
        Make it dramatic and final.
        `;
    }

    systemPrompt += `
        Example:
        Founder: "We have no competitors."
        You: "[SEARCH_TAVILY]: AI video editing competitors"
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
            messages: messages as ChatCompletionMessageParam[],
            model: "llama-3.1-8b-instant",
            temperature: 0.7,
            max_tokens: 150,
        });

        const responseText = completion.choices[0]?.message?.content || "";

        // Improved Tool Use Extraction
        // Improved Tool Use Extraction
        // Match BOTH [SEARCH_COMPETITORS] and [SEARCH_TAVILY] to be safe
        const toolMatch = responseText.match(/\[(SEARCH_COMPETITORS|SEARCH_TAVILY|SEARCH)\]:\s*(.*)/i);

        if (toolMatch) {
            const query = toolMatch[2].trim();
            console.log("VC requesting search:", query);

            // Perform the search (Server-side)
            let searchResult = "No results found.";
            try {
                searchResult = await searchTavily(query);
            } catch (e) {
                console.error("Search failed", e);
            }

            // Feed the search result back to Groq for a final comment
            // CRITICAL: We do NOT return the original responseText (which contains the tool call)
            // We only return the FINAL completion based on the tool result.
            const toolMessages = [
                ...messages,
                { role: "assistant", content: responseText }, // We keep it in history so model knows it asked
                { role: "user", content: `[SYSTEM TOOL OUTPUT]: "${searchResult}". \n\nINSTRUCTION: Now respond to the founder based on this data. Do NOT repeat the search command. Be brief, critical, and punchy.` }
            ];

            const toolCompletion = await groq.chat.completions.create({
                messages: toolMessages as ChatCompletionMessageParam[],
                model: "llama-3.1-8b-instant",
                temperature: 0.7,
                max_tokens: 150,
            });

            return toolCompletion.choices[0]?.message?.content || "Interesting.";
        }

        // FAIL-SAFE: If model hallucinated a tool call but logic above missed it (unlikely with regex), 
        // or if it just added it to the end of a sentence.
        // We strip it out to prevent TTS reading it.
        const cleanedResponse = responseText.replace(/\[(SEARCH_COMPETITORS|SEARCH_TAVILY|SEARCH)\]:?.*/gi, "").trim();

        if (cleanedResponse.length === 0 && toolMatch) {
            // If cleaning resulted in empty string but we HAD a match (logic error?), return fallback.
            return "I'm checking on that.";
        }

        if (!cleanedResponse && !toolMatch) {
            return ""; // Return empty to silence the AI instead of "I'm listening"
        }

        return cleanedResponse || responseText;

    } catch (error: unknown) {
        console.error("Groq Error:", error);

        // Type guard for error object
        const err = error as { code?: string; message?: string };

        // Return specific error messages for better debugging
        if (err?.code === 'invalid_api_key') {
            return "Configuration Error: Invalid Groq API Key. Please check your .env.local file.";
        }

        return `Error: ${err.message || "I'm having trouble thinking right now."}`;
    }
}
