"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Mic, ArrowRight, Play } from "lucide-react";
import Link from "next/link";

export function Hero() {
    return (
        <div className="relative min-h-[80vh] flex flex-col items-center justify-center overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[120px] rounded-full opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-500/10 blur-[100px] rounded-full opacity-30 pointer-events-none" />

            {/* Text Content */}
            <div className="text-center z-10 max-w-4xl px-4 flex flex-col items-center pt-10 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8"
                >
                    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-mono text-muted-foreground uppercase tracking-widest font-[family-name:var(--font-josefin)]">
                        Founder Voice 1.0 // Latency: Low
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-5xl md:text-7xl mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 font-[family-name:var(--font-inter-tight)] font-normal tracking-tight"
                >
                    Pitch. Get Roasted. <br className="hidden md:block" /> Get Funded.
                </motion.h1>

                {/* Central 3D Core Animation */}
                <div className="relative w-64 h-64 my-16 mx-auto flex items-center justify-center">
                    {/* Outer Rotating Ring */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border border-dashed border-white/10"
                    />

                    {/* Middle Counter-Rotating Ring */}
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-6 rounded-full border-[0.5px] border-white/5 border-t-white/20 border-r-white/20"
                    />

                    {/* Inner Pulsing Rings */}
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-16 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
                    />

                    {/* Glowing Gradient Orb */}
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-20 bg-gradient-to-tr from-primary/40 to-blue-600/40 rounded-full blur-3xl"
                    />

                    {/* Core Element */}
                    <div className="relative z-10 w-24 h-24 rounded-full bg-black/80 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <motion.div
                            animate={{ height: ["20%", "50%", "20%"] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute bg-gradient-to-t from-transparent via-white/10 to-transparent w-full h-[50%]"
                        />
                        <Mic className="w-10 h-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    </div>
                </div>


                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-[family-name:var(--font-josefin)]"
                >
                    Simulate a high-stakes VC meeting with a ruthlessly logical AI.
                    Test your pitch against the <span className="text-white font-medium">Llama 3 70B</span> brain
                    and get a real-time fundability report card.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link href="/pitch">
                        <Button size="lg" className="h-12 px-8 bg-white text-black hover:bg-white/90 font-medium text-base rounded-full">
                            Enter War Room <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </Link>
                    <Button variant="outline" size="lg" className="h-12 px-8 rounded-full border-white/10 hover:bg-white/5 gap-2">
                        <Play className="w-4 h-4" /> Watch Demo
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
