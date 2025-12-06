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
        }
    }
  }, [tier])
}
