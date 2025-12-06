"use client"

import { useMemo, useEffect, useState } from "react"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface FloatingEmojisBackgroundProps {
    emojis: Emoji[]
    count?: number
    opacity?: number
}

interface FloatingEmoji {
    id: string
    url: string
    x: number // percentage
    y: number // percentage
    size: number
    duration: number
    delay: number
    rotation: number
}

export function FloatingEmojisBackground({
    emojis,
    count = 20,
    opacity = 0.15
}: FloatingEmojisBackgroundProps) {
    const isMobile = useIsMobile()
    const [mounted, setMounted] = useState(false)

    // Adjust count for mobile to maintain performance
    const displayCount = isMobile ? Math.min(count, 12) : count

    useEffect(() => {
        setMounted(true)
    }, [])

    const floatingEmojis = useMemo(() => {
        if (emojis.length === 0) return []

        // Create deterministic but random-looking distribution
        const items: FloatingEmoji[] = []

        for (let i = 0; i < displayCount; i++) {
            // Pick a random emoji from the list
            const emoji = emojis[i % emojis.length]

            items.push({
                id: `${emoji.url}-${i}`,
                url: emoji.url,
                // spread widely across the screen
                x: Math.random() * 100,
                y: Math.random() * 100,
                // vary sizes
                size: isMobile ? 32 + Math.random() * 24 : 48 + Math.random() * 48,
                // animate slowly
                duration: 15 + Math.random() * 20,
                delay: -Math.random() * 20, // start at different points in cycle
                rotation: Math.random() * 360
            })
        }

        return items
    }, [emojis, displayCount, isMobile])

    if (!mounted || floatingEmojis.length === 0) return null

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {floatingEmojis.map((emoji) => (
                <div
                    key={emoji.id}
                    className={cn(
                        "absolute will-change-transform",
                        "animate-float-slow"
                    )}
                    style={{
                        left: `${emoji.x}%`,
                        top: `${emoji.y}%`,
                        width: emoji.size,
                        height: emoji.size,
                        opacity: opacity,
                        animationDuration: `${emoji.duration}s`,
                        animationDelay: `${emoji.delay}s`,
                    }}
                >
                    <img
                        src={proxyImageUrl(emoji.url)}
                        alt=""
                        className="w-full h-full object-contain"
                        style={{
                            transform: `rotate(${emoji.rotation}deg)`,
                        }}
                    />
                </div>
            ))}
        </div>
    )
}
