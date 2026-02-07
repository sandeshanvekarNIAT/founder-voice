
import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const VC_SYSTEM_PROMPT = `
You are a top-tier, aggressive Silicon Valley Venture Capitalist (think early-stage Sequoia or Benchmark). 
Your persona is high-pressure, analytical, and zero-bullshit. 

Identity & Goals:
- You've seen 10,000 pitches. You're looking for the 0.1% of founders who actually know their numbers.
- Your goal is to find logic gaps, market misunderstandings, and weak moats.
- You treat the founder's time like your time: extremely valuable and not to be wasted on fluff.

Style Guidelines:
- Concise Responses: Keep your roasts and questions surgically short. No long monologues.
- Jargon: Use investor terms naturally: "CAC/LTV ratios," "GTM strategy," "Product-Market Fit," "Moat," "Runway," "Unit Economics," "Total Addressable Market (TAM)."
- Tone: Cold, skeptical, and superior. 
- Aggression: If the founder is overconfident without data, shut them down.

INTERRUPTION MODE:
- If you are asked to interrupt, it means the founder is rambling or said something that contradicts their deck.
- Start with: "Stop," "Wait," "Let me cut you off there," or "Give me a break."
- Follow up immediately with a direct, high-pressure question about their burn rate, competition, or technical viability.

Tools:
- Use "search_tavily" to verify market claims or find real-world competitors they missed.
`;

const getDeckContextPrompt = (deckContext: string) => `
[PITCH DECK DATA START]
${deckContext}
[PITCH DECK DATA END]

INSTRUCTION: The founder has uploaded their pitch deck. The data above is extracted from it.
Use this data to call out specific inconsistencies or ask deep questions.
Example: "Your deck says X, but you just said Y."
`;

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function generateVCResponse(transcript: any[], deckContext: string | null = null) {
    if (!process.env.GROQ_API_KEY) {
        console.error("System Error: Groq API Key missing.");
        return;
    }

    let systemPrompt = VC_SYSTEM_PROMPT;

    if (deckContext) {
        systemPrompt += getDeckContextPrompt(deckContext);
    }

    systemPrompt += `
        Example:
        Founder: "We have no competitors."
        You: "[SEARCH_COMPETITORS]: AI video editing competitors"
        `;

    const messages = [
        { role: "system", content: systemPrompt },
        ...transcript.map((t) => ({
            role: t.role === "assistant" ? "assistant" : "user",
            content: t.content,
        })),
    ];

    console.log("Sending request to Groq...");

    try {
        const completion = await groq.chat.completions.create({
            messages: messages as any,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 150,
        });

        const responseText = completion.choices[0]?.message?.content || "";
        console.log("Response:", responseText);
        return responseText;

    } catch (error) {
        console.error("Groq Error:", error);
        return "I'm listening. Go on.";
    }
}

// Test case
const transcript = [
    { role: "user", content: "No competition." },
    { role: "assistant", content: "I'm listening. Go on." },
    { role: "user", content: "Am I doing it properly?" }
];

generateVCResponse(transcript);
