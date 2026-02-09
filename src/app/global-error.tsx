"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <html>
            <body className="flex min-h-screen flex-col items-center justify-center bg-black text-white font-sans">
                <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong!</h2>
                <p className="mb-6 text-gray-400">A critical error occurred in the application.</p>
                <button
                    className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-gray-200 transition-colors"
                    onClick={() => reset()}
                >
                    Try again
                </button>
            </body>
        </html>
    );
}
