"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { NumberTicker } from "@/components/ui/number-ticker"
import { useShouldReduceAnimations } from "@/hooks/use-animation-tier"
import { cva, type VariantProps } from "class-variance-authority"

const statCardVariants = cva(
  "wrapped-glass rounded-2xl p-6 flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "min-w-[120px]",
        md: "min-w-[160px]",
        lg: "min-w-[200px]",
        full: "w-full",
      },
      variant: {
        default: "",
        accent: "wrapped-pill",
        glow: "wrapped-glow-purple",
      },
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
)

export interface StatCardProps
  extends VariantProps<typeof statCardVariants> {
  value: number | string
  label: string
  suffix?: string
  prefix?: string
  icon?: React.ReactNode
  animate?: boolean
  captureMode?: boolean
  delay?: number
  className?: string
}

export function StatCard({
  value,
  label,
  suffix,
  prefix,
  icon,
  size,
  variant,
  animate = true,
  captureMode = false,
  delay = 0,
  className,
}: StatCardProps) {
  const shouldReduceAnimations = useShouldReduceAnimations()
  const shouldAnimate = animate && !captureMode && !shouldReduceAnimations
  const isNumeric = typeof value === "number"

  return (
    <motion.div
      className={cn(statCardVariants({ size, variant }), className)}
      initial={shouldAnimate ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={
        shouldAnimate
          ? {
              type: "spring",
              stiffness: 200,
              damping: 20,
              delay,
            }
          : undefined
      }
    >
      {icon && <div className="mb-2 text-2xl">{icon}</div>}

      <div className="flex items-baseline gap-1">
        {prefix && (
          <span className="text-lg font-bold text-[var(--wrapped-text-secondary)]">
            {prefix}
          </span>
        )}

        {isNumeric && shouldAnimate ? (
          <NumberTicker
            value={value as number}
            delay={delay + 0.2}
            className="wrapped-hero-number text-4xl md:text-5xl"
          />
        ) : (
          <span className="font-mono text-4xl md:text-5xl font-black text-white">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
        )}

        {suffix && (
          <span className="text-lg font-bold text-[var(--wrapped-text-secondary)]">
            {suffix}
          </span>
        )}
      </div>

      <span className="wrapped-label mt-2">{label}</span>
    </motion.div>
  )
}

/**
 * Horizontal stat row for quick stats display
 */
export interface StatRowProps {
  stats: Array<{
    value: number | string
    label: string
    suffix?: string
    icon?: React.ReactNode
  }>
  captureMode?: boolean
  className?: string
}

export function StatRow({ stats, captureMode = false, className }: StatRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-4",
        className
      )}
    >
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          value={stat.value}
          label={stat.label}
          suffix={stat.suffix}
          icon={stat.icon}
          size="sm"
          captureMode={captureMode}
          delay={index * 0.1}
        />
      ))}
    </div>
  )
}

/**
 * Mini stat pill for inline stats
 */
export interface StatPillProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number
  label: string
  icon?: React.ReactNode
}

export function StatPill({ value, label, icon, className, ...props }: StatPillProps) {
  return (
    <div
      className={cn(
        "wrapped-pill rounded-full px-4 py-2 flex items-center gap-2",
        className
      )}
      {...props}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="font-mono font-bold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-sm text-[var(--wrapped-text-secondary)]">{label}</span>
    </div>
  )
}
