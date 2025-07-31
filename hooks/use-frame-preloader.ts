import { useEffect, useRef } from 'react'
import type { ExtractedFrame } from '@/lib/utils/gif-frame-extractor'
import type { VideoFrame } from '@/lib/utils/video-frame-extractor'

type FrameData = ExtractedFrame | VideoFrame

interface UseFramePreloaderOptions {
  frames: FrameData[]
  visibleIndices: Set<number>
  preloadRadius?: number
  enabled?: boolean
}

// Cache for preloaded frame data URLs
const preloadCache = new Map<string, string>()

export function useFramePreloader({
  frames,
  visibleIndices,
  preloadRadius = 10,
  enabled = true
}: UseFramePreloaderOptions) {
  const preloadQueueRef = useRef<Set<number>>(new Set())
  const isPreloadingRef = useRef(false)
  
  useEffect(() => {
    if (!enabled || frames.length === 0 || visibleIndices.size === 0) return
    
    // Calculate indices to preload
    const indicesToPreload = new Set<number>()
    
    visibleIndices.forEach(index => {
      // Add indices around visible ones
      for (let i = Math.max(0, index - preloadRadius); i <= Math.min(frames.length - 1, index + preloadRadius); i++) {
        indicesToPreload.add(i)
      }
    })
    
    // Remove already visible indices
    visibleIndices.forEach(index => indicesToPreload.delete(index))
    
    // Update preload queue
    preloadQueueRef.current = indicesToPreload
    
    // Start preloading if not already running
    if (!isPreloadingRef.current && indicesToPreload.size > 0) {
      isPreloadingRef.current = true
      preloadFrames()
    }
  }, [frames, visibleIndices, preloadRadius, enabled])
  
  const preloadFrames = async () => {
    const queue = Array.from(preloadQueueRef.current)
    
    for (const index of queue) {
      // Check if still in queue (might have been removed)
      if (!preloadQueueRef.current.has(index)) continue
      
      const frame = frames[index]
      if (!frame) continue
      
      const cacheKey = `frame-${index}`
      
      // Check if already cached
      if (preloadCache.has(cacheKey)) {
        preloadQueueRef.current.delete(index)
        continue
      }
      
      // Preload frame
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) continue
        
        canvas.width = 120 // Standard thumbnail size
        canvas.height = 120
        
        // Create temp canvas for frame data
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d', { alpha: false })
        if (!tempCtx) continue
        
        tempCanvas.width = frame.data.width
        tempCanvas.height = frame.data.height
        tempCtx.putImageData(frame.data, 0, 0)
        
        // Clear with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 120, 120)
        
        // Scale and draw
        const scale = Math.min(120 / tempCanvas.width, 120 / tempCanvas.height) * 0.9
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (120 - scaledWidth) / 2
        const offsetY = (120 - scaledHeight) / 2
        
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
        
        // Cache the result
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        preloadCache.set(cacheKey, dataUrl)
        
        // Remove from queue
        preloadQueueRef.current.delete(index)
        
        // Yield to avoid blocking
        await new Promise(resolve => setTimeout(resolve, 5))
      } catch (error) {
        console.error('Error preloading frame:', error)
        preloadQueueRef.current.delete(index)
      }
    }
    
    isPreloadingRef.current = false
  }
  
  return {
    getPreloadedFrame: (index: number): string | null => {
      return preloadCache.get(`frame-${index}`) || null
    },
    clearCache: () => {
      preloadCache.clear()
    }
  }
}

export function clearFramePreloadCache() {
  preloadCache.clear()
}