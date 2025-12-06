"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { useIsMobile } from "@/hooks/use-mobile"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface EmojiGridBackgroundProps {
  emojis: Emoji[]
  opacity?: number
}

export function EmojiGridBackground({ emojis, opacity = 0.12 }: EmojiGridBackgroundProps) {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()
  const shouldReduceAnimations = isMobile || prefersReducedMotion

  // Shuffle emojis for variety and fill enough to cover the screen
  // Reduce count on mobile for better performance
  const shuffledEmojis = useMemo(() => {
    const shuffled = [...emojis].sort(() => Math.random() - 0.5)
    const targetCount = isMobile ? 48 : 120
    const repeated: Emoji[] = []
    while (repeated.length < targetCount && shuffled.length > 0) {
      repeated.push(...shuffled)
    }
    return repeated.slice(0, targetCount)
  }, [emojis, isMobile])

  if (shuffledEmojis.length === 0) return null

  // Skip animations on mobile for better performance - use static grid
  if (shouldReduceAnimations) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-2 p-4"
          style={{ opacity }}
        >
          {shuffledEmojis.map((emoji, i) => (
            <img
              key={`bg-${emoji.url}-${i}`}
              src={proxyImageUrl(emoji.url)}
              alt=""
              className="w-6 h-6 md:w-10 md:h-10 object-contain"
              style={{ transform: `rotate(${(Math.random() - 0.5) * 10}deg)` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="grid grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 p-4"
        style={{ opacity }}
      >
        {shuffledEmojis.map((emoji, i) => (
          <motion.img
            key={`bg-${emoji.url}-${i}`}
            src={proxyImageUrl(emoji.url)}
            alt=""
            className="w-8 h-8 md:w-10 md:h-10 object-contain"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: (Math.random() - 0.5) * 10
            }}
            transition={{
              delay: i * 0.01,
              duration: 0.3
            }}
          />
        ))}
      </div>
    </div>
  )
}
