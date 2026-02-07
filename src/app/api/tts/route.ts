import { NextRequest, NextResponse } from "next/server";
import { ttsService } from "@/lib/tts-service";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        // Use the persistent service
        const audioBuffer = await ttsService.generate(text);

        return new NextResponse(audioBuffer as any, {
            status: 200,
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
            },
        });

    } catch (e: any) {
        console.error("TTS API Error:", e);
        return NextResponse.json({ error: e.message || "TTS generation failed" }, { status: 500 });
    }
}
