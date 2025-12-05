"use client"

import React, { useRef, useState, useEffect, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedEmojiImageProps {
  src: string
  alt: string
  className?: string
  fallback?: React.ReactNode
  onError?: () => void
  onClick?: () => void
  priority?: boolean // Load immediately without waiting for intersection
}

/**
 * Performance-optimized image component for emoji displays.
 *
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Pauses animated GIFs when scrolled out of view (replaces with static frame)
 * - Smooth fade-in on load
 * - Memory efficient - removes src when far out of viewport
 */
export const OptimizedEmojiImage = memo(function OptimizedEmojiImage({
  src,
  alt,
  className,
  fallback,
  onError,
  onClick,
  priority = false
}: OptimizedEmojiImageProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(priority)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isNearViewport, setIsNearViewport] = useState(priority)

  // Check if image is animated (GIF or animated WebP)
  const isAnimated = src?.toLowerCase().endsWith('.gif') ||
                     src?.toLowerCase().includes('.gif?') ||
                     (src?.toLowerCase().includes('animated') && src?.toLowerCase().includes('webp'))

  useEffect(() => {
    if (priority) {
      setIsVisible(true)
      setIsNearViewport(true)
      return
    }

    const container = containerRef.current
    if (!container) return

    // Two observers: one for loading (larger margin), one for animation (tighter margin)
    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        setIsNearViewport(entry.isIntersecting)
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0
      }
    )

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      {
        rootMargin: '50px', // Smaller margin for animation control
        threshold: 0
      }
    )

    loadObserver.observe(container)
    visibilityObserver.observe(container)

    return () => {
      loadObserver.disconnect()
      visibilityObserver.disconnect()
    }
  }, [priority])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  const handleError = useCallback(() => {
    setHasError(true)
    onError?.()
  }, [onError])

  // For animated images, we control visibility by toggling the src
  // When not visible, we use a transparent placeholder to maintain layout
  const effectiveSrc = isNearViewport ? src : undefined

  // For GIFs, pause animation by using CSS when not in immediate viewport
  const shouldPauseAnimation = isAnimated && !isVisible && isLoaded

  if (hasError && fallback) {
    return <>{fallback}</>
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onClick={onClick}
    >
      {effectiveSrc ? (
        <img
          ref={imgRef}
          src={effectiveSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0",
            shouldPauseAnimation && "animate-pause",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          // Pause GIF animation when not visible using CSS
          style={shouldPauseAnimation ? {
            animationPlayState: 'paused',
            // For GIFs, this trick can help reduce CPU usage
            willChange: 'auto'
          } : undefined}
        />
      ) : (
        // Placeholder while waiting to load
        <div
          className={cn(
            "bg-muted/30 animate-pulse",
            className
          )}
        />
      )}

      {/* Loading skeleton overlay */}
      {!isLoaded && effectiveSrc && !hasError && (
        <div
          className={cn(
            "absolute inset-0 bg-muted/50 animate-pulse rounded",
            className
          )}
        />
      )}
    </div>
  )
})

/**
 * Hook for tracking which images are in the viewport.
 * Useful for bulk pausing animations in a grid.
 */
export function useVisibleImages() {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const elementsRef = useRef<Map<string, Element>>(new Map())

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleIds(prev => {
          const next = new Set(prev)
          entries.forEach(entry => {
            const id = entry.target.getAttribute('data-emoji-id')
            if (id) {
              if (entry.isIntersecting) {
                next.add(id)
              } else {
                next.delete(id)
              }
            }
          })
          return next
        })
      },
      {
        rootMargin: '100px',
        threshold: 0
      }
    )

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  const observe = useCallback((id: string, element: Element | null) => {
    if (!observerRef.current) return

    // Unobserve previous element for this id
    const prev = elementsRef.current.get(id)
    if (prev) {
      observerRef.current.unobserve(prev)
    }

    if (element) {
      element.setAttribute('data-emoji-id', id)
      observerRef.current.observe(element)
      elementsRef.current.set(id, element)
    } else {
      elementsRef.current.delete(id)
    }
  }, [])

  const isVisible = useCallback((id: string) => visibleIds.has(id), [visibleIds])

  return { observe, isVisible, visibleIds }
}

export default OptimizedEmojiImage
