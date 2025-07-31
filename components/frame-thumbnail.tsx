"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ExtractedFrame } from "@/lib/utils/gif-frame-extractor"
import type { VideoFrame } from "@/lib/utils/video-frame-extractor"
import { globalCanvasPool } from "@/lib/utils/canvas-pool"

type FrameData = ExtractedFrame | VideoFrame

interface FrameThumbnailProps {
  frame: FrameData
  index: number
  isSelected: boolean
  isHovered: boolean
  isPreviewing: boolean
  size: number
  onToggle: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  canSelect: boolean
}

// Global cache for frame thumbnails
const thumbnailCache = new Map<string, string>()

export function FrameThumbnail({
  frame,
  index,
  isSelected,
  isHovered,
  isPreviewing,
  size,
  onToggle,
  onMouseEnter,
  onMouseLeave,
  canSelect
}: FrameThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
  const observerRef = useRef<IntersectionObserver | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create a unique cache key for this frame
  const cacheKey = `frame-${index}-${size}`

  useEffect(() => {
    // Set up intersection observer for lazy loading
    if (!containerRef.current) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            // Once visible, we can disconnect the observer
            observerRef.current?.disconnect()
          }
        })
      },
      {
        rootMargin: '100px' // Start loading 100px before the element comes into view
      }
    )

    observerRef.current.observe(containerRef.current)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!isVisible || !frame) return

    // Check cache first
    const cached = thumbnailCache.get(cacheKey)
    if (cached) {
      setThumbnailUrl(cached)
      return
    }

    // Render the frame to canvas
    const renderFrame = async () => {
      if (!canvasRef.current) return
      
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) return

      // Set canvas size to match the thumbnail size for efficiency
      canvas.width = size
      canvas.height = size

      // Get a temporary canvas from the pool
      const tempCanvas = globalCanvasPool.acquire(frame.data.width, frame.data.height)
      const tempCtx = tempCanvas.getContext('2d', { alpha: false })
      if (!tempCtx) {
        globalCanvasPool.release(tempCanvas)
        return
      }

      tempCtx.putImageData(frame.data, 0, 0)

      // Clear with white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, size, size)

      // Scale and center the frame
      const scale = Math.min(size / tempCanvas.width, size / tempCanvas.height) * 0.9 // 90% to add padding
      const scaledWidth = tempCanvas.width * scale
      const scaledHeight = tempCanvas.height * scale
      const offsetX = (size - scaledWidth) / 2
      const offsetY = (size - scaledHeight) / 2

      ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)

      // Convert to data URL and cache it
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7) // Use JPEG for smaller size
      thumbnailCache.set(cacheKey, dataUrl)
      setThumbnailUrl(dataUrl)
      
      // Release the temporary canvas back to the pool
      globalCanvasPool.release(tempCanvas)
    }

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(renderFrame)
    } else {
      setTimeout(renderFrame, 0)
    }
  }, [isVisible, frame, index, size, cacheKey])

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative cursor-pointer transition-all duration-200 rounded-lg overflow-hidden",
        "hover:scale-105 hover:shadow-lg",
        isSelected && "ring-4 ring-primary ring-offset-2",
        isPreviewing && "ring-4 ring-yellow-500 ring-offset-2"
      )}
      style={{ width: size, height: size }}
      onClick={onToggle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Hidden canvas for rendering */}
      <canvas
        ref={canvasRef}
        className="hidden"
        width={size}
        height={size}
      />
      
      {/* Display the cached thumbnail or placeholder */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={`Frame ${index + 1}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-muted animate-pulse" />
      )}
      
      {/* Frame number */}
      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
        {index + 1}
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      
      {/* Hover overlay */}
      {isHovered && !isSelected && canSelect && (
        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-2">
            <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility function to clear the cache when needed
export function clearThumbnailCache() {
  thumbnailCache.clear()
  globalCanvasPool.clear()
}