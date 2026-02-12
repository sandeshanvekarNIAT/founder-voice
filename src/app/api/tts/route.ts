import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // Optional: Use Edge runtime for lower latency

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const apiKey = process.env.DEEPGRAM_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ error: "Deepgram API Key missing" }, { status: 500 });
        }

        // Deepgram Aura API Endpoint (Orion = Deep Male Voice)
        const url = `https://api.deepgram.com/v1/speak?model=aura-orion-en&encoding=mp3`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Token ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Deepgram TTS failed: ${response.status} ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.byteLength.toString(),
            },
        });

    } catch (e: any) {
        console.error("TTS API Error:", e);
        return NextResponse.json({ error: e.message || "TTS generation failed" }, { status: 500 });
    }
}
