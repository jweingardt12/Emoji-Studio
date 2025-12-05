"use client"

import { cn } from "@/lib/utils"
import { useId } from "react"

interface DotPatternProps {
  width?: number
  height?: number
  x?: number
  y?: number
  cx?: number
  cy?: number
  cr?: number
  className?: string
  dotColor?: string
  dotOpacity?: number
  glow?: boolean
  glowColor?: string
}

export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  dotColor = "currentColor",
  dotOpacity = 0.3,
  glow = false,
  glowColor = "rgba(147, 51, 234, 0.3)",
}: DotPatternProps) {
  const id = useId()

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <circle
            cx={cx}
            cy={cy}
            r={cr}
            fill={dotColor}
            fillOpacity={dotOpacity}
          />
        </pattern>
        {glow && (
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        )}
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {glow && (
        <rect
          width="100%"
          height="100%"
          fill={`url(#${id}-glow)`}
          className="mix-blend-overlay"
        />
      )}
    </svg>
  )
}
