import type { Metadata } from "next";
import { Geist, Geist_Mono, Josefin_Sans, Inter_Tight } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { validateEnv } from "@/lib/env";

// Validate environment variables on startup
validateEnv();

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
