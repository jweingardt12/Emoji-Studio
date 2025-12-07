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
        xs: "w-12 h-12 xs:w-14 xs:h-14",
        sm: "w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24",
        md: "w-20 h-20 xs:w-24 xs:h-24 sm:w-36 sm:h-36",
        lg: "w-24 h-24 xs:w-28 xs:h-28 sm:w-40 sm:h-40 md:w-48 md:h-48",
        xl: "w-32 h-32 xs:w-40 xs:h-40 sm:w-56 sm:h-56 md:w-64 md:h-64",
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

  // Size mappings for the actual image (responsive)
  const imageSizeMap = {
    xs: "w-10 h-10 xs:w-12 xs:h-12",
    sm: "w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20",
    md: "w-16 h-16 xs:w-20 xs:h-20 sm:w-28 sm:h-28",
    lg: "w-20 h-20 xs:w-24 xs:h-24 sm:w-32 sm:h-32 md:w-40 md:h-40",
    xl: "w-28 h-28 xs:w-32 xs:h-32 sm:w-48 sm:h-48 md:w-56 md:h-56",
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
