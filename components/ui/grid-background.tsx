"use client"

import { cn } from "@/lib/utils"

interface GridBackgroundProps {
  className?: string
  gridSize?: number
  gridColor?: string
  gridOpacity?: number
  showGlow?: boolean
  glowColor?: string
  glowPosition?: "center" | "top" | "bottom"
}

export function GridBackground({
  className,
  gridSize = 40,
  gridColor = "rgba(255, 255, 255, 0.06)",
  gridOpacity = 1,
  showGlow = true,
  glowColor = "rgba(147, 51, 234, 0.15)",
  glowPosition = "center",
}: GridBackgroundProps) {
  const glowPositions = {
    center: "50% 50%",
    top: "50% 20%",
    bottom: "50% 80%",
  }

  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden",
        className
      )}
      style={{ opacity: gridOpacity }}
    >
      {/* Grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, ${gridColor} 1px, transparent 1px),
            linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
      {/* Optional glow effect */}
      {showGlow && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at ${glowPositions[glowPosition]}, ${glowColor} 0%, transparent 60%)`,
          }}
        />
      )}
    </div>
  )
}
