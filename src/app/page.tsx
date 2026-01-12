"use client";

import { Hero } from "@/components/landing/Hero";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { MissionSection } from "@/components/landing/MissionSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Ear, Brain, FileText, Zap, Shield, Globe } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white selection:bg-primary/30">
      {/* Hero Section */}
      <Hero />

      {/* Tech Stack Banner */}
      <div className="w-full border-y border-white/5 bg-white/[0.02] py-12 overflow-hidden">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-mono text-muted-foreground mb-8 uppercase tracking-[0.3em] font-medium opacity-60">
            Powered by State-of-the-Art Intelligence
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 font-[family-name:var(--font-josefin)]">
            {/* Simple Text Logos for specific tech */}
            <span className="text-xl font-bold flex items-center gap-2 tracking-tight"><Globe className="w-5 h-5 text-blue-500" /> Deepgram</span>
            <span className="text-xl font-bold flex items-center gap-2 tracking-tight"><Zap className="w-5 h-5 text-orange-500" /> Groq</span>
            <span className="text-xl font-bold flex items-center gap-2 tracking-tight"><Brain className="w-5 h-5 text-purple-500" /> Gemini 1.5</span>
            <span className="text-xl font-bold flex items-center gap-2 tracking-tight"><Shield className="w-5 h-5 text-green-500" /> Next.js 15</span>
          </div>
        </div>
      </div>


      <ProblemSection />
      <HowItWorks />
      <MissionSection />

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl mb-6 font-[family-name:var(--font-inter-tight)] font-normal">The War Room Stack</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto font-[family-name:var(--font-josefin)]">
              We've stitched together the fastest models to create a latency-free environment for pitch simulation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto [perspective:1000px]">
            <FeatureCard
              title="The Ear: Deepgram"
              description="Nova-2 Speech-to-Text model captures every stutter, pause, and confident assertion with 300ms latency."
              icon={Ear}
              color="#13EF93"
              delay={0}
            />
            <FeatureCard
              title="The Brain: Groq"
              description="Llama 3 70B running on LPUs provides instant, ruthlessly logical counter-arguments. It doesn't hallucinate; it interrogates."
              icon={Brain}
              color="#F55036"
              delay={0.2}
            />
            <FeatureCard
              title="The Judge: Gemini"
              description="Gemini 1.5 Flash analyzes the full transcript to generate a comprehensive 'Fundability Report Card' with actionable feedback."
              icon={FileText}
              color="#4E86F8"
              delay={0.4}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-black">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <span className="font-bold tracking-tight">FOUNDER VOICE</span>
          </div>
          <div className="text-sm text-muted-foreground font-mono">
            System Status: OPERATIONAL
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
