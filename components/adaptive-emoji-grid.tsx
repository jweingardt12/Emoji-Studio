"use client"

import React from "react"
import EmojiGrid from "./emoji-grid"
import VirtualizedEmojiGrid from "./virtualized-emoji-grid"
import { useSmartGrid, useGridPerformance } from "@/hooks/use-smart-grid"
import { useAnimationTier } from "@/hooks/use-animation-tier"

interface AdaptiveEmojiGridProps {
  forceVirtualized?: boolean // Force use of virtualized grid
  forceRegular?: boolean // Force use of regular grid
  maxHeight?: number // Maximum height for virtualized grid
  itemsPerRow?: number // Number of items per row
  showPerformanceInfo?: boolean // Show performance debug info (dev mode)
}

/**
 * Adaptive emoji grid that automatically chooses the best rendering strategy
 * based on data size, device capabilities, and performance considerations
 */
export default function AdaptiveEmojiGrid({
  forceVirtualized = false,
  forceRegular = false,
  maxHeight = 800,
  itemsPerRow,
  showPerformanceInfo = false
}: AdaptiveEmojiGridProps) {
  const { shouldUseVirtualized, totalItems, config } = useSmartGrid({
    virtualizedThreshold: 50,
    maxHeight,
    itemsPerRow
  })

  const performanceMetrics = useGridPerformance()
  const { tier: animationTier, deviceMemory, hardwareConcurrency } = useAnimationTier()

  // Determine which grid to use based on multiple factors
  const useVirtualized = React.useMemo(() => {
    // Forced modes
    if (forceVirtualized) return true
    if (forceRegular) return false

    // Performance-based decision
    let shouldVirtualize = shouldUseVirtualized

    // Consider device capabilities
    if (animationTier === 'low') {
      // Lower-end devices benefit from virtualization at smaller thresholds
      shouldVirtualize = totalItems > 20
    } else if (animationTier === 'high') {
      // High-end devices can handle more items without virtualization
      shouldVirtualize = totalItems > 100
    }

    // Memory considerations - use actual device memory if available
    const memoryThreshold = deviceMemory ? deviceMemory < 4 : performanceMetrics.estimatedMemoryMB > 2
    if (memoryThreshold) {
      shouldVirtualize = true
    }

    // CPU considerations - fewer cores benefit from virtualization
    if (hardwareConcurrency && hardwareConcurrency < 4 && totalItems > 30) {
      shouldVirtualize = true
    }

    return shouldVirtualize
  }, [
    forceVirtualized,
    forceRegular,
    shouldUseVirtualized,
    totalItems,
    animationTier,
    deviceMemory,
    hardwareConcurrency,
    performanceMetrics.estimatedMemoryMB
  ])

  // Performance debugging info (only in development)
  React.useEffect(() => {
    if (showPerformanceInfo && process.env.NODE_ENV === 'development') {
      console.log('🎯 Adaptive Grid Performance Metrics:', {
        totalItems,
        useVirtualized,
        animationTier,
        deviceMemory,
        hardwareConcurrency,
        estimatedMemoryMB: performanceMetrics.estimatedMemoryMB,
        performanceScore: performanceMetrics.performanceScore,
        recommendations: performanceMetrics.recommendations
      })
    }
  }, [showPerformanceInfo, totalItems, useVirtualized, animationTier, deviceMemory, hardwareConcurrency, performanceMetrics])

  // Render the appropriate grid component
  if (useVirtualized) {
    return (
      <VirtualizedEmojiGrid
        maxHeight={maxHeight}
        itemsPerRow={itemsPerRow}
        showSeeMore={true}
      />
    )
  }

  return <EmojiGrid />
}

// Export performance hook for other components
export { useGridPerformance }