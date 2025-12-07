"use client"

import { useMemo, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl, hasValidUrl } from "@/lib/utils/image-proxy"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"

interface ConstellationPoint {
  id: string
  x: number
  y: number
  emoji: Emoji
  connections: number[] // Indices of connected points
}

interface EmojiConstellationProps {
  emojis: Emoji[]
  className?: string
  lineColor?: string
  lineOpacity?: number
  emojiSize?: number
  animated?: boolean
}

/**
 * Creates a constellation pattern by connecting emojis with lines
 * Like stars in the night sky, but with your workspace emojis
 */
export function EmojiConstellation({
  emojis,
  className = "",
  lineColor = "var(--wrapped-accent-purple)",
  lineOpacity = 0.3,
  emojiSize = 32,
  animated = true,
}: EmojiConstellationProps) {
  const shouldReduceAnimations = useShouldReduceAnimations()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const shouldAnimate = mounted && animated && !shouldReduceAnimations

  // Filter to valid emojis
  const validEmojis = useMemo(
    () => emojis.filter((emoji) => hasValidUrl(emoji)).slice(0, 8),
    [emojis]
  )

  // Generate constellation points with connections
  const constellation = useMemo(() => {
    if (validEmojis.length < 2) return { points: [], lines: [] }

    // Create points in a rough constellation shape
    const points: ConstellationPoint[] = validEmojis.map((emoji, i) => {
      // Distribute points in a constellation-like pattern
      const angle = (i / validEmojis.length) * Math.PI * 2 + Math.random() * 0.5
      const radius = 30 + Math.random() * 20 // 30-50% from center

      return {
        id: `${emoji.name}-${i}`,
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        emoji,
        connections: [],
      }
    })

    // Create connection lines (connect each point to 1-2 neighbors)
    const lines: { x1: number; y1: number; x2: number; y2: number; delay: number }[] = []

    for (let i = 0; i < points.length; i++) {
      // Connect to next point (circular)
      const nextIdx = (i + 1) % points.length
      lines.push({
        x1: points[i].x,
        y1: points[i].y,
        x2: points[nextIdx].x,
        y2: points[nextIdx].y,
        delay: i * 0.1,
      })

      // Sometimes connect to point after next for variety
      if (i % 2 === 0 && points.length > 3) {
        const skipIdx = (i + 2) % points.length
        lines.push({
          x1: points[i].x,
          y1: points[i].y,
          x2: points[skipIdx].x,
          y2: points[skipIdx].y,
          delay: i * 0.1 + 0.5,
        })
      }
    }

    return { points, lines }
  }, [validEmojis])

  if (!mounted || validEmojis.length < 2) return null

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* SVG for constellation lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="constellation-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={lineColor} stopOpacity={lineOpacity} />
            <stop offset="50%" stopColor={lineColor} stopOpacity={lineOpacity * 1.5} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={lineOpacity} />
          </linearGradient>
        </defs>

        {/* Constellation lines */}
        {constellation.lines.map((line, i) => (
          <motion.line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="url(#constellation-line-gradient)"
            strokeWidth={0.3}
            strokeLinecap="round"
            initial={shouldAnimate ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 1 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={
              shouldAnimate
                ? { duration: 1, delay: line.delay, ease: "easeOut" }
                : { duration: 0 }
            }
          />
        ))}
      </svg>

      {/* Emoji points */}
      {constellation.points.map((point, i) => (
        <motion.div
          key={point.id}
          className="absolute"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          initial={shouldAnimate ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            shouldAnimate
              ? { type: "spring", stiffness: 200, damping: 15, delay: i * 0.15 }
              : { duration: 0 }
          }
        >
          {/* Glow effect behind emoji */}
          <div
            className="absolute inset-0 rounded-full blur-md opacity-50"
            style={{
              backgroundColor: lineColor,
              width: emojiSize * 1.5,
              height: emojiSize * 1.5,
              transform: "translate(-25%, -25%)",
            }}
          />

          {/* Emoji image */}
          <img
            src={proxyImageUrl(point.emoji.url)}
            alt={point.emoji.name}
            className="relative object-contain"
            style={{ width: emojiSize, height: emojiSize }}
          />
        </motion.div>
      ))}
    </div>
  )
}
