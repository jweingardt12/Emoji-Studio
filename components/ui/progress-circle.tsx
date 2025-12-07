"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressCircleProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Progress value from 0 to 100
   */
  value?: number
  /**
   * Size of the circle in pixels
   */
  size?: number
  /**
   * Width of the progress stroke
   */
  strokeWidth?: number
  /**
   * Additional className for the progress stroke
   */
  indicatorClassName?: string
  /**
   * Additional className for the progress track
   */
  trackClassName?: string
  /**
   * Content to display in the center of the circle
   */
  children?: React.ReactNode
}

export function ProgressCircle({
  className,
  indicatorClassName,
  trackClassName,
  value = 0,
  size = 48,
  strokeWidth = 4,
  children,
  ...props
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div
      data-slot="progress-circle"
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        className="absolute inset-0 -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track circle */}
        <circle
          data-slot="progress-circle-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={cn("text-white/10", trackClassName)}
        />
        {/* Progress indicator circle */}
        <circle
          data-slot="progress-circle-indicator"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            "text-primary transition-all duration-300 ease-in-out",
            indicatorClassName
          )}
        />
      </svg>
      {children && (
        <div
          data-slot="progress-circle-content"
          className="relative z-10 flex items-center justify-center text-sm font-medium"
        >
          {children}
        </div>
      )}
    </div>
  )
}
