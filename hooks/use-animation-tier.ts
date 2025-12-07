"use client"

import * as React from "react"
import { useIsMobile } from "./use-mobile"

/**
 * Animation tier system for graceful degradation
 * - high: Desktop with good specs - all effects enabled
 * - mid: Tablet or lower-spec desktop - reduced effects
 * - low: Mobile or reduced-motion preference - minimal effects
 */
export type AnimationTier = "high" | "mid" | "low"

interface DeviceCapabilities {
  deviceMemory: number | null
  hardwareConcurrency: number | null
  connectionType: string | null
  prefersReducedMotion: boolean
}

function getDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === "undefined") {
    return {
      deviceMemory: null,
      hardwareConcurrency: null,
      connectionType: null,
      prefersReducedMotion: false,
    }
  }

  // Device memory (in GB) - not supported in all browsers
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null

  // CPU cores
  const hardwareConcurrency = navigator.hardwareConcurrency ?? null

  // Connection type
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
  const connectionType = connection?.effectiveType ?? null

  // Reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return {
    deviceMemory,
    hardwareConcurrency,
    connectionType,
    prefersReducedMotion,
  }
}

function calculateTier(isMobile: boolean | null, capabilities: DeviceCapabilities): AnimationTier {
  // If user prefers reduced motion, always use low tier
  if (capabilities.prefersReducedMotion) {
    return "low"
  }

  // During SSR/hydration (isMobile === null), default to mid tier
  // This ensures animations initialize properly on both platforms
  if (isMobile === null) {
    return "mid"
  }

  // Mobile devices get low tier
  if (isMobile) {
    return "low"
  }

  // Check for slow connection (2g, slow-2g)
  if (capabilities.connectionType === "2g" || capabilities.connectionType === "slow-2g") {
    return "low"
  }

  // Check device capabilities for mid vs high
  const hasLowMemory = capabilities.deviceMemory !== null && capabilities.deviceMemory < 4
  const hasLowCores = capabilities.hardwareConcurrency !== null && capabilities.hardwareConcurrency < 4
  const hasSlowConnection = capabilities.connectionType === "3g"

  // If any of these are true, use mid tier
  if (hasLowMemory || hasLowCores || hasSlowConnection) {
    return "mid"
  }

  // Default to high tier for capable devices
  return "high"
}

export function useAnimationTier(): AnimationTier {
  const isMobile = useIsMobile()
  const [tier, setTier] = React.useState<AnimationTier>("mid") // Safe default

  React.useEffect(() => {
    const capabilities = getDeviceCapabilities()
    const calculatedTier = calculateTier(isMobile, capabilities)
    setTier(calculatedTier)
  }, [isMobile])

  return tier
}

/**
 * Hook to check if reduced motion is preferred
 * Returns true for low-motion devices or user preference
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReducedMotion
}

/**
 * Utility hook that combines mobile detection and reduced motion
 * for simple "should reduce animations" checks
 *
 * Returns false during SSR/hydration (when isMobile is null) to ensure
 * animations initialize properly on first render. After hydration, returns
 * true if user is on mobile or prefers reduced motion.
 */
export function useShouldReduceAnimations(): boolean {
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()

  // During SSR/hydration (isMobile === null), default to NOT reducing
  // This ensures animations initialize properly on both platforms
  if (isMobile === null) return false

  return isMobile || prefersReducedMotion
}

/**
 * Spring presets for Framer Motion
 * Use these directly in transition props
 */
export const SPRING_PRESETS = {
  // Snappy for UI elements
  snappy: { type: "spring" as const, stiffness: 400, damping: 30, mass: 0.8 },
  // Bouncy for celebratory moments
  bouncy: { type: "spring" as const, stiffness: 300, damping: 15, mass: 1 },
  // Smooth for large elements
  smooth: { type: "spring" as const, stiffness: 150, damping: 25, mass: 1.2 },
  // Subtle for continuous animations
  subtle: { type: "spring" as const, stiffness: 100, damping: 20, mass: 1 },
  // Mobile-optimized - gentler for performance
  mobile: { type: "spring" as const, stiffness: 150, damping: 20, mass: 0.8 },
  // Instant - no animation
  instant: { type: "tween" as const, duration: 0 },
}

/**
 * Dramatic animation presets for Wrapped buildup and suspense
 * Use these for moments that need visual drama and anticipation
 */
export const DRAMATIC_PRESETS = {
  // Suspense - slow buildup with blur-to-focus reveal
  suspense: {
    initial: { scale: 0.8, opacity: 0, filter: "blur(10px)" },
    animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
    transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
  },

  // Reveal - explosive entrance with rotation
  reveal: {
    initial: { scale: 0, rotate: -180 },
    animate: { scale: 1, rotate: 0 },
    transition: { type: "spring" as const, stiffness: 200, damping: 10, delay: 0.8 },
  },

  // Zoom push - camera zoom effect for numbers/stats
  zoomPush: {
    initial: { scale: 0.5, opacity: 0, y: 20 },
    animate: { scale: 1, opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 150, damping: 12, delay: 0.3 },
  },

  // Rise from bottom - for podiums and leaderboard rows
  riseUp: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },

  // Cascade - for staggered list reveals
  cascade: {
    container: {
      animate: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
    },
    item: {
      initial: { x: -30, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      transition: { type: "spring" as const, stiffness: 300, damping: 25 },
    },
  },

  // Alternating cascade - rows from alternating sides
  alternatingCascade: {
    container: {
      animate: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    },
    itemLeft: {
      initial: { x: -50, opacity: 0 },
      animate: { x: 0, opacity: 1 },
    },
    itemRight: {
      initial: { x: 50, opacity: 0 },
      animate: { x: 0, opacity: 1 },
    },
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },

  // Pulse glow - attention-grabbing loop
  pulseGlow: {
    animate: {
      scale: [1, 1.05, 1],
      boxShadow: [
        "0 0 0 rgba(168, 85, 247, 0)",
        "0 0 30px rgba(168, 85, 247, 0.5)",
        "0 0 0 rgba(168, 85, 247, 0)",
      ],
    },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },

  // Shake - for wrong answers
  shake: {
    animate: { x: [0, -10, 10, -10, 10, 0] },
    transition: { duration: 0.5, ease: "easeInOut" },
  },

  // Spotlight sweep - for highlighting winners
  spotlight: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },

  // Counter reveal - for leaderboard rankings appearing one by one
  counterReveal: {
    initial: { opacity: 0, scale: 0.8, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 400, damping: 20 },
  },
}

/**
 * Get stagger delay for list item animations
 * @param index Item index in list
 * @param baseDelay Base delay before first item
 * @param staggerAmount Delay between each item
 */
export function getStaggerDelay(index: number, baseDelay: number = 0.3, staggerAmount: number = 0.1): number {
  return baseDelay + index * staggerAmount
}

/**
 * Hook to get spring presets based on device tier
 * Returns mobile-friendly springs on low-tier devices
 */
export function useSpringPresets() {
  const tier = useAnimationTier()

  return React.useMemo(() => {
    if (tier === "low") {
      return {
        snappy: SPRING_PRESETS.mobile,
        bouncy: SPRING_PRESETS.mobile,
        smooth: SPRING_PRESETS.subtle,
        subtle: SPRING_PRESETS.instant,
        default: SPRING_PRESETS.mobile,
      }
    }
    if (tier === "mid") {
      return {
        snappy: SPRING_PRESETS.snappy,
        bouncy: SPRING_PRESETS.smooth,
        smooth: SPRING_PRESETS.smooth,
        subtle: SPRING_PRESETS.subtle,
        default: SPRING_PRESETS.smooth,
      }
    }
    // High tier - full springs
    return {
      snappy: SPRING_PRESETS.snappy,
      bouncy: SPRING_PRESETS.bouncy,
      smooth: SPRING_PRESETS.smooth,
      subtle: SPRING_PRESETS.subtle,
      default: SPRING_PRESETS.bouncy,
    }
  }, [tier])
}

/**
 * Animation config based on tier
 * Use this to get consistent animation settings across components
 */
export function useAnimationConfig() {
  const tier = useAnimationTier()

  return React.useMemo(() => {
    switch (tier) {
      case "high":
        return {
          // Spring physics
          springStiffness: 300,
          springDamping: 30,
          // Stagger delays
          staggerDelay: 0.05,
          // Particle/effect counts
          particleCount: 20,
          emojiCount: 16,
          // Enable all effects
          enableParticles: true,
          enablePhysics: true,
          enableComplexAnimations: true,
          // Transition durations
          transitionDuration: 0.3,
          // Spring presets
          springs: SPRING_PRESETS,
        }
      case "mid":
        return {
          springStiffness: 200,
          springDamping: 25,
          staggerDelay: 0.03,
          particleCount: 10,
          emojiCount: 10,
          enableParticles: true,
          enablePhysics: false,
          enableComplexAnimations: true,
          transitionDuration: 0.2,
          springs: {
            ...SPRING_PRESETS,
            bouncy: SPRING_PRESETS.smooth,
          },
        }
      case "low":
      default:
        return {
          springStiffness: 100,
          springDamping: 20,
          staggerDelay: 0,
          particleCount: 0,
          emojiCount: 8,
          enableParticles: false,
          enablePhysics: false,
          enableComplexAnimations: false,
          transitionDuration: 0.15,
          springs: {
            snappy: SPRING_PRESETS.mobile,
            bouncy: SPRING_PRESETS.mobile,
            smooth: SPRING_PRESETS.subtle,
            subtle: SPRING_PRESETS.instant,
            mobile: SPRING_PRESETS.mobile,
            instant: SPRING_PRESETS.instant,
          },
        }
    }
  }, [tier])
}
