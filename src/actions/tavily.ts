"use server";

export async function searchTavily(query: string) {
    if (!process.env.TAVILY_API_KEY) {
        console.error("Missing Tavily API Key");
        return JSON.stringify({ error: "Search unavailable" });
    }

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: query,
                search_depth: "basic", // "advanced" is slower, we need speed
                include_answer: true,
                max_results: 3,
            }),
        });

        const data = await response.json();
        return JSON.stringify(data);
    } catch (error) {
        console.error("Tavily Search Error:", error);
        return JSON.stringify({ error: "Failed to search" });
    }
}
