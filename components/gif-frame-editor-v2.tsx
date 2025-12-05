"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Film, 
  Play, 
  Pause, 
  Loader2,
  AlertCircle,
  Sparkles,
  X,
  Shuffle,
  Grid3X3
} from "lucide-react"
import { GifFrameExtractor, ExtractedFrame } from "@/lib/utils/gif-frame-extractor"
import { VideoFrameExtractor, VideoFrame } from "@/lib/utils/video-frame-extractor"
import { cn } from "@/lib/utils"
import { FrameThumbnail, clearThumbnailCache } from "./frame-thumbnail"
import { useDebounce } from "@/hooks/use-debounce"
import { VirtualFrameGrid } from "./virtual-frame-grid"
import { globalCanvasPool } from "@/lib/utils/canvas-pool"
import { ImprovedGIFEncoder, getOptimalGIFSettings } from "@/lib/utils/improved-gif-encoder"

interface GifFrameEditorProps {
  file: File
  isOpen: boolean
  onClose: () => void
  onExport: (blob: Blob, selectedFrames: number[], speedMultiplier: number) => void
}

type FrameData = ExtractedFrame | VideoFrame

export function GifFrameEditorV2({ file, isOpen, onClose, onExport }: GifFrameEditorProps) {
  const [frames, setFrames] = useState<FrameData[]>([])
  const [isVideo, setIsVideo] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const [quality, setQuality] = useState(1)
  const [targetSize, setTargetSize] = useState(128)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [frameSize, setFrameSize] = useState(120)
  const [exportProgress, setExportProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(5) // Default to 5x speed
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
  const [allFramesLoaded, setAllFramesLoaded] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionMessage, setExtractionMessage] = useState('')
  const [frameSelectionMode, setFrameSelectionMode] = useState<'magic' | 'everyN'>('magic')
  const [everyNthFrame, setEveryNthFrame] = useState(2)
  
  // Scaling mode: 'fit' maintains aspect ratio with padding, 'fill' crops to fill, 'stretch' distorts to fill
  const [scaleMode, setScaleMode] = useState<'fit' | 'fill' | 'stretch'>('fill')
  
  // Debounce frame size for performance
  const debouncedFrameSize = useDebounce(frameSize, 300)
  
  const animationFrameRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const desktopPreviewCanvasRef = useRef<HTMLCanvasElement>(null)
  const mobilePreviewCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameGridContainerRef = useRef<HTMLDivElement>(null)
  const previewPlayingRef = useRef(false)
  const lastFrameTimeRef = useRef(0)
  const currentFrameIndexRef = useRef(0)

  useEffect(() => {
    if (isOpen && file) {
      // Reset state when opening
      setAllFramesLoaded(false)
      setFrames([])
      setSelectedIndices(new Set())
      setLoadError(null)
      setCurrentPreviewIndex(0)
      setPreviewPlaying(false)
      loadFrames()
    }
    return () => {
      stopPreview()
      // Clear thumbnail cache when component unmounts
      clearThumbnailCache()
    }
  }, [file, isOpen])

  // Set up resize observer for container dimensions
  useEffect(() => {
    if (!frameGridContainerRef.current) return
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setContainerDimensions({ width, height })
      }
    })
    
    resizeObserver.observe(frameGridContainerRef.current)
    
    return () => {
      resizeObserver.disconnect()
    }
  }, [isOpen])

  // Render first frame when preview opens
  useEffect(() => {
    if (showPreview && selectedIndices.size > 0 && frames.length > 0) {
      const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b)
      if (sortedIndices.length > 0) {
        // Small delay to ensure canvas is mounted
        const timer = setTimeout(() => {
          renderFrameToCanvas(sortedIndices[0])
        }, 100)
        return () => clearTimeout(timer)
      }
    }
  }, [showPreview, selectedIndices, frames.length])

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isExporting) {
        e.preventDefault()
        if (previewPlayingRef.current) {
          stopPreview()
        } else {
          startPreview()
        }
      } else if (e.key === 'Enter' && !isExporting && selectedIndices.size > 0) {
        e.preventDefault()
        exportGif()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isExporting, selectedIndices.size])

  const loadFrames = async () => {
    setIsLoading(true)
    setLoadError(null)
    setIsVideo(file.type.startsWith('video/'))
    setExtractionProgress(0)
    setExtractionMessage('')
    
    try {
      let extractedFrames: FrameData[]
      
      if (file.type.startsWith('video/')) {
        console.log('Extracting frames from video...')
        extractedFrames = await VideoFrameExtractor.extractFrames(file, 10, (progress, message) => {
          setExtractionProgress(progress)
          setExtractionMessage(message || '')
        })
      } else {
        extractedFrames = await GifFrameExtractor.extractFrames(file, (progress, message) => {
          setExtractionProgress(progress)
          setExtractionMessage(message || '')
        })
      }
      
      // Set all frames at once
      setFrames(extractedFrames)
      setAllFramesLoaded(true)
      
      // Apply frame selection
      if (extractedFrames.length <= 50) {
        // Select all if 50 or fewer
        setSelectedIndices(new Set(Array.from({ length: extractedFrames.length }, (_, i) => i)))
      } else {
        // Use magic selection by default for large GIFs
        const selectedSet = new Set<number>()
        const step = (extractedFrames.length - 1) / 49
        for (let i = 0; i < 50; i++) {
          selectedSet.add(Math.round(i * step))
        }
        setSelectedIndices(selectedSet)
      }
    } catch (error) {
      console.error("Failed to extract frames:", error)
      const errorMessage = error instanceof Error ? error.message : 
        (isVideo ? 'Failed to extract frames from video' : 'Failed to extract frames from GIF')
      setLoadError(errorMessage)
      setAllFramesLoaded(false)
      
      // Close quickly for skip errors
      if (errorMessage.includes('SKIP_FRAME_EDITOR') || 
          errorMessage.includes('No frames found')) {
        setTimeout(() => {
          onClose()
        }, 500)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFrame = (index: number) => {
    setSelectedIndices(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(index)) {
        newSelected.delete(index)
      } else if (newSelected.size < 50) {
        newSelected.add(index)
      }
      
      // If preview is open, render first frame of new selection
      if (showPreview && newSelected.size > 0) {
        const firstFrame = Array.from(newSelected).sort((a, b) => a - b)[0]
        renderFrameToCanvas(firstFrame)
      }
      
      return newSelected
    })
  }

  const smartSelection = () => {
    const newSelected = new Set<number>()
    
    if (frameSelectionMode === 'magic') {
      // Evenly distribute 50 frames across the entire animation
      const step = (frames.length - 1) / 49
      for (let i = 0; i < 50; i++) {
        newSelected.add(Math.round(i * step))
      }
    } else {
      // Every Nth frame
      for (let i = 0; i < frames.length && newSelected.size < 50; i += everyNthFrame) {
        newSelected.add(i)
      }
    }
    
    setSelectedIndices(newSelected)
    
    // If preview is open, render first frame
    if (showPreview && newSelected.size > 0) {
      const firstFrame = Array.from(newSelected).sort((a, b) => a - b)[0]
      renderFrameToCanvas(firstFrame)
    }
  }


  const renderFrameToCanvas = (frameIndex: number) => {
    if (!frames[frameIndex]) {
      return
    }
    
    const frame = frames[frameIndex]
    
    // Get available canvases
    const desktopCanvas = desktopPreviewCanvasRef.current
    const mobileCanvas = mobilePreviewCanvasRef.current
    
    // Function to render to a single canvas
    const renderToCanvas = (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d', { alpha: true })
      if (!ctx) return
      
      // Clear canvas with white background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, targetSize, targetSize)
      
      // Create temp canvas for frame data
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frame.data.width
      tempCanvas.height = frame.data.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return
      
      // Put frame data
      tempCtx.putImageData(frame.data, 0, 0)
      
      // Apply scaling based on mode
      if (scaleMode === 'stretch') {
        // Stretch to fill entire target size (may distort)
        ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize)
      } else if (scaleMode === 'fill') {
        // Scale to fill (crop to fit) - no white bars
        const scale = Math.max(targetSize / tempCanvas.width, targetSize / tempCanvas.height)
        const scaledWidth = Math.round(tempCanvas.width * scale)
        const scaledHeight = Math.round(tempCanvas.height * scale)
        const offsetX = Math.round((targetSize - scaledWidth) / 2)
        const offsetY = Math.round((targetSize - scaledHeight) / 2)
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
      } else {
        // Scale to fit while maintaining aspect ratio (may have white bars)
        const scale = Math.min(targetSize / tempCanvas.width, targetSize / tempCanvas.height)
        const scaledWidth = Math.round(tempCanvas.width * scale)
        const scaledHeight = Math.round(tempCanvas.height * scale)
        const offsetX = Math.round((targetSize - scaledWidth) / 2)
        const offsetY = Math.round((targetSize - scaledHeight) / 2)
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
      }
      
      // Clean up
      tempCanvas.width = 0
      tempCanvas.height = 0
    }
    
    // Render to both canvases
    if (desktopCanvas) renderToCanvas(desktopCanvas)
    if (mobileCanvas) renderToCanvas(mobileCanvas)
    
    // Also update Slack preview canvases
    const messageCanvas = document.getElementById('v2-message-preview') as HTMLCanvasElement
    const reactionCanvas = document.getElementById('v2-reaction-preview') as HTMLCanvasElement
    
    if (messageCanvas || reactionCanvas) {
      // Create temp canvas for Slack previews
      const slackCanvas = document.createElement('canvas')
      slackCanvas.width = frame.data.width
      slackCanvas.height = frame.data.height
      const slackCtx = slackCanvas.getContext('2d')
      if (slackCtx) {
        slackCtx.putImageData(frame.data, 0, 0)
        
        if (messageCanvas) {
          const msgCtx = messageCanvas.getContext('2d')
          if (msgCtx) {
            msgCtx.imageSmoothingEnabled = false
            msgCtx.fillStyle = 'white'
            msgCtx.fillRect(0, 0, 64, 64)
            
            // Apply same scale mode as main preview
            if (scaleMode === 'stretch') {
              msgCtx.drawImage(slackCanvas, 0, 0, 64, 64)
            } else if (scaleMode === 'fill') {
              const scale = Math.max(64 / slackCanvas.width, 64 / slackCanvas.height)
              const scaledWidth = Math.round(slackCanvas.width * scale)
              const scaledHeight = Math.round(slackCanvas.height * scale)
              const offsetX = Math.round((64 - scaledWidth) / 2)
              const offsetY = Math.round((64 - scaledHeight) / 2)
              msgCtx.drawImage(slackCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            } else {
              const scale = Math.min(64 / slackCanvas.width, 64 / slackCanvas.height)
              const scaledWidth = Math.round(slackCanvas.width * scale)
              const scaledHeight = Math.round(slackCanvas.height * scale)
              const offsetX = Math.round((64 - scaledWidth) / 2)
              const offsetY = Math.round((64 - scaledHeight) / 2)
              msgCtx.drawImage(slackCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            }
          }
        }
        
        if (reactionCanvas) {
          const reactCtx = reactionCanvas.getContext('2d')
          if (reactCtx) {
            reactCtx.imageSmoothingEnabled = false
            reactCtx.fillStyle = 'white'
            reactCtx.fillRect(0, 0, 16, 16)
            
            // Apply same scale mode as main preview
            if (scaleMode === 'stretch') {
              reactCtx.drawImage(slackCanvas, 0, 0, 16, 16)
            } else if (scaleMode === 'fill') {
              const scale = Math.max(16 / slackCanvas.width, 16 / slackCanvas.height)
              const scaledWidth = Math.round(slackCanvas.width * scale)
              const scaledHeight = Math.round(slackCanvas.height * scale)
              const offsetX = Math.round((16 - scaledWidth) / 2)
              const offsetY = Math.round((16 - scaledHeight) / 2)
              reactCtx.drawImage(slackCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            } else {
              const scale = Math.min(16 / slackCanvas.width, 16 / slackCanvas.height)
              const scaledWidth = Math.round(slackCanvas.width * scale)
              const scaledHeight = Math.round(slackCanvas.height * scale)
              const offsetX = Math.round((16 - scaledWidth) / 2)
              const offsetY = Math.round((16 - scaledHeight) / 2)
              reactCtx.drawImage(slackCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            }
          }
        }
      }
    }
  }

  const startPreview = () => {
    if (selectedIndices.size === 0 || !allFramesLoaded) return
    
    // Show preview if not already shown
    if (!showPreview) {
      setShowPreview(true)
    }
    
    setPreviewPlaying(true)
    previewPlayingRef.current = true
    
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b)
    currentFrameIndexRef.current = 0
    lastFrameTimeRef.current = performance.now()
    
    const animate = (currentTime: number) => {
      if (!previewPlayingRef.current) return
      
      const frameIndex = sortedIndices[currentFrameIndexRef.current]
      const frame = frames[frameIndex]
      if (!frame) return
      
      const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
      const targetDelay = Math.max(20, baseDelay / speedMultiplier)
      
      if (currentTime - lastFrameTimeRef.current >= targetDelay) {
        setCurrentPreviewIndex(frameIndex)
        renderFrameToCanvas(frameIndex)
        
        currentFrameIndexRef.current = (currentFrameIndexRef.current + 1) % sortedIndices.length
        lastFrameTimeRef.current = currentTime
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    // Render first frame immediately
    if (sortedIndices.length > 0) {
      renderFrameToCanvas(sortedIndices[0])
      setCurrentPreviewIndex(sortedIndices[0])
    }
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate)
  }

  const stopPreview = () => {
    setPreviewPlaying(false)
    previewPlayingRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }
  
  // Restart preview when settings change
  useEffect(() => {
    if (previewPlaying && frames.length > 0) {
      stopPreview()
      startPreview()
    }
  }, [speedMultiplier, selectedIndices])
  
  // Apply selection when mode or everyNthFrame changes
  useEffect(() => {
    if (frames.length > 50) {
      smartSelection()
    }
  }, [frameSelectionMode, everyNthFrame])

  const exportGif = async (indices?: Set<number>) => {
    const selectedToExport = indices || selectedIndices
    if (selectedToExport.size === 0) return
    
    // Ensure frames are loaded
    if (!allFramesLoaded || !frames || frames.length === 0) {
      console.error('Frames not ready yet. allFramesLoaded:', allFramesLoaded, 'frames.length:', frames.length)
      setLoadError('Please wait for frames to finish loading.')
      return
    }
    
    setIsExporting(true)
    try {
      const sortedIndices = Array.from(selectedToExport).sort((a, b) => a - b)
      let selectedFrames = sortedIndices
        .filter(i => i >= 0 && i < frames.length && frames[i])
        .map(i => frames[i])
      
      if (selectedFrames.length === 0) {
        console.error('No valid frames selected. Indices:', sortedIndices, 'Frames length:', frames.length)
        // Show error to user
        setLoadError('No frames available. Please try reloading the file.')
        setIsExporting(false)
        return
      }
      
      // Ensure we meet Slack requirements
      const MAX_FILE_SIZE = 128 * 1024 // 128KB
      const MAX_DIMENSION = 128 // 128x128 pixels
      
      let currentQuality = quality || 10
      let framesToUse = selectedFrames
      let outputBlob: Blob | null = null
      
      // Try different optimization strategies until we meet requirements
      const strategies = [
        { quality: currentQuality, frameSkip: 1 },     // All frames, user quality
        { quality: 10, frameSkip: 1 },                 // All frames, best quality
        { quality: 20, frameSkip: 1 },                 // All frames, good quality
        { quality: 30, frameSkip: 2 },                 // Every other frame
        { quality: 40, frameSkip: 3 },                 // Every third frame
        { quality: 50, frameSkip: 4 },                 // Every fourth frame
        { quality: 60, frameSkip: 5 },                 // Every fifth frame
        { quality: 80, frameSkip: 8 },                 // Every 8th frame
        { quality: 100, frameSkip: 10 },               // Every 10th frame
        { quality: 100, frameSkip: 15 },               // Every 15th frame
        { quality: 100, frameSkip: 20 },               // Every 20th frame
        { quality: 100, frameSkip: 25 },               // Last resort - very few frames
      ]
      
      for (const strategy of strategies) {
        console.log(`Trying strategy: quality=${strategy.quality}, frameSkip=${strategy.frameSkip}`)
        
        // Apply frame skipping
        if (strategy.frameSkip > 1) {
          framesToUse = selectedFrames.filter((_, idx) => idx % strategy.frameSkip === 0)
        } else {
          framesToUse = selectedFrames
        }
        
        // Ensure we have at least 2 frames for animation
        if (framesToUse.length < 2 && selectedFrames.length >= 2) {
          framesToUse = [selectedFrames[0], selectedFrames[selectedFrames.length - 1]]
        }
        
        const gif = new ImprovedGIFEncoder({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          quality: strategy.quality,
          workers: 2,
          dither: strategy.quality <= 20
        })
        
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = MAX_DIMENSION
        canvas.height = MAX_DIMENSION
        
        for (let i = 0; i < framesToUse.length; i++) {
          const frame = framesToUse[i]
          if (!frame || !frame.data) continue
          
          setExportProgress(Math.round((i / framesToUse.length) * 50))
          
          // Clear with white background
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, MAX_DIMENSION, MAX_DIMENSION)
          
          const tempCanvas = globalCanvasPool.acquire(frame.data.width, frame.data.height)
          const tempCtx = tempCanvas.getContext('2d')!
          tempCtx.putImageData(frame.data, 0, 0)
          
          // Apply scaling based on mode
          if (scaleMode === 'stretch') {
            // Stretch to fill entire MAX_DIMENSION (may distort)
            ctx.drawImage(tempCanvas, 0, 0, MAX_DIMENSION, MAX_DIMENSION)
          } else if (scaleMode === 'fill') {
            // Scale to fill (crop to fit) - no white bars
            const scale = Math.max(MAX_DIMENSION / tempCanvas.width, MAX_DIMENSION / tempCanvas.height)
            const scaledWidth = tempCanvas.width * scale
            const scaledHeight = tempCanvas.height * scale
            const offsetX = (MAX_DIMENSION - scaledWidth) / 2
            const offsetY = (MAX_DIMENSION - scaledHeight) / 2
            ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
          } else {
            // Scale to fit while maintaining aspect ratio (may have white bars)
            const scale = Math.min(MAX_DIMENSION / tempCanvas.width, MAX_DIMENSION / tempCanvas.height)
            const scaledWidth = tempCanvas.width * scale
            const scaledHeight = tempCanvas.height * scale
            const offsetX = (MAX_DIMENSION - scaledWidth) / 2
            const offsetY = (MAX_DIMENSION - scaledHeight) / 2
            ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
          }
          
          const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
          const adjustedDelay = Math.max(20, Math.round(baseDelay / speedMultiplier))
          
          gif.addFrame(ctx, {
            delay: adjustedDelay,
            dispose: 1
          })
          
          globalCanvasPool.release(tempCanvas)
        }
        
        gif.onProgress((progress: number) => {
          setExportProgress(50 + Math.round(progress * 50))
        })
        
        outputBlob = await gif.render()
        
        console.log(`Generated GIF: ${outputBlob.size} bytes (limit: ${MAX_FILE_SIZE}), frames: ${framesToUse.length}`)
        
        if (outputBlob.size <= MAX_FILE_SIZE) {
          break // Success!
        }
      }
      
      if (!outputBlob) {
        throw new Error('Failed to create GIF')
      }
      
      if (outputBlob.size > MAX_FILE_SIZE) {
        console.warn(`Final GIF still exceeds size limit: ${outputBlob.size} bytes`)
        // Show warning to user
        setLoadError(`Warning: GIF is ${Math.round(outputBlob.size / 1024)}KB (Slack limit: 128KB). The emoji may not upload properly.`)
        setTimeout(() => setLoadError(null), 5000)
      }
      
      // Pass only the valid indices that were actually used
      const validIndices = sortedIndices.filter(i => i >= 0 && i < frames.length && frames[i])
      onExport(outputBlob, validIndices, speedMultiplier)
      onClose()
    } catch (error) {
      console.error('Failed to export GIF:', error)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  const renderFrame = (frame: FrameData, index: number) => {
    const isSelected = selectedIndices.has(index)
    const isHovered = hoveredIndex === index
    const isPreviewing = previewPlaying && currentPreviewIndex === index
    
    return (
      <FrameThumbnail
        key={index}
        frame={frame}
        index={index}
        isSelected={isSelected}
        isHovered={isHovered}
        isPreviewing={isPreviewing}
        size={debouncedFrameSize}
        onToggle={() => toggleFrame(index)}
        onMouseEnter={() => setHoveredIndex(index)}
        onMouseLeave={() => setHoveredIndex(null)}
        canSelect={selectedIndices.size < 50}
      />
    )
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] h-[85vh] flex flex-col sm:max-w-[95vw] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Select Frames for Your Emoji
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className={cn(
                "font-medium",
                selectedIndices.size === 50 && "text-amber-600"
              )}>
                {selectedIndices.size}/50 frames selected
              </span>
              {selectedIndices.size === 50 && (
                <span className="text-amber-600 text-xs">Maximum reached</span>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {isVideo ? 
              `We've extracted ${frames.length} frames from your video. Select up to 50 frames for your emoji.` :
              `Your GIF has ${frames.length} frames. Select up to 50 frames to include in the final emoji.`
            }
            {frames.length > 0 && (
              <span className="text-xs mt-1 block text-muted-foreground">
                Tip: Press <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Space</kbd> to preview, 
                <kbd className="px-1 py-0.5 text-xs bg-muted rounded ml-1">Enter</kbd> to create emoji
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Extracting frames from your {isVideo ? 'video' : 'GIF'}...
              </p>
              {extractionMessage && (
                <p className="text-xs text-muted-foreground">{extractionMessage}</p>
              )}
              <Progress className="w-48" value={extractionProgress || 0} />
            </div>
          </div>
        ) : loadError ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center space-y-2">
              <p className="font-semibold">Unable to Process File</p>
              <p className="text-sm text-muted-foreground max-w-md">{loadError}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3 px-1 flex-shrink-0">
              <div className="flex flex-col gap-3 flex-1">
                {frames.length > 50 && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={frameSelectionMode === 'magic' ? 'default' : 'outline'}
                        onClick={() => {
                          setFrameSelectionMode('magic')
                        }}
                        className="gap-2"
                        title="Evenly distribute 50 frames across the animation"
                      >
                        <Sparkles className="h-4 w-4" />
                        Magic Selection
                      </Button>
                      <Button
                        size="sm"
                        variant={frameSelectionMode === 'everyN' ? 'default' : 'outline'}
                        onClick={() => {
                          setFrameSelectionMode('everyN')
                        }}
                      >
                        Every Nth Frame
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIndices(new Set())
                          // Clear both canvases
                          const canvases = [desktopPreviewCanvasRef.current, mobilePreviewCanvasRef.current]
                          canvases.forEach(canvas => {
                            if (canvas) {
                              const ctx = canvas.getContext('2d')
                              if (ctx) {
                                ctx.fillStyle = 'white'
                                ctx.fillRect(0, 0, targetSize, targetSize)
                              }
                            }
                          })
                        }}
                      >
                        Clear All
                      </Button>
                    </div>
                    
                    {frameSelectionMode === 'everyN' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Select every</span>
                          <span className="font-medium">{everyNthFrame} frame{everyNthFrame > 1 ? 's' : ''}</span>
                        </div>
                        <Slider
                          value={[everyNthFrame]}
                          onValueChange={([v]) => {
                            setEveryNthFrame(v)
                            smartSelection()
                          }}
                          min={1}
                          max={Math.min(10, Math.floor(frames.length / 5))}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Every frame</span>
                          <span>Every {Math.min(10, Math.floor(frames.length / 5))} frames</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {frames.length <= 50 && (
                  <div className="text-sm text-muted-foreground">
                    Showing all {frames.length} frames
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Frame Size:</Label>
                  <Slider
                    value={[frameSize]}
                    onValueChange={([v]) => setFrameSize(v)}
                    min={80}
                    max={160}
                    step={10}
                    className="w-24"
                  />
                </div>
                
                <Button
                  size="sm"
                  variant={previewPlaying ? "destructive" : "default"}
                  onClick={previewPlaying ? stopPreview : startPreview}
                  disabled={selectedIndices.size === 0}
                  className="gap-2"
                >
                  {previewPlaying ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Stop Preview
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Preview GIF
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 flex gap-4">
              {/* Frame Grid */}
              <div 
                ref={frameGridContainerRef}
                className={cn(
                  "flex-1 min-h-0 rounded-lg border bg-muted/20 p-4",
                  showPreview && "lg:flex-[2]"
                )}
              >
                {containerDimensions.width > 0 && containerDimensions.height > 0 && frames.length > 100 ? (
                  // Use virtual scrolling for large frame counts
                  <VirtualFrameGrid
                    frames={frames}
                    selectedIndices={selectedIndices}
                    hoveredIndex={hoveredIndex}
                    previewPlaying={previewPlaying}
                    currentPreviewIndex={currentPreviewIndex}
                    frameSize={debouncedFrameSize}
                    onToggleFrame={toggleFrame}
                    onMouseEnter={setHoveredIndex}
                    onMouseLeave={() => setHoveredIndex(null)}
                    width={containerDimensions.width - 32} // Subtract padding
                    height={containerDimensions.height - 32}
                  />
                ) : (
                  // Use regular scrolling for smaller frame counts
                  <ScrollArea className="h-full">
                    <div 
                      ref={containerRef}
                      className="grid gap-3 justify-center pb-4"
                      style={{
                        gridTemplateColumns: `repeat(auto-fill, ${debouncedFrameSize}px)`,
                      }}
                    >
                      {frames.map((frame, index) => renderFrame(frame, index))}
                    </div>
                  </ScrollArea>
                )}
              </div>
              
              {/* Preview Panel */}
              {frames.length > 0 && (
                <div className={cn(
                  "hidden lg:flex lg:flex-1 flex-col gap-4 rounded-lg border bg-muted/20 p-4",
                  !showPreview && "opacity-50"
                )}>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-sm">Slack Emoji Preview</h3>
                    <p className="text-xs text-muted-foreground">
                      This is how your emoji will look in Slack
                    </p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-6 w-full max-w-sm">
                      {/* Actual size preview */}
                      <div className="text-center space-y-2">
                        <p className="text-xs text-muted-foreground">Actual Size (128×128)</p>
                        <div className="inline-block bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                          <canvas
                            ref={desktopPreviewCanvasRef}
                            width={targetSize}
                            height={targetSize}
                            className="pixelated"
                            style={{ 
                              imageRendering: 'pixelated',
                              width: `${targetSize}px`,
                              height: `${targetSize}px`
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Slack Context Previews */}
                      <div className="space-y-3 w-full">
                        <p className="text-xs text-muted-foreground text-center">In Slack</p>
                        
                        {/* Standalone Message */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border dark:border-gray-700 text-left">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              JD
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-semibold text-sm dark:text-gray-100">Jane Doe</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">2:34 PM</span>
                              </div>
                              <canvas 
                                id="v2-message-preview"
                                width={64} 
                                height={64} 
                                className="block"
                                style={{ imageRendering: 'pixelated' }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Reaction Context */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border dark:border-gray-700 text-left">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded bg-green-500 dark:bg-green-600 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                              JS
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-semibold text-sm dark:text-gray-100">John Smith</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">2:30 PM</span>
                              </div>
                              <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                                Woah. Have you seen Emoji Studio? Crazy how Slack won't build something like it.
                              </div>
                              <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 border border-gray-200 dark:border-gray-600">
                                <canvas 
                                  id="v2-reaction-preview"
                                  width={16} 
                                  height={16}
                                  style={{ imageRendering: 'pixelated' }}
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-300">3</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="text-xs text-muted-foreground space-y-1 text-center">
                        <p>Frames: {selectedIndices.size}</p>
                        <p>Size: {targetSize}×{targetSize}px</p>
                        <p>Quality: {quality}</p>
                        <p>Speed: {speedMultiplier}x</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile/Floating Preview */}
            {showPreview && (
              <div className="lg:hidden fixed bottom-4 right-4 z-50 bg-background rounded-lg shadow-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-medium">Preview</p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => setShowPreview(false)}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Close preview</span>
                  </Button>
                </div>
                <canvas
                  ref={mobilePreviewCanvasRef}
                  width={targetSize}
                  height={targetSize}
                  style={{ width: '100px', height: '100px' }}
                  className="bg-white rounded pixelated"
                />
              </div>
            )}

            {/* Preview & Export */}
            <div className="space-y-3 pt-3 flex-shrink-0 border-t">
              <div className="flex gap-6">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm">GIF Quality (1=Best, 10=Smallest)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[quality]}
                      onValueChange={([v]) => setQuality(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-8">{quality}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-adjusts to meet 128KB limit</p>
                </div>
                
                <div className="flex-1 space-y-2">
                  <Label className="text-sm">Output Size (Slack Maximum)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[128]}
                      min={128}
                      max={128}
                      disabled
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">128px (Fixed)</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  Speed 
                  <span className="text-xs text-muted-foreground">
                    ({speedMultiplier === 1 ? 'Normal' : speedMultiplier < 1 ? 'Slower' : 'Faster'})
                  </span>
                </Label>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeedMultiplier(0.5)}
                    className={cn("text-xs", speedMultiplier === 0.5 && "bg-accent")}
                  >
                    0.5x
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeedMultiplier(1)}
                    className={cn("text-xs", speedMultiplier === 1 && "bg-accent")}
                  >
                    1x
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeedMultiplier(2)}
                    className={cn("text-xs", speedMultiplier === 2 && "bg-accent")}
                  >
                    2x
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeedMultiplier(5)}
                    className={cn("text-xs", speedMultiplier === 5 && "bg-accent")}
                  >
                    5x
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeedMultiplier(10)}
                    className={cn("text-xs", speedMultiplier === 10 && "bg-accent")}
                  >
                    10x
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSpeedMultiplier(15)}
                    className={cn("text-xs", speedMultiplier === 15 && "bg-accent")}
                  >
                    15x
                  </Button>
                  <div className="text-xs text-muted-foreground ml-2">
                    Current: {speedMultiplier}x
                  </div>
                </div>
              </div>
              
              {/* Scale Mode */}
              <div className="space-y-2">
                <Label className="text-xs">Scale Mode</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={scaleMode === 'fit' ? 'default' : 'outline'}
                    onClick={() => setScaleMode('fit')}
                    className="flex-1"
                    title="Maintains aspect ratio, may have white bars"
                  >
                    Fit
                  </Button>
                  <Button
                    size="sm"
                    variant={scaleMode === 'fill' ? 'default' : 'outline'}
                    onClick={() => setScaleMode('fill')}
                    className="flex-1"
                    title="Crops to fill, no white bars"
                  >
                    Fill
                  </Button>
                  <Button
                    size="sm"
                    variant={scaleMode === 'stretch' ? 'default' : 'outline'}
                    onClick={() => setScaleMode('stretch')}
                    className="flex-1"
                    title="Stretches to fill, may distort"
                  >
                    Stretch
                  </Button>
                </div>
              </div>
              
              {selectedIndices.size > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Output will be automatically optimized to meet Slack's 128KB limit
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={() => exportGif()} 
            disabled={selectedIndices.size === 0 || isExporting || isLoading || !allFramesLoaded}
            className="gap-2"
            variant="default"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Emoji... {exportProgress > 0 && `${exportProgress}%`}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Create Emoji ({selectedIndices.size} frames)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}