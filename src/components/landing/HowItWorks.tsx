"use client";

import { motion } from "framer-motion";
import { Mic, Zap, FileText } from "lucide-react";

const steps = [
    {
        icon: Mic,
        title: "Pitch Live",
        desc: "Speak naturally. Our AI listens to your voice, pacing, and tone.",
        color: "text-green-400"
    },
    {
        icon: Zap,
        title: "Get Grilled",
        desc: "The VC interrupts you with hard questions. Think on your feet.",
        color: "text-red-400"
    },
    {
        icon: FileText,
        title: "See the Score",
        desc: "Receive a detailed report card. Fix the gaps. Try again.",
        color: "text-blue-400"
    }
];

export function HowItWorks() {
    return (
        <section className="py-24 bg-black relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl mb-6 text-white font-[family-name:var(--font-inter-tight)] font-normal">The Feedback Loop</h2>
                    <p className="text-muted-foreground font-[family-name:var(--font-josefin)]">Fail fast in the simulator so you can win in the boardroom.</p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-10 right-10 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10" />

                    {steps.map((step, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -5, borderColor: "rgba(255,255,255,0.2)" }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="w-full max-w-sm flex flex-col items-center text-center bg-neutral-900/50 backdrop-blur border border-white/5 p-8 rounded-2xl transition-colors duration-300 hover:bg-white/5"
                        >
                            <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className={`w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-6 border border-white/10 shadow-lg ${step.color}`}
                            >
                                <step.icon className="w-8 h-8" />
                            </motion.div>
                            <h3 className="text-xl font-bold mb-3 text-white">{step.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed font-[family-name:var(--font-josefin)]">{step.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
