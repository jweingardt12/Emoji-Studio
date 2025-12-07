"use client"

import * as React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { cva, type VariantProps } from "class-variance-authority"

const emojiHeroVariants = cva(
  "relative flex items-center justify-center",
  {
    variants: {
      size: {
        sm: "w-24 h-24",
        md: "w-36 h-36",
        lg: "w-48 h-48",
        xl: "w-64 h-64",
      },
      glow: {
        purple: "wrapped-glow-purple",
        orange: "wrapped-glow-orange",
        cyan: "wrapped-glow-cyan",
        none: "",
      },
    },
    defaultVariants: {
      size: "lg",
      glow: "purple",
    },
  }
)

export interface EmojiHeroProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emojiHeroVariants> {
  emoji: {
    name: string
    url: string
  }
  animate?: boolean
  captureMode?: boolean
  delay?: number
}

export function EmojiHero({
  emoji,
  size,
  glow,
  animate = true,
  captureMode = false,
  delay = 0,
  className,
  ...props
}: EmojiHeroProps) {
  const shouldReduceAnimations = useShouldReduceAnimations()
  const shouldAnimate = animate && !captureMode && !shouldReduceAnimations
  const [hasError, setHasError] = useState(false)

  // Size mappings for the actual image
  const imageSizeMap = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-40 h-40",
    xl: "w-56 h-56",
  }

  const imageSize = imageSizeMap[size || "lg"]

  // Use placeholder if emoji URL is invalid or image failed to load
  const imageSrc = hasError || !hasValidUrl(emoji)
    ? EMOJI_PLACEHOLDER
    : proxyImageUrl(emoji.url)

  return (
    <div className={cn(emojiHeroVariants({ size, glow }), className)} {...props}>
      {/* Radial glow background */}
      {glow !== "none" && (
        <div
          className={cn(
            "absolute inset-0 rounded-full blur-3xl opacity-30",
            shouldAnimate && "wrapped-glow-pulse",
            glow === "purple" && "bg-[var(--wrapped-accent-purple)]",
            glow === "orange" && "bg-[var(--wrapped-accent-orange)]",
            glow === "cyan" && "bg-[var(--wrapped-accent-cyan)]"
          )}
        />
      )}

      {/* Emoji image */}
      <motion.img
        src={imageSrc}
        alt={`:${emoji.name}:`}
        className={cn(
          imageSize,
          "relative z-10 object-contain drop-shadow-2xl",
          shouldAnimate && "wrapped-float"
        )}
        initial={shouldAnimate ? { scale: 0, rotate: -180 } : { scale: 1, rotate: 0 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={
          shouldAnimate
            ? {
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay,
              }
            : { duration: 0 }
        }
        onError={() => setHasError(true)}
      />
    </div>
  )
}
