"use client"

import { useMemo } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

interface SmartGridConfig {
  virtualizedThreshold?: number // Number of items above which to use virtualized grid
  maxHeight?: number // Maximum height for virtualized grid
  itemsPerRow?: number // Fixed number of items per row (auto-calculated if not provided)
}

/**
 * Smart grid hook that automatically chooses between regular and virtualized grid
 * based on the number of emoji items and performance considerations
 */
export function useSmartGrid(config: SmartGridConfig = {}) {
  const {
    virtualizedThreshold = 50, // Default: use virtualization for 50+ items
    maxHeight = 800,
    itemsPerRow
  } = config

  const { emojiData } = useEmojiData()

  const gridMetrics = useMemo(() => {
    // Filter out aliases to get actual emoji count
    const filteredEmojis = emojiData.filter(emoji => !emoji.is_alias)
    const totalItems = filteredEmojis.length

    return {
      totalItems,
      shouldUseVirtualized: totalItems > virtualizedThreshold,
      filteredEmojis
    }
  }, [emojiData, virtualizedThreshold])

  return {
    ...gridMetrics,
    config: {
      maxHeight,
      itemsPerRow,
      showSeeMore: true
    }
  }
}

/**
 * Hook for performance monitoring - tracks render performance metrics
 */
export function useGridPerformance() {
  const { emojiData } = useEmojiData()

  const performanceMetrics = useMemo(() => {
    const totalItems = emojiData.length
    const filteredItems = emojiData.filter(emoji => !emoji.is_alias).length

    // Estimate memory usage (rough calculation)
    const avgEmojiSize = 200 // bytes per emoji object
    const estimatedMemoryMB = (totalItems * avgEmojiSize) / (1024 * 1024)

    // Performance recommendations
    const recommendations = []
    if (filteredItems > 100) {
      recommendations.push("Consider using virtualized grid for better performance")
    }
    if (estimatedMemoryMB > 5) {
      recommendations.push("Large dataset detected - implement pagination")
    }
    if (totalItems > 500) {
      recommendations.push("Consider implementing search/filtering to reduce visible items")
    }

    return {
      totalItems,
      filteredItems,
      estimatedMemoryMB,
      recommendations,
      performanceScore: Math.max(0, 100 - (filteredItems / 10)) // Simple scoring system
    }
  }, [emojiData])

  return performanceMetrics
}