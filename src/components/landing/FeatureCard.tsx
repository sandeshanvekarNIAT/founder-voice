"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    color: string; // Hex or tailwind class for icon color
    delay?: number;
}

export function FeatureCard({ title, description, icon: Icon, color, delay = 0 }: FeatureCardProps) {
    const ref = useRef<HTMLDivElement>(null);


    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
            }}
            className="relative h-64 w-full rounded-xl bg-gradient-to-br from-white/5 to-white/0 p-[1px] cursor-pointer group"
        >
            {/* Inner Content with 3D depth */}
            <div
                style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }}
                className="absolute inset-0 h-full w-full rounded-xl bg-black/40 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-colors duration-500 group-hover:bg-black/60"
            >
                <div
                    style={{ transform: "translateZ(50px)" }}
                    className="p-4 rounded-full bg-white/5 border border-white/10 shadow-xl group-hover:border-white/20 transition-colors"
                >
                    <Icon className="w-8 h-8" style={{ color }} />
                </div>

                <h3
                    style={{ transform: "translateZ(25px)" }}
                    className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors"
                >
                    {title}
                </h3>

                <p
                    style={{ transform: "translateZ(10px)" }}
                    className="text-sm text-muted-foreground leading-relaxed font-[family-name:var(--font-josefin)]"
                >
                    {description}
                </p>
            </div>

            {/* Glowing Border Gradient */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
        </motion.div>
    );
}
