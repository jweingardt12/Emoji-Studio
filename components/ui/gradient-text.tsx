"use client"

import React from "react"
import { motion, MotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

interface GradientTextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> {
  className?: string
  children: React.ReactNode
  as?: React.ElementType
  colors?: string[]
  animationSpeed?: number
}

function GradientText({
  className,
  children,
  as: Component = "span",
  colors,
  animationSpeed = 8,
  ...props
}: GradientTextProps) {
  const MotionComponent = motion.create(Component)

  // Default gradient or custom colors
  const gradientColors = colors
    ? `linear-gradient(to right, ${colors.join(", ")})`
    : undefined

  return (
    <MotionComponent
      className={cn(
        "relative inline-flex bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent animate-gradient",
        className
      )}
      style={{
        backgroundSize: "300% 100%",
        backgroundImage: gradientColors,
        animationDuration: `${animationSpeed}s`,
      }}
      {...props}
    >
      {children}
    </MotionComponent>
  )
}

export { GradientText }
