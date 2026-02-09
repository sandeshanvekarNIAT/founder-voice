"use client";

import { motion } from "framer-motion";
import { AlertTriangle, XCircle, HelpCircle } from "lucide-react";

export function ProblemSection() {
    return (
        <section className="py-24 bg-black relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

                    {/* Text Side */}
                    <div className="space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h2 className="text-3xl md:text-5xl mb-6 text-white font-[family-name:var(--font-inter-tight)] font-normal">
                                The Deafening Silence of <span className="text-red-500 font-bold">Rejection</span>
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed font-[family-name:var(--font-josefin)]">
                                You spend months building. Weeks designing the deck. You get the meeting. You pitch your heart out.
                                <br /><br />
                                And then? &quot;We&apos;ll get back to you.&quot;
                                <br /><br />
                                They never do. Or if they do, it&apos;s a generic &quot;You&apos;re too early.&quot;
                                You never learn <b>why</b> you failed. You can&apos;t fix what you can&apos;t see.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                { icon: AlertTriangle, title: "< 1% Acceptance", desc: "For top tier accelerators." },
                                { icon: HelpCircle, title: "Zero Feedback", desc: "Most VCs ghost you to avoid conflict." }
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                                    className="p-6 rounded-xl bg-white/5 border border-white/10"
                                >
                                    <item.icon className="w-8 h-8 text-red-500 mb-4" />
                                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                                    <p className="text-sm text-neutral-400 font-[family-name:var(--font-josefin)]">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Visual Side */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative h-[500px] bg-neutral-900 rounded-2xl border border-white/10 p-8 flex flex-col justify-center items-center overflow-hidden"
                    >
                        {/* Abstract "Graveyard" visual */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent opacity-50" />

                        <div className="space-y-4 w-full max-w-sm relative z-10">
                            {[1, 2, 3].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 100, opacity: 0 }}
                                    whileInView={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 + (i * 0.2), duration: 0.5 }}
                                    className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex items-center justify-between opacity-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-neutral-700" />
                                        <div className="h-2 w-24 bg-neutral-700 rounded" />
                                    </div>
                                    <XCircle className="w-5 h-5 text-neutral-600" />
                                </motion.div>
                            ))}

                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                whileInView={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 1.2, type: "spring" }}
                                className="bg-red-500/10 p-4 rounded-lg border border-red-500/50 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-500/20" />
                                    <div className="text-sm font-medium text-red-200">Where did I go wrong?</div>
                                </div>
                                <HelpCircle className="w-5 h-5 text-red-400" />
                            </motion.div>
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
