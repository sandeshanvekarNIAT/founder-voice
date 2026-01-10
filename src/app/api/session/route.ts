import { NextResponse } from "next/server";

export async function POST() {
    try {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set");
        }

        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-12-17", // Latest model
                voice: "verse", // "verse" is assertive/professional
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI API Error:", errorText);
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();

        // Return the ephemeral token to the client
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error generating session:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
