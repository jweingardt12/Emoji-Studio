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
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing) return
    
    // Only trigger if we're at the top of the page
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [enabled, isRefreshing])
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || isRefreshing || startY.current === 0) return
    
    currentY.current = e.touches[0].clientY
    const distance = currentY.current - startY.current
    
    // Only pull down, not up
    if (distance > 0 && window.scrollY === 0) {
      e.preventDefault()
      setIsPulling(true)
      // Apply resistance to the pull
      const resistedDistance = Math.min(distance * 0.5, 150)
      setPullDistance(resistedDistance)
    }
  }, [enabled, isRefreshing])
  
  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !isPulling) return
    
    const distance = currentY.current - startY.current
    
    if (distance > threshold) {
      setIsRefreshing(true)
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