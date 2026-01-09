"use client"

import { useState, useEffect, useCallback } from "react"

/**
 * Hook that listens for emojiDataUpdated events and provides state for
 * triggering page refreshes with subtle fade animations.
 *
 * Usage:
 * ```tsx
 * const { isRefreshing } = useDataRefresh()
 *
 * return (
 *   <div className={cn(
 *     "transition-opacity duration-200",
 *     isRefreshing ? "opacity-60" : "opacity-100"
 *   )}>
 *     {content}
 *   </div>
 * )
 * ```
 */
export function useDataRefresh() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const handleEmojiDataUpdated = () => {
      // Start the refresh animation
      setIsRefreshing(true)
      // Increment key to force re-renders if needed
      setRefreshKey(prev => prev + 1)
      // Reset after animation completes (300ms matches typical fade duration)
      setTimeout(() => setIsRefreshing(false), 300)
    }

    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated)
    return () => window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated)
  }, [])

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return { refreshKey, isRefreshing, triggerRefresh }
}
