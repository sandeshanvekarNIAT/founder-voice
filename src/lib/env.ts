const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "DEEPGRAM_API_KEY",
    "GROQ_API_KEY"
];

export function validateEnv() {
    const missing = requiredEnvVars.filter(
        (key) => !process.env[key]
    );

    if (missing.length > 0) {
        throw new Error(
            `❌ Invalid Environment Variables: Missing ${missing.join(
                ", "
            )}. Please check your .env.local file.`
        );
    }
}
