"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { cva, type VariantProps } from "class-variance-authority"

const emojiOrbitVariants = cva("relative flex items-center justify-center", {
  variants: {
    size: {
      sm: "w-48 h-48",
      md: "w-64 h-64",
      lg: "w-80 h-80",
      xl: "w-96 h-96",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export interface Emoji {
  name: string
  url: string
}

export interface EmojiOrbitProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emojiOrbitVariants> {
  emojis: Emoji[]
  centerContent?: React.ReactNode
  orbitDuration?: number
  emojiSize?: "sm" | "md" | "lg"
  captureMode?: boolean
}

export function EmojiOrbit({
  emojis,
  centerContent,
  size,
  orbitDuration = 30,
  emojiSize = "md",
  captureMode = false,
  className,
  ...props
}: EmojiOrbitProps) {
  const shouldReduceAnimations = useShouldReduceAnimations()
  const shouldAnimate = !captureMode && !shouldReduceAnimations

  // Size mappings for orbit radius
  const radiusMap = {
    sm: 80,
    md: 110,
    lg: 140,
    xl: 170,
  }

  // Size mappings for emoji images
  const emojiSizeMap = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  }

  const radius = radiusMap[size || "md"]
  const imageSize = emojiSizeMap[emojiSize]

  // Calculate positions for static layout
  const calculatePosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2 // Start from top
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  // Limit emojis to prevent overcrowding
  const displayEmojis = emojis.slice(0, 12)

  return (
    <div className={cn(emojiOrbitVariants({ size }), className)} {...props}>
      {/* Center content */}
      {centerContent && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {centerContent}
        </div>
      )}

      {/* Orbiting emojis */}
      <div
        className={cn(
          "absolute inset-0",
          shouldAnimate && "animate-[wrapped-orbit_var(--orbit-duration)_linear_infinite]"
        )}
        style={
          {
            "--orbit-duration": `${orbitDuration}s`,
          } as React.CSSProperties
        }
      >
        {displayEmojis.map((emoji, index) => {
          const position = calculatePosition(index, displayEmojis.length)
          const staggerDelay = index * 0.08

          return (
            <motion.div
              key={`${emoji.name}-${index}`}
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                marginLeft: position.x,
                marginTop: position.y,
                transform: "translate(-50%, -50%)",
              }}
              initial={shouldAnimate ? { scale: 0, opacity: 0 } : false}
              animate={shouldAnimate ? { scale: 1, opacity: 1 } : undefined}
              transition={
                shouldAnimate
                  ? {
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: staggerDelay,
                    }
                  : undefined
              }
            >
              {/* Counter-rotate to keep emojis upright */}
              <motion.img
                src={proxyImageUrl(emoji.url)}
                alt={`:${emoji.name}:`}
                className={cn(
                  imageSize,
                  "object-contain drop-shadow-lg",
                  shouldAnimate &&
                    "animate-[wrapped-orbit_var(--orbit-duration)_linear_infinite_reverse]"
                )}
                style={
                  {
                    "--orbit-duration": `${orbitDuration}s`,
                  } as React.CSSProperties
                }
              />
            </motion.div>
          )
        })}
      </div>

      {/* Orbit ring (subtle visual guide) */}
      <div
        className="absolute rounded-full border border-white/5"
        style={{
          width: radius * 2 + 24,
          height: radius * 2 + 24,
        }}
      />
    </div>
  )
}

/**
 * Static emoji ring - no animation, for simpler layouts
 */
export interface EmojiRingProps extends Omit<EmojiOrbitProps, "orbitDuration"> {}

export function EmojiRing({ className, ...props }: EmojiRingProps) {
  return (
    <EmojiOrbit
      {...props}
      orbitDuration={0}
      captureMode={true} // Force static display
      className={className}
    />
  )
}
