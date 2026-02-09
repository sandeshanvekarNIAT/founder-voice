"use client";

import { motion } from "framer-motion";
import { Lock, Users, Unlock } from "lucide-react";

export function MissionSection() {
    return (
        <section className="py-24 bg-[#0A0A0A] relative border-t border-white/5">
            <div className="container mx-auto px-4 text-center max-w-4xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-16"
                >
                    <span className="text-primary font-mono text-sm tracking-widest uppercase mb-4 block">Our Mission</span>
                    <h2 className="text-3xl md:text-5xl text-white mb-6 font-[family-name:var(--font-inter-tight)] font-normal">
                        Merit Over Zip Code.
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed font-[family-name:var(--font-josefin)]">
                        The &quot;Warm Intro&quot; is a bug, not a feature. It excludes brilliant founders who didn&apos;t go to Stanford or don&apos;t live in SF.
                        <br />
                        We built Founder Voice to give <b>everyone</b> access to world-class feedback, 24/7.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Card 1 */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Lock className="w-24 h-24" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-left">The Old Way</h3>
                        <p className="text-sm text-neutral-400 text-left font-[family-name:var(--font-josefin)]">
                            Gatekeepers. &quot;Who do you know?&quot; &quot;Let me check my calendar for next month.&quot;
                        </p>
                    </motion.div>

                    {/* Card 2 */}
                    <div className="hidden md:flex items-center justify-center">
                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0A0A0A] p-2 border border-primary/30 rounded-full">
                                <Unlock className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="w-24 h-24 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold mb-3 text-left text-primary">The New Way</h3>
                        <p className="text-sm text-neutral-400 text-left font-[family-name:var(--font-josefin)]">
                            Permissionless. AI doesn't care who you know. It cares about your logic.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
