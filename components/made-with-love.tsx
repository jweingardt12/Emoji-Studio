"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const HEARTS = ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"]

export function MadeWithLove() {
    const [heart, setHeart] = useState("❤️")

    useEffect(() => {
        // Pick a random heart on mount (page refresh)
        setHeart(HEARTS[Math.floor(Math.random() * HEARTS.length)])
    }, [])

    return (
        <p className="px-3 pb-2 text-xs text-muted-foreground text-center">
            Made with <span className="inline-block animate-pulse">{heart}</span> by{" "}
            <Link
                href="https://jwe.in"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-foreground underline underline-offset-2 transition-colors"
            >
                Jason
            </Link>
        </p>
    )
}
