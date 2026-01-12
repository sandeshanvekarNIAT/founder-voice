"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

interface InterrogationAlertProps {
    claim: string | null;
    onClose: () => void;
}

export function InterrogationAlert({ claim, onClose }: InterrogationAlertProps) {
    useEffect(() => {
        if (claim) {
            const timer = setTimeout(onClose, 6000);
            return () => clearTimeout(timer);
        }
    }, [claim, onClose]);

    return (
        <AnimatePresence>
            {claim && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
                >
                    <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl p-4 rounded-2xl shadow-[0_0_30px_rgba(239,68,68,0.2)] flex items-start gap-4 ring-1 ring-red-500/20">
                        <div className="bg-red-500 p-2 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-red-500 font-bold text-sm uppercase tracking-wider mb-1">
                                INTERROGATION TRIGGERED
                            </h4>
                            <p className="text-white font-medium leading-tight">
                                Targeted Claim: <span className="text-red-300">"{claim}"</span>
                            </p>
                            <p className="text-white/60 text-xs mt-2 font-mono">
                                VC is cutting in to roast this inconsistency.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
