import type { Metadata } from "next";
import { Geist, Geist_Mono, Josefin_Sans, Inter_Tight } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { validateEnv } from "@/lib/env";

// Validate environment variables on startup
const missingEnvVars = validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: "400", // User requested Regular 400
});

export const metadata: Metadata = {
  title: "Founder Voice | AI Pitch Practice",
  description: "Practice your startup pitch with a ruthless AI Venture Capitalist. Real-time feedback, deal-breaker questions, and fundability scoring.",
  openGraph: {
    title: "Founder Voice | AI Pitch Practice",
    description: "Simulate a high-stakes VC meeting with our AI-powered investor persona.",
    type: "website",
    locale: "en_US",
    siteName: "Founder Voice",
  },
  twitter: {
    card: "summary_large_image",
    title: "Founder Voice | AI Pitch Practice",
    description: "Practice your startup pitch with a ruthless AI Venture Capitalist.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // If critical env vars are missing, render a helpful error screen instead of crashing
  if (missingEnvVars.length > 0) {
    return (
      <html lang="en">
        <body className="bg-neutral-950 text-white flex items-center justify-center h-screen p-8 font-sans">
          <div className="max-w-2xl bg-neutral-900 border border-red-800 rounded-xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Deployment Configuration Error</h1>
            <p className="text-neutral-300 mb-6 text-lg">
              The application started, but some required Environment Variables are missing.
            </p>

            <div className="bg-black/50 rounded-lg p-6 border border-neutral-800 mb-6">
              <h3 className="text-sm font-mono text-neutral-500 uppercase tracking-widest mb-3">Missing Variables</h3>
              <ul className="space-y-2">
                {missingEnvVars.map(key => (
                  <li key={key} className="font-mono text-red-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {key}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-sm text-neutral-400">
              <p className="mb-2"><strong>To Fix:</strong> Go to your Netlify Dashboard &rarr; Site Configuration &rarr; Environment Variables.</p>
              <p>Add the missing keys listed above, then <strong>Trigger a Redeploy</strong>.</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${josefin.variable} ${interTight.variable} antialiased font-sans`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
