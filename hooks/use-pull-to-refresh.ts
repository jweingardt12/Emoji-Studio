"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  enabled?: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const startY = useRef(0)
  const currentY = useRef(0)
  const lastRefreshTime = useRef(0)
  const minRefreshInterval = 5000 // Minimum 5 seconds between refreshes
  const initialTouchTime = useRef(0)
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return
    
    // Only trigger if we're at the very top of the page
    // and the touch starts in the upper portion of the screen
    if (window.scrollY === 0 && e.touches[0].clientY < window.innerHeight * 0.3) {
      startY.current = e.touches[0].clientY
      initialTouchTime.current = Date.now()
    }
  }, [enabled, isRefreshing])
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing || startY.current === 0) return
    
    currentY.current = e.touches[0].clientY
    const distance = currentY.current - startY.current
    
    // Require minimum pull distance before activating (reduces accidental triggers)
    const minActivationDistance = 20
    
    // Only pull down, not up, and require minimum distance
    if (distance > minActivationDistance && window.scrollY === 0) {
      // Check if the gesture is slow enough (not a quick flick)
      const timeDiff = Date.now() - initialTouchTime.current
      const velocity = distance / timeDiff
      
      // If moving too fast (likely scrolling), don't trigger pull to refresh
      if (velocity > 0.5) {
        return
      }
      
      e.preventDefault()
      setIsPulling(true)
      // Apply more resistance to the pull
      const resistedDistance = Math.min((distance - minActivationDistance) * 0.3, 150)
      setPullDistance(resistedDistance)
    }
  }, [enabled, isRefreshing])
  
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling) return
    
    const distance = currentY.current - startY.current
    
    if (distance > threshold) {
      // Check if enough time has passed since last refresh
      const now = Date.now()
      if (now - lastRefreshTime.current < minRefreshInterval) {
        // Too soon, don't refresh
        setIsPulling(false)
        setPullDistance(0)
        startY.current = 0
        currentY.current = 0
        return
      }
      
      setIsRefreshing(true)
      lastRefreshTime.current = now
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
      
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setIsPulling(false)
    setPullDistance(0)
    startY.current = 0
    currentY.current = 0
    initialTouchTime.current = 0
  }, [enabled, isPulling, threshold, onRefresh])
  
  useEffect(() => {
    if (!enabled) return
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])
  
  return {
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress: Math.min(pullDistance / threshold, 1)
  }
}