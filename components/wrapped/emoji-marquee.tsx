"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
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

  // Speed mappings
  const speedMap = {
    slow: 40,
    normal: 25,
    fast: 15,
  }

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
        {emojis.slice(0, 12).map((emoji, i) => (
          <img
            key={`${emoji.name}-${i}`}
            src={proxyImageUrl(emoji.url)}
            alt={`:${emoji.name}:`}
            className="object-contain rounded"
          />
        ))}
      </div>
    )
  }

  // Duplicate emojis for seamless loop
  const duplicatedEmojis = [...emojis, ...emojis]

  return (
    <div className={cn(emojiMarqueeVariants({ size, gap }), className)} {...props}>
      <Marquee
        reverse={reverse}
        pauseOnHover={pauseOnHover}
        className="[--duration:var(--marquee-duration)]"
        style={{ "--marquee-duration": `${speedMap[speed]}s` } as React.CSSProperties}
      >
        {duplicatedEmojis.map((emoji, i) => (
          <img
            key={`${emoji.name}-${i}`}
            src={proxyImageUrl(emoji.url)}
            alt={`:${emoji.name}:`}
            className="object-contain rounded hover:scale-110 transition-transform"
          />
        ))}
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
