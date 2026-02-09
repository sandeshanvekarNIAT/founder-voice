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

    return missing;
}
