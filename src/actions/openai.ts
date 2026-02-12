"use server";

import OpenAI from "openai";
import { searchTavily } from "./tavily";
import { VC_SYSTEM_PROMPT, getDeckContextPrompt } from "@/lib/prompts";

// Initialize OpenAI client
// SECURITY: Using process.env.OPENAI_API_KEY
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Define type for transcript items
interface TranscriptItem {
    role: string;
    content: string;
}

export async function generateVCResponse(transcript: TranscriptItem[], deckContext: string | null = null, timeLeft: number = 180) {
    if (!process.env.OPENAI_API_KEY) {
        return "System Error: OpenAI API Key missing.";
    }

    // System Prompt for the VC Persona
    let systemPrompt = VC_SYSTEM_PROMPT;

    // ENFORCE CONCISENESS & GUIDELINES
    systemPrompt += `
    \n[IMPORTANT GUIDELINES]:
    1. Keep your questions short, punchy, and under 20 words.
    2. Test the founder's logic directly. Do not ramble.
    3. You are "Founder Voice", an aggressive AI VC.
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

    // Flatten transcript for OpenAI
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...transcript.map((t) => ({
            role: t.role === "assistant" ? "assistant" : "user",
            content: t.content,
        } as const)),
    ];

    try {
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "gpt-4o-mini", // Cost-effective, low latency
            temperature: 0.7,
            max_tokens: 150, // strict token limit
            tools: [
                {
                    type: "function",
                    function: {
                        name: "search_tavily",
                        description: "Search the web for competitors, market data, or verify claims.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: " The search query to verify the founder's claim.",
                                },
                            },
                            required: ["query"],
                        },
                    },
                },
            ],
            tool_choice: "auto",
        });

        const responseMessage = completion.choices[0].message;

        // Handle Tool Calls
        if (responseMessage.tool_calls) {
            const toolCall = responseMessage.tool_calls[0];
            if (toolCall.type === 'function' && toolCall.function.name === "search_tavily") {
                const args = JSON.parse(toolCall.function.arguments);
                console.log("VC requesting search:", args.query);

                // Perform the search (Server-side)
                let searchResult = "No results found.";
                try {
                    searchResult = await searchTavily(args.query);
                } catch (e) {
                    console.error("Search failed", e);
                }

                // Feed the search result back to OpenAI
                messages.push(responseMessage);
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: searchResult,
                });

                // Final response after tool result
                const secondResponse = await openai.chat.completions.create({
                    messages: messages,
                    model: "gpt-4o-mini",
                    max_tokens: 150,
                });

                return secondResponse.choices[0].message.content || "Interesting.";
            }
        }

        return responseMessage.content || "I'm listening.";

    } catch (error: any) {
        console.error("OpenAI Error:", error);

        if (error?.status === 429) {
            return "I need a moment to think. (Rate limit reached)";
        }

        if (error?.code === 'invalid_api_key') {
            return "Configuration Error: Invalid OpenAI API Key.";
        }

        return "I'm having trouble analyzing that.";
    }
}
