"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl } from "@/lib/utils/image-proxy"

interface EmojiGridBackgroundProps {
  emojis: Emoji[]
  opacity?: number
}

export function EmojiGridBackground({ emojis, opacity = 0.12 }: EmojiGridBackgroundProps) {
  // Shuffle emojis for variety and fill enough to cover the screen
  const shuffledEmojis = useMemo(() => {
    const shuffled = [...emojis].sort(() => Math.random() - 0.5)
    // Repeat to fill the grid (need ~100 items for a nice grid)
    const targetCount = 120
    const repeated: Emoji[] = []
    while (repeated.length < targetCount && shuffled.length > 0) {
      repeated.push(...shuffled)
    }
    return repeated.slice(0, targetCount)
  }, [emojis])

  if (shuffledEmojis.length === 0) return null

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
              rotate: (Math.random() - 0.5) * 10 // Slight random rotation
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
