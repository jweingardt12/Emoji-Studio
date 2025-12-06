"use client"

import * as React from "react"
import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { proxyImageUrl, EMOJI_PLACEHOLDER, hasValidUrl } from "@/lib/utils/image-proxy"
import Marquee from "@/components/ui/marquee"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { cva, type VariantProps } from "class-variance-authority"

const emojiMarqueeVariants = cva("py-4", {
  variants: {
    size: {
      sm: "[&_img]:w-8 [&_img]:h-8",
      md: "[&_img]:w-12 [&_img]:h-12",
      lg: "[&_img]:w-16 [&_img]:h-16",
    },
    gap: {
      sm: "[&_img]:mx-2",
      md: "[&_img]:mx-4",
      lg: "[&_img]:mx-6",
    },
  },
  defaultVariants: {
    size: "md",
    gap: "md",
  },
})

export interface Emoji {
  name: string
  url: string
}

export interface EmojiMarqueeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emojiMarqueeVariants> {
  emojis: Emoji[]
  reverse?: boolean
  pauseOnHover?: boolean
  speed?: "slow" | "normal" | "fast"
  captureMode?: boolean
}

export function EmojiMarquee({
  emojis,
  size,
  gap,
  reverse = false,
  pauseOnHover = true,
  speed = "normal",
  captureMode = false,
  className,
  ...props
}: EmojiMarqueeProps) {
  const shouldReduceAnimations = useShouldReduceAnimations()
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

  const handleImageError = useCallback((key: string) => {
    setFailedImages((prev) => new Set(prev).add(key))
  }, [])

  const getImageSrc = useCallback((emoji: Emoji, key: string) => {
    if (failedImages.has(key) || !hasValidUrl(emoji)) {
      return EMOJI_PLACEHOLDER
    }
    return proxyImageUrl(emoji.url)
  }, [failedImages])

  // Speed mappings
  const speedMap = {
    slow: 40,
    normal: 25,
    fast: 15,
  }

  // Filter to valid emojis first
  const validEmojis = emojis.filter(emoji => hasValidUrl(emoji))

  // If capture mode or reduced animations, show static grid
  if (captureMode || shouldReduceAnimations) {
    return (
      <div
        className={cn(
          "flex items-center justify-center flex-wrap gap-3",
          emojiMarqueeVariants({ size, gap }),
          className
        )}
        {...props}
      >
        {validEmojis.slice(0, 12).map((emoji, i) => {
          const key = `${emoji.name}-${i}`
          return (
            <img
              key={key}
              src={getImageSrc(emoji, key)}
              alt={`:${emoji.name}:`}
              className="object-contain rounded"
              onError={() => handleImageError(key)}
            />
          )
        })}
      </div>
    )
  }

  // Duplicate emojis for seamless loop
  const duplicatedEmojis = [...validEmojis, ...validEmojis]

  return (
    <div className={cn(emojiMarqueeVariants({ size, gap }), className)} {...props}>
      <Marquee
        reverse={reverse}
        pauseOnHover={pauseOnHover}
        className="[--duration:var(--marquee-duration)]"
        style={{ "--marquee-duration": `${speedMap[speed]}s` } as React.CSSProperties}
      >
        {duplicatedEmojis.map((emoji, i) => {
          const key = `${emoji.name}-${i}`
          return (
            <img
              key={key}
              src={getImageSrc(emoji, key)}
              alt={`:${emoji.name}:`}
              className="object-contain rounded hover:scale-110 transition-transform"
              onError={() => handleImageError(key)}
            />
          )
        })}
      </Marquee>
    </div>
  )
}

/**
 * Dual marquee component - two rows moving in opposite directions
 */
export interface DualEmojiMarqueeProps extends Omit<EmojiMarqueeProps, "reverse"> {
  emojis: Emoji[]
}

export function DualEmojiMarquee({
  emojis,
  className,
  ...props
}: DualEmojiMarqueeProps) {
  // Split emojis into two groups
  const midpoint = Math.ceil(emojis.length / 2)
  const topEmojis = emojis.slice(0, midpoint)
  const bottomEmojis = emojis.slice(midpoint)

  return (
    <div className={cn("space-y-2", className)}>
      <EmojiMarquee emojis={topEmojis} reverse={false} {...props} />
      <EmojiMarquee emojis={bottomEmojis} reverse={true} {...props} />
    </div>
  )
}
