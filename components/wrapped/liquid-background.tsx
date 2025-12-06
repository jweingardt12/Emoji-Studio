"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useIsMobile } from "@/hooks/use-mobile"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

export function LiquidBackground() {
    const isMobile = useIsMobile()
    const prefersReducedMotion = useReducedMotion()
    const shouldReduceAnimations = isMobile || prefersReducedMotion
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    // Colors for "lava lamp" blobs
    // Deep Background Layer (Slower, darker)
    const deepBlobs = [
        { color: "#4c1d95", size: "80vw", x: "-20%", y: "-30%", delay: 0, duration: 25 }, // Deep Purple
        { color: "#0c4a6e", size: "90vw", x: "40%", y: "40%", delay: 5, duration: 30 },   // Deep Blue
    ]

    // Near Layer (Faster, Brighter, Smaller)
    const nearBlobs = [
        { color: "#67e8f9", size: "50vw", x: "-10%", y: "20%", delay: 0, duration: 18 },  // Cyan
        { color: "#c084fc", size: "60vw", x: "60%", y: "-10%", delay: 2, duration: 22 },  // Purple
        { color: "#fb923c", size: "45vw", x: "30%", y: "60%", delay: 4, duration: 20 },   // Orange
    ]

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-black">

            {/* Deep Layer */}
            <div className="absolute inset-0 opacity-30 blur-[100px] sm:blur-[140px]">
                {deepBlobs.map((blob, i) => (
                    <motion.div
                        key={`deep-${i}`}
                        className="absolute rounded-full mix-blend-screen"
                        style={{
                            backgroundColor: blob.color,
                            width: blob.size,
                            height: blob.size,
                            left: blob.x,
                            top: blob.y,
                        }}
                        animate={
                            shouldReduceAnimations
                                ? {}
                                : {
                                    x: ["0%", "10%", "-10%", "0%"],
                                    y: ["0%", "10%", "-5%", "0%"],
                                    scale: [1, 1.05, 0.95, 1],
                                }
                        }
                        transition={{
                            duration: blob.duration,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: blob.delay,
                        }}
                    />
                ))}
            </div>

            {/* Near Layer */}
            <div className="absolute inset-0 opacity-50 blur-[60px] sm:blur-[90px]">
                {nearBlobs.map((blob, i) => (
                    <motion.div
                        key={`near-${i}`}
                        className="absolute rounded-full mix-blend-screen"
                        style={{
                            backgroundColor: blob.color,
                            width: blob.size,
                            height: blob.size,
                            left: blob.x,
                            top: blob.y,
                        }}
                        animate={
                            shouldReduceAnimations
                                ? {}
                                : {
                                    x: ["0%", "20%", "-20%", "0%"],
                                    y: ["0%", "20%", "-10%", "0%"],
                                    scale: [1, 1.1, 0.9, 1],
                                }
                        }
                        transition={{
                            duration: blob.duration,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: blob.delay,
                        }}
                    />
                ))}
            </div>

            {/* Caustics Overlay (Scales, light distortion) */}
            <div
                className="absolute inset-0 opacity-20 mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    filter: 'contrast(150%) brightness(150%)',
                }}
            />

            {/* Frosted Glass Top Layer - gives the "looking through ice" feel */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[30px] sm:backdrop-blur-[50px] mix-blend-overlay opacity-30" />

            {/* Noise Texture for realism */}
            <div className="wrapped-noise absolute inset-0 opacity-15" />

            {/* Heavy Vignette for focus */}
            <div className="absolute inset-0"
                style={{ background: 'radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.8) 120%)' }}
            />
        </div>
    )
}
