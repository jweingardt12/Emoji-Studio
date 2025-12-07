"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Emoji } from "@/lib/services/emoji-service"
import { proxyImageUrl, hasValidUrl, EMOJI_PLACEHOLDER } from "@/lib/utils/image-proxy"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"

interface EmojiSupernovaProps {
  emoji: Emoji
  trigger?: boolean
  size?: "sm" | "md" | "lg"
  glowColor?: string
  particleCount?: number
  onComplete?: () => void
  className?: string
}

interface Particle {
  id: number
  angle: number
  distance: number
  size: number
  delay: number
  duration: number
}

/**
 * Dramatic emoji reveal with supernova explosion effect
 * The emoji expands, glows intensely, then particles scatter outward
 */
export function EmojiSupernova({
  emoji,
  trigger = true,
  size = "lg",
  glowColor = "var(--wrapped-accent-orange)",
  particleCount = 8,
  onComplete,
  className = "",
}: EmojiSupernovaProps) {
  const shouldReduceAnimations = useShouldReduceAnimations()
  const [phase, setPhase] = useState<"idle" | "charging" | "exploding" | "complete">("idle")
  const [particles, setParticles] = useState<Particle[]>([])
  const [imgError, setImgError] = useState(false)
  const hasTriggered = useRef(false)

  const sizeMap = {
    sm: { emoji: 48, container: 120 },
    md: { emoji: 72, container: 180 },
    lg: { emoji: 96, container: 240 },
  }

  const { emoji: emojiSize, container: containerSize } = sizeMap[size]

  // Generate particles
  useEffect(() => {
    if (shouldReduceAnimations) return

    const newParticles: Particle[] = []
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        angle: (i / particleCount) * 360 + Math.random() * 30,
        distance: 60 + Math.random() * 40,
        size: 16 + Math.random() * 16,
        delay: Math.random() * 0.2,
        duration: 0.8 + Math.random() * 0.4,
      })
    }
    setParticles(newParticles)
  }, [particleCount, shouldReduceAnimations])

  // Handle animation phases
  useEffect(() => {
    if (!trigger || hasTriggered.current || shouldReduceAnimations) {
      if (shouldReduceAnimations && trigger) {
        setPhase("complete")
      }
      return
    }

    hasTriggered.current = true

    // Phase 1: Charging (scale up with glow)
    setPhase("charging")

    // Phase 2: Exploding (particles scatter)
    const explodeTimer = setTimeout(() => {
      setPhase("exploding")
    }, 800)

    // Phase 3: Complete (settle)
    const completeTimer = setTimeout(() => {
      setPhase("complete")
      onComplete?.()
    }, 2000)

    return () => {
      clearTimeout(explodeTimer)
      clearTimeout(completeTimer)
    }
  }, [trigger, onComplete, shouldReduceAnimations])

  const imgSrc = hasValidUrl(emoji)
    ? imgError
      ? EMOJI_PLACEHOLDER
      : proxyImageUrl(emoji.url)
    : EMOJI_PLACEHOLDER

  if (shouldReduceAnimations) {
    // Simple static render for reduced motion
    return (
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{ width: containerSize, height: containerSize }}
      >
        <img
          src={imgSrc}
          alt={emoji.name}
          className="object-contain"
          style={{ width: emojiSize, height: emojiSize }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Glow layers */}
      <AnimatePresence>
        {(phase === "charging" || phase === "exploding") && (
          <>
            {/* Outer glow */}
            <motion.div
              className="absolute rounded-full"
              style={{ backgroundColor: glowColor }}
              initial={{ width: emojiSize, height: emojiSize, opacity: 0, filter: "blur(20px)" }}
              animate={{
                width: phase === "exploding" ? containerSize * 1.5 : emojiSize * 2,
                height: phase === "exploding" ? containerSize * 1.5 : emojiSize * 2,
                opacity: phase === "exploding" ? 0 : 0.6,
                filter: phase === "exploding" ? "blur(40px)" : "blur(20px)",
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />

            {/* Inner glow */}
            <motion.div
              className="absolute rounded-full"
              style={{ backgroundColor: "white" }}
              initial={{ width: emojiSize * 0.5, height: emojiSize * 0.5, opacity: 0, filter: "blur(10px)" }}
              animate={{
                width: phase === "exploding" ? emojiSize * 2 : emojiSize,
                height: phase === "exploding" ? emojiSize * 2 : emojiSize,
                opacity: phase === "exploding" ? 0 : 0.8,
                filter: phase === "exploding" ? "blur(20px)" : "blur(10px)",
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Particles */}
      <AnimatePresence>
        {phase === "exploding" &&
          particles.map((particle) => {
            const x = Math.cos((particle.angle * Math.PI) / 180) * particle.distance
            const y = Math.sin((particle.angle * Math.PI) / 180) * particle.distance

            return (
              <motion.div
                key={particle.id}
                className="absolute"
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x, y, scale: 1, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: "easeOut",
                }}
              >
                <img
                  src={imgSrc}
                  alt=""
                  className="object-contain rounded"
                  style={{
                    width: particle.size,
                    height: particle.size,
                    filter: `drop-shadow(0 0 4px ${glowColor})`,
                  }}
                />
              </motion.div>
            )
          })}
      </AnimatePresence>

      {/* Main emoji */}
      <motion.div
        className="relative z-10"
        animate={{
          scale:
            phase === "idle"
              ? 1
              : phase === "charging"
                ? 1.3
                : phase === "exploding"
                  ? 1.1
                  : 1,
          rotate: phase === "charging" ? [0, -5, 5, -5, 5, 0] : 0,
        }}
        transition={{
          scale: { type: "spring", stiffness: 200, damping: 15 },
          rotate: { duration: 0.5, repeat: phase === "charging" ? Infinity : 0 },
        }}
      >
        <img
          src={imgSrc}
          alt={emoji.name}
          className="object-contain"
          style={{
            width: emojiSize,
            height: emojiSize,
            filter:
              phase === "charging" || phase === "exploding"
                ? `drop-shadow(0 0 20px ${glowColor})`
                : "none",
          }}
          onError={() => setImgError(true)}
        />
      </motion.div>
    </div>
  )
}
