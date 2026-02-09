import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";

export const dynamic = "force-dynamic";

export async function GET() {
    if (!process.env.DEEPGRAM_API_KEY) {
        return NextResponse.json(
            { error: "DEEPGRAM_API_KEY is not set" },
            { status: 500 }
        );
    }

    try {
        const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

        let projectId = process.env.DEEPGRAM_PROJECT_ID;

        // Auto-resolve Project ID if missing
        if (!projectId) {
            const { result: projects, error: projectsError } = await deepgram.manage.getProjects();
            if (projectsError) {
                console.error("Deepgram Error: Could not list projects to find ID.", projectsError);
                return NextResponse.json(
                    { error: "DEEPGRAM_PROJECT_ID is missing and could not be auto-discovered. Please check your API Key permissions or set the variable manually." },
                    { status: 500 }
                );
            }
            if (projects?.projects?.[0]) {
                projectId = projects.projects[0].project_id;
            } else {
                return NextResponse.json(
                    { error: "No Deepgram Projects found for this API Key." },
                    { status: 404 }
                );
            }
        }

        if (!projectId) {
            return NextResponse.json(
                { error: "Could not determine Deepgram Project ID." },
                { status: 500 }
            );
        }

        // Create a temporary key that lasts for 10 seconds
        const { result, error } = await deepgram.manage.createProjectKey(
            projectId,
            {
                comment: "Ephemeral key for browser client",
                scopes: ["usage:write"],
                time_to_live_in_seconds: 10,
            }
        );

        if (error) {
            console.error("Deepgram Error: Could not create ephemeral key (Check API Permissions).", error);
            // Fallback: If we can't create a key, we must use the server one (less secure but functional).
            // WARN: The user should upgrade their key permissions to 'Admin' or 'Owner' for production security.
            return NextResponse.json({ key: process.env.DEEPGRAM_API_KEY });
        }

        return NextResponse.json({ key: result.key });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error("Deepgram Auth Error:", error);
        return NextResponse.json(
            { error: error?.message || "Failed to generate temporary key." },
            { status: 500 }
        );
    }
}
