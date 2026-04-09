"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { 
  Play, 
  Pause, 
  Loader2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { GifFrameExtractor, ExtractedFrame } from "@/lib/utils/gif-frame-extractor"
import { VideoFrameExtractor, VideoFrame } from "@/lib/utils/video-frame-extractor"
import { ImprovedGIFEncoder } from "@/lib/utils/improved-gif-encoder"

interface GifFrameEditorProps {
  file: File
  isOpen: boolean
  onClose: () => void
  onExport: (blob: Blob, selectedFrames: number[], speedMultiplier: number) => void
}

type FrameData = ExtractedFrame | VideoFrame

export function GifFrameEditorCSS({ file, isOpen, onClose, onExport }: GifFrameEditorProps) {
  const [frames, setFrames] = useState<FrameData[]>([])
  const [isVideo, setIsVideo] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionMessage, setExtractionMessage] = useState('')
  
  // Frame selection
  const [frameSelectionMode, setFrameSelectionMode] = useState<'magic' | 'everyN'>('magic')
  const [everyNthFrame, setEveryNthFrame] = useState(2) // For 'everyN' mode
  
  // Playback control
  const [speedMultiplier, setSpeedMultiplier] = useState(3) // Default to 3x speed (100ms -> 33ms)
  const [currentPreviewFrame, setCurrentPreviewFrame] = useState(0)
  
  // Export strategy - determined once and used for both preview and export
  const [exportStrategy, setExportStrategy] = useState<{frameSkip: number, quality: number} | null>(null)
  
  // Scaling mode: 'fit' maintains aspect ratio with padding, 'fill' crops to fill, 'stretch' distorts to fill
  const [scaleMode, setScaleMode] = useState<'fit' | 'fill' | 'stretch'>('fill')
  
  // Store frame data URLs
  const [frameDataUrls, setFrameDataUrls] = useState<string[]>([])
  const [exportPreviewUrls, setExportPreviewUrls] = useState<string[]>([])  // 128x128 previews matching export
  const animationIntervalRef = useRef<number | null>(null)
  
  // UI state
  const [showSlackPreviews, setShowSlackPreviews] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showExportPreview, setShowExportPreview] = useState(false) // Toggle between display and export preview

  useEffect(() => {
    if (isOpen && file) {
      loadFrames()
    }
    return () => {
      stopPreview()
    }
  }, [file, isOpen])

  const loadFrames = async () => {
    setIsLoading(true)
    setLoadError(null)
    setFrames([])
    setFrameDataUrls([])
    setIsVideo(file.type.startsWith('video/'))
    setExtractionProgress(0)
    setExtractionMessage('')
    
    try {
      let extractedFrames: FrameData[]
      
      if (file.type.startsWith('video/')) {
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
      
      // If no frames were extracted, close the editor and let normal processing continue
      if (extractedFrames.length === 0) {
        // Don't show an error - just close and continue processing
        onClose()
        return
      }
      
      setFrames(extractedFrames)
      
      // Convert frames to data URLs for display (200x200)
      const urls = await convertFramesToDataUrls(extractedFrames)
      setFrameDataUrls(urls)

      // Also create export previews (128x128) that match what will be exported
      const exportUrls = await createExportPreviews(extractedFrames)
      setExportPreviewUrls(exportUrls)
      
      // The useEffect will handle auto-play when frameDataUrls are ready
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract frames'
      setLoadError(errorMessage)
      
      if (errorMessage.includes('SKIP_FRAME_EDITOR')) {
        setTimeout(() => onClose(), 500)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Create 128x128 previews that match exactly what will be exported
  const createExportPreviews = async (framesToConvert: FrameData[]): Promise<string[]> => {
    return framesToConvert.map((frame, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d', { 
        alpha: false,
        willReadFrequently: true
      })
      if (!ctx) return ''
      
      // White background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 128, 128)
      
      // Create temp canvas for frame
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frame.data.width
      tempCanvas.height = frame.data.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return ''
      
      tempCtx.putImageData(frame.data, 0, 0)
      
      // Apply scaling EXACTLY as export does
      ctx.imageSmoothingEnabled = false
      
      if (scaleMode === 'stretch') {
        ctx.drawImage(tempCanvas, 0, 0, 128, 128)
      } else if (scaleMode === 'fill') {
        const scale = Math.max(128 / tempCanvas.width, 128 / tempCanvas.height)
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (128 - scaledWidth) / 2
        const offsetY = (128 - scaledHeight) / 2
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 128, 128)
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
      } else {
        const scale = Math.min(128 / tempCanvas.width, 128 / tempCanvas.height)
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (128 - scaledWidth) / 2
        const offsetY = (128 - scaledHeight) / 2
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
      }
      
      return canvas.toDataURL('image/png')
    })
  }
  
  const convertFramesToDataUrls = async (framesToConvert: FrameData[]): Promise<string[]> => {
    return framesToConvert.map((frame, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      
      // White background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 200, 200)
      
      // Create temp canvas for frame
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frame.data.width
      tempCanvas.height = frame.data.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return ''
      
      tempCtx.putImageData(frame.data, 0, 0)
      
      // Apply scaling based on mode
      // Disable smoothing to preserve pixel art
      ctx.imageSmoothingEnabled = false
      
      if (scaleMode === 'stretch') {
        // Stretch to fill entire canvas (may distort)
        ctx.drawImage(tempCanvas, 0, 0, 200, 200)
      } else if (scaleMode === 'fill') {
        // Scale to fill (crop to fit) - no white bars
        const scale = Math.max(200 / tempCanvas.width, 200 / tempCanvas.height)
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (200 - scaledWidth) / 2
        const offsetY = (200 - scaledHeight) / 2
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
      } else {
        // Scale to fit while maintaining aspect ratio (may have white bars)
        const scale = Math.min(200 / tempCanvas.width, 200 / tempCanvas.height)
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (200 - scaledWidth) / 2
        const offsetY = (200 - scaledHeight) / 2
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
      }
      
      
      return canvas.toDataURL('image/png')
    })
  }

  const getSelectedFrames = () => {
    const indices: number[] = []
    
    if (frames.length <= 50) {
      // If 50 or fewer frames, use all
      for (let i = 0; i < frames.length; i++) {
        indices.push(i)
      }
    } else {
      // Apply selection mode
      switch (frameSelectionMode) {
        case 'magic':
          // Evenly distribute 50 frames across the entire animation
          const step = (frames.length - 1) / 49
          for (let i = 0; i < 50; i++) {
            indices.push(Math.round(i * step))
          }
          break
        
        case 'everyN':
          for (let i = 0; i < frames.length && indices.length < 50; i += everyNthFrame) {
            indices.push(i)
          }
          break
      }
    }
    
    return indices
  }
  
  // Calculate what export strategy will be needed based on estimated file size
  const calculateExportStrategy = () => {
    const selectedIndices = getSelectedFrames()
    if (selectedIndices.length === 0) return { frameSkip: 1, quality: 1 }
    
    // Slack requirements:
    // - Max file size: 128KB (strict limit)
    // - Max frames: 50 (Slack displays up to 50 frames well)
    // - Max dimensions: 128x128 (we handle this in encoding)
    
    const MAX_FILE_SIZE = 128 * 1024
    const MAX_FRAMES = 50
    
    // PRIORITY: Maximize smoothness (frame count) while maintaining acceptable quality
    // Strategy: Use as many frames as possible, adjusting quality to fit
    let frameSkip = 1
    let quality = 1 // Start with BEST quality (1 is best in gif.js)
    
    // First, ensure we don't exceed 50 frames
    if (selectedIndices.length > MAX_FRAMES) {
      frameSkip = Math.ceil(selectedIndices.length / MAX_FRAMES)
    }
    
    const resultingFrames = Math.ceil(selectedIndices.length / frameSkip)
    
    // Updated bytes per frame estimates for smoother animations
    // More conservative estimates to avoid overshooting
    // Based on empirical data for 128x128 GIFs with gif.js:
    const bytesPerFrameEstimates: Record<number, number> = {
      1: 3500,   // Best quality - conservative estimate
      3: 3000,   // Excellent quality
      5: 2500,   // Very good quality
      8: 2100,   // Good quality
      10: 1800,  // Good balance
      12: 1600,  // Acceptable quality
      15: 1400,  // Slightly reduced quality
      20: 1200,  // Moderate quality
      25: 1050,  // Lower quality but smooth
      30: 950,   // Compressed
      40: 850,   // More compressed
      50: 750,   // Maximum compression
      60: 650,   // Ultra compressed
      80: 550,   // Extreme compression
      100: 450   // Last resort
    }
    
    // Find the HIGHEST quality that fits our frame count
    // We prioritize keeping all frames for smoothness
    const qualityLevels = [1, 3, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100]
    const targetSize = MAX_FILE_SIZE * 0.94 // Target 94% to leave buffer
    
    // Find best quality for current frame count
    for (const q of qualityLevels) {
      const bytesPerFrame = bytesPerFrameEstimates[q] || 600
      const estimatedSize = resultingFrames * bytesPerFrame
      
      if (estimatedSize <= targetSize) {
        quality = q
        break
      }
    }
    
    // Only skip frames as a last resort
    if (quality === 100) {
      const bytesPerFrame = bytesPerFrameEstimates[100] || 500
      const maxFramesAtLowestQuality = Math.floor(targetSize / bytesPerFrame)
      
      if (resultingFrames > maxFramesAtLowestQuality) {
        // Try to keep at least 30 frames for smooth animation
        const targetFrames = Math.max(30, Math.min(MAX_FRAMES, maxFramesAtLowestQuality))
        frameSkip = Math.ceil(selectedIndices.length / targetFrames)
        
        // After skipping, try to improve quality if possible
        const newFrameCount = Math.ceil(selectedIndices.length / frameSkip)
        for (const q of qualityLevels) {
          const estimatedSize = newFrameCount * (bytesPerFrameEstimates[q] || 600)
          if (estimatedSize <= targetSize) {
            quality = q
            break
          }
        }
        
      }
    }

    return { frameSkip, quality }
  }
  
  // Get frames that will actually be used in export (after frame skipping)
  const getExportFrameIndices = () => {
    const selectedIndices = getSelectedFrames()
    const strategy = exportStrategy || calculateExportStrategy()
    
    if (strategy.frameSkip <= 1) {
      return selectedIndices
    }
    
    // Apply frame skipping
    const exportIndices = selectedIndices.filter((_, idx) => idx % strategy.frameSkip === 0)
    
    // Ensure at least 2 frames for animation
    if (exportIndices.length < 2 && selectedIndices.length >= 2) {
      return [selectedIndices[0], selectedIndices[selectedIndices.length - 1]]
    }
    
    return exportIndices
  }

  const startPreview = () => {
    if (frames.length === 0) return
    if (!showExportPreview && frameDataUrls.length === 0) return
    if (showExportPreview && exportPreviewUrls.length === 0) return
    
    // Use the EXACT same frames that will be exported
    const exportIndices = getExportFrameIndices()
    if (exportIndices.length === 0) return
    
    const strategy = exportStrategy || calculateExportStrategy()
    
    setPreviewPlaying(true)
    let currentIndex = 0
    
    // Show first frame
    setCurrentPreviewFrame(exportIndices[0])
    
    const animate = () => {
      currentIndex = (currentIndex + 1) % exportIndices.length
      const frameIndex = exportIndices[currentIndex]
      setCurrentPreviewFrame(frameIndex)
      
      // Calculate delay - EXACTLY as export does
      const frame = frames[frameIndex]
      const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
      let targetDelay = Math.max(20, Math.round(baseDelay / speedMultiplier))
      
      // Apply frame skip adjustment EXACTLY as export does
      if (strategy.frameSkip > 1) {
        targetDelay = targetDelay * strategy.frameSkip
      }
      
      animationIntervalRef.current = window.setTimeout(animate, targetDelay)
    }
    
    // Start animation with first frame's delay
    const firstFrame = frames[exportIndices[0]]
    const firstDelay = isVideo ? 100 : ('delay' in firstFrame ? firstFrame.delay : 100)
    let adjustedFirstDelay = Math.max(20, Math.round(firstDelay / speedMultiplier))
    if (strategy.frameSkip > 1) {
      adjustedFirstDelay = adjustedFirstDelay * strategy.frameSkip
    }
    animationIntervalRef.current = window.setTimeout(animate, adjustedFirstDelay)
  }

  const stopPreview = () => {
    setPreviewPlaying(false)
    if (animationIntervalRef.current) {
      clearTimeout(animationIntervalRef.current)
      animationIntervalRef.current = null
    }
  }
  
  const handleClose = () => {
    // If frames are loaded and user hasn't exported yet, show confirmation
    if (frames.length > 0 && !isExporting) {
      setShowCloseConfirm(true)
    } else {
      onClose()
    }
  }
  
  const confirmClose = () => {
    setShowCloseConfirm(false)
    onClose()
  }
  
  const cancelClose = () => {
    setShowCloseConfirm(false)
  }
  
  // Auto-play when frameDataUrls are ready (only on initial load)
  useEffect(() => {
    if (frameDataUrls.length > 0 && !previewPlaying && frames.length > 0 && isOpen) {
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        startPreview()
      }, 100)
    }
  }, [frameDataUrls.length, isOpen]) // Only depend on data URLs length and isOpen

  // Recalculate export strategy when relevant settings change
  useEffect(() => {
    if (frames.length > 0) {
      const newStrategy = calculateExportStrategy()
      setExportStrategy(newStrategy)
    }
  }, [frames.length, frameSelectionMode, everyNthFrame])
  
  // Restart preview when settings change
  useEffect(() => {
    if (previewPlaying && frames.length > 0) {
      // Clear any existing animation
      if (animationIntervalRef.current) {
        clearTimeout(animationIntervalRef.current)
      }
      
      // Use export frame indices for consistency
      const exportIndices = getExportFrameIndices()
      const strategy = exportStrategy || calculateExportStrategy()
      
      if (exportIndices.length > 0) {
        let currentIndex = 0
        
        const animate = () => {
          currentIndex = (currentIndex + 1) % exportIndices.length
          const frameIndex = exportIndices[currentIndex]
          setCurrentPreviewFrame(frameIndex)
          
          // Calculate delay with new speed
          const frame = frames[frameIndex]
          const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
          let targetDelay = Math.max(20, Math.round(baseDelay / speedMultiplier))
          
          // Apply frame skip adjustment
          if (strategy.frameSkip > 1) {
            targetDelay = targetDelay * strategy.frameSkip
          }
          
          animationIntervalRef.current = window.setTimeout(animate, targetDelay)
        }
        
        // Start with first frame
        setCurrentPreviewFrame(exportIndices[0])
        const firstFrame = frames[exportIndices[0]]
        const firstDelay = isVideo ? 100 : ('delay' in firstFrame ? firstFrame.delay : 100)
        let adjustedDelay = Math.max(20, Math.round(firstDelay / speedMultiplier))
        if (strategy.frameSkip > 1) {
          adjustedDelay = adjustedDelay * strategy.frameSkip
        }
        animationIntervalRef.current = window.setTimeout(animate, adjustedDelay)
      }
    }
  }, [speedMultiplier, scaleMode, frameSelectionMode, everyNthFrame, previewPlaying, exportStrategy])
  
  // Re-render frames when scale mode changes
  useEffect(() => {
    if (frames.length > 0) {
      // Update both display and export previews
      convertFramesToDataUrls(frames).then(setFrameDataUrls)
      createExportPreviews(frames).then(setExportPreviewUrls)
    }
  }, [scaleMode])

  const exportGif = async () => {
    // Use the EXACT same frames as preview
    const exportIndices = getExportFrameIndices()
    if (exportIndices.length === 0) return
    
    // Use pre-calculated strategy
    const strategy = exportStrategy || calculateExportStrategy()
    
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      const usedFrames = exportIndices.map(i => frames[i]).filter(Boolean)
      const MAX_FILE_SIZE = 128 * 1024 // 128KB strict limit
      
      // Create encoder with pre-calculated strategy
      // Use more workers for faster processing on initial attempt
      const gif = new ImprovedGIFEncoder({
        width: 128,
        height: 128,
        quality: strategy.quality,
        workers: 4, // More workers for faster processing
        workerScript: '/gif.worker.js',
        dither: false // No dithering for cleaner look
      })
      
      // Process each frame
      for (let i = 0; i < usedFrames.length; i++) {
        const frame = usedFrames[i]
        
        // Create fresh canvas for each frame to avoid state issues
        const canvas = document.createElement('canvas')
        canvas.width = 128
        canvas.height = 128
        const ctx = canvas.getContext('2d', { 
          alpha: false,  // No transparency for smaller file size
          willReadFrequently: true
        })
        if (!ctx) continue
        
        // Start with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 128, 128)
        
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = frame.data.width
        tempCanvas.height = frame.data.height
        const tempCtx = tempCanvas.getContext('2d')
        if (!tempCtx) continue
        
        tempCtx.putImageData(frame.data, 0, 0)
        
        // Apply scaling based on mode
        if (scaleMode === 'stretch') {
          // Stretch to fill entire 128x128 (may distort)
          ctx.drawImage(tempCanvas, 0, 0, 128, 128)
        } else if (scaleMode === 'fill') {
          // Scale to fill (crop to fit) - no white bars
          const scale = Math.max(128 / tempCanvas.width, 128 / tempCanvas.height)
          const scaledWidth = tempCanvas.width * scale
          const scaledHeight = tempCanvas.height * scale
          const offsetX = (128 - scaledWidth) / 2
          const offsetY = (128 - scaledHeight) / 2
          
          // CRITICAL: Clear the canvas first to ensure frames are different
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, 128, 128)
          
          // Disable image smoothing for pixel-perfect rendering
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
          
        } else {
          // Scale to fit while maintaining aspect ratio (may have white bars)
          const scale = Math.min(128 / tempCanvas.width, 128 / tempCanvas.height)
          const scaledWidth = tempCanvas.width * scale
          const scaledHeight = tempCanvas.height * scale
          const offsetX = (128 - scaledWidth) / 2
          const offsetY = (128 - scaledHeight) / 2
          ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
        }
        
        // Calculate delay EXACTLY as preview does
        const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
        let delay = Math.max(20, Math.round(baseDelay / speedMultiplier))
        
        // Apply frame skip adjustment EXACTLY as preview does
        if (strategy.frameSkip > 1) {
          delay = delay * strategy.frameSkip
        }
        
        // Ensure delay is reasonable for Slack (20-1000ms, ideally 30-200ms)
        delay = Math.max(20, Math.min(1000, delay))
        
        gif.addFrame(ctx, {
          delay: delay,
          dispose: 1,
          copy: true  // Ensure frame is copied
        })
        
        // Update progress
        const progress = Math.round((i + 1) / usedFrames.length * 100)
        setExportProgress(progress)
      }
      
      let outputBlob = await gif.render()

      // If still over limit, try more aggressive strategies
      if (outputBlob.size > MAX_FILE_SIZE) {
        
        // Fallback strategies - PRIORITIZE SMOOTHNESS (more frames) over quality
        // Try to keep as many frames as possible for smooth animation
        const targetSize = MAX_FILE_SIZE * 0.92 // ~118KB target (more conservative)
        const fallbackStrategies = [
          // First try reducing quality while keeping most frames
          { quality: 15, maxFrames: Math.min(50, Math.floor(targetSize / 1400)) },  // ~1.4KB per frame
          { quality: 20, maxFrames: Math.min(50, Math.floor(targetSize / 1200)) },  // ~1.2KB per frame
          { quality: 25, maxFrames: Math.min(50, Math.floor(targetSize / 1050)) },  // ~1.05KB per frame
          { quality: 30, maxFrames: Math.min(45, Math.floor(targetSize / 950)) },   // ~0.95KB per frame
          { quality: 40, maxFrames: Math.min(40, Math.floor(targetSize / 850)) },   // ~0.85KB per frame
          { quality: 50, maxFrames: Math.min(35, Math.floor(targetSize / 750)) },   // ~0.75KB per frame
          { quality: 60, maxFrames: Math.min(30, Math.floor(targetSize / 650)) },   // ~0.65KB per frame
          { quality: 80, maxFrames: Math.min(25, Math.floor(targetSize / 550)) },   // ~0.55KB per frame
          { quality: 100, maxFrames: Math.min(20, Math.floor(targetSize / 450)) },  // ~0.45KB per frame
          // Very low quality but try to keep at least 15 frames
          { quality: 150, maxFrames: Math.max(15, Math.floor(targetSize / 400)) },  // ~0.4KB per frame
          { quality: 200, maxFrames: Math.max(10, Math.floor(targetSize / 350)) }   // ~0.35KB per frame
        ]
        
        for (const fallback of fallbackStrategies) {
          // Sample frames evenly throughout the animation instead of just taking the first N
          let fallbackFrames: typeof usedFrames
          if (fallback.maxFrames >= usedFrames.length) {
            fallbackFrames = usedFrames
          } else {
            // Calculate sampling interval to get evenly distributed frames
            const interval = usedFrames.length / fallback.maxFrames
            fallbackFrames = []
            for (let i = 0; i < fallback.maxFrames; i++) {
              const index = Math.floor(i * interval)
              if (index < usedFrames.length) {
                fallbackFrames.push(usedFrames[index])
              }
            }
          }
          
          const fallbackGif = new ImprovedGIFEncoder({
            width: 128,
            height: 128,
            quality: fallback.quality,
            workers: 2,
            workerScript: '/gif.worker.js',
            dither: false
          })
          
          for (let i = 0; i < fallbackFrames.length; i++) {
            const frame = fallbackFrames[i]
            const canvas = document.createElement('canvas')
            canvas.width = 128
            canvas.height = 128
            const ctx = canvas.getContext('2d', { alpha: true })
            if (!ctx) continue
            
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, 128, 128)
            
            const tempCanvas = document.createElement('canvas')
            tempCanvas.width = frame.data.width
            tempCanvas.height = frame.data.height
            const tempCtx = tempCanvas.getContext('2d')
            if (!tempCtx) continue
            
            tempCtx.putImageData(frame.data, 0, 0)
            
            // Apply scaling based on mode (same as main export)
            ctx.imageSmoothingEnabled = false // Pixel-perfect rendering
            
            if (scaleMode === 'stretch') {
              ctx.drawImage(tempCanvas, 0, 0, 128, 128)
            } else if (scaleMode === 'fill') {
              const scale = Math.max(128 / tempCanvas.width, 128 / tempCanvas.height)
              const scaledWidth = tempCanvas.width * scale
              const scaledHeight = tempCanvas.height * scale
              const offsetX = (128 - scaledWidth) / 2
              const offsetY = (128 - scaledHeight) / 2
              
              // Clear first for fill mode
              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, 128, 128)
              ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            } else {
              const scale = Math.min(128 / tempCanvas.width, 128 / tempCanvas.height)
              const scaledWidth = tempCanvas.width * scale
              const scaledHeight = tempCanvas.height * scale
              const offsetX = (128 - scaledWidth) / 2
              const offsetY = (128 - scaledHeight) / 2
              ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
            }
            
            // Adjust delay for sampled frames
            const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
            // When sampling frames, we need to adjust the delay to maintain animation speed
            const samplingRatio = fallback.maxFrames < usedFrames.length ? 
              usedFrames.length / fallback.maxFrames : 1
            let delay = Math.max(20, Math.round(baseDelay / speedMultiplier * samplingRatio))
            
            // Apply any existing frame skip adjustment
            if (strategy.frameSkip > 1) {
              delay = delay * strategy.frameSkip
            }
            
            fallbackGif.addFrame(ctx, {
              delay: delay,
              dispose: 1,
              copy: true  // Ensure frame is copied
            })
          }
          
          outputBlob = await fallbackGif.render()

          if (outputBlob.size <= MAX_FILE_SIZE) {
            // Simple feedback about the optimization
            const sizeKB = (outputBlob.size / 1024).toFixed(1)
            setLoadError(`Optimized to ${fallbackFrames.length} frames, ${sizeKB}KB`)
            setTimeout(() => setLoadError(null), 3000)
            break
          }
        }
        
        // Final check - if still too large, use extreme measures
        if (outputBlob.size > MAX_FILE_SIZE) {
          
          // Last resort: Use only keyframes with maximum compression
          const extremeStrategies = [
            { quality: 200, frames: 15 },  // Very few frames, extreme compression
            { quality: 255, frames: 10 },  // Minimal frames
            { quality: 255, frames: 5 },   // Bare minimum for animation
            { quality: 255, frames: 3 },   // Absolute minimum
            { quality: 255, frames: 2 }    // Just 2 frames
          ]
          
          for (const extreme of extremeStrategies) {
            // Sample frames evenly
            const step = Math.floor(usedFrames.length / extreme.frames)
            const extremeFrames = []
            for (let i = 0; i < extreme.frames && i * step < usedFrames.length; i++) {
              extremeFrames.push(usedFrames[i * step])
            }
            
            const extremeGif = new ImprovedGIFEncoder({
              width: 128,
              height: 128,
              quality: Math.min(255, extreme.quality), // Cap at max quality value
              workers: 2,
              workerScript: '/gif.worker.js',
              dither: false
            })
            
            for (const frame of extremeFrames) {
              const canvas = document.createElement('canvas')
              canvas.width = 128
              canvas.height = 128
              const ctx = canvas.getContext('2d', { alpha: false })
              if (!ctx) continue
              
              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, 128, 128)
              
              const tempCanvas = document.createElement('canvas')
              tempCanvas.width = frame.data.width
              tempCanvas.height = frame.data.height
              const tempCtx = tempCanvas.getContext('2d')
              if (!tempCtx) continue
              
              tempCtx.putImageData(frame.data, 0, 0)
              
              // Apply scaling
              if (scaleMode === 'fill') {
                const scale = Math.max(128 / tempCanvas.width, 128 / tempCanvas.height)
                const scaledWidth = tempCanvas.width * scale
                const scaledHeight = tempCanvas.height * scale
                const offsetX = (128 - scaledWidth) / 2
                const offsetY = (128 - scaledHeight) / 2
                ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
              } else {
                const scale = Math.min(128 / tempCanvas.width, 128 / tempCanvas.height)
                const scaledWidth = tempCanvas.width * scale
                const scaledHeight = tempCanvas.height * scale
                const offsetX = (128 - scaledWidth) / 2
                const offsetY = (128 - scaledHeight) / 2
                ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
              }
              
              // Adjust delay for extreme frame reduction
              const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
              const frameRatio = usedFrames.length / extremeFrames.length
              const delay = Math.max(30, Math.min(500, Math.round(baseDelay / speedMultiplier * frameRatio)))
              
              extremeGif.addFrame(ctx, {
                delay: delay,
                dispose: 1,
                copy: true
              })
            }
            
            outputBlob = await extremeGif.render()

            if (outputBlob.size <= MAX_FILE_SIZE) {
              setLoadError(`Reduced to ${extremeFrames.length} frames`)
              setTimeout(() => setLoadError(null), 3000)
              break
            }
          }
          
          // Absolute last resort: single frame
          if (outputBlob.size > MAX_FILE_SIZE) {
            const singleFrameGif = new ImprovedGIFEncoder({
              width: 128,
              height: 128,
              quality: 255,
              workers: 1,
              workerScript: '/gif.worker.js'
            })
            
            const canvas = document.createElement('canvas')
            canvas.width = 128
            canvas.height = 128
            const ctx = canvas.getContext('2d', { alpha: false })
            if (ctx) {
              ctx.fillStyle = 'white'
              ctx.fillRect(0, 0, 128, 128)
              
              const frame = usedFrames[Math.floor(usedFrames.length / 2)] // Middle frame
              const tempCanvas = document.createElement('canvas')
              tempCanvas.width = frame.data.width
              tempCanvas.height = frame.data.height
              const tempCtx = tempCanvas.getContext('2d')
              if (tempCtx) {
                tempCtx.putImageData(frame.data, 0, 0)
                const scale = Math.min(128 / tempCanvas.width, 128 / tempCanvas.height)
                const scaledWidth = tempCanvas.width * scale
                const scaledHeight = tempCanvas.height * scale
                const offsetX = (128 - scaledWidth) / 2
                const offsetY = (128 - scaledHeight) / 2
                ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
              }
              
              singleFrameGif.addFrame(ctx, { delay: 100, dispose: 1, copy: true })
              outputBlob = await singleFrameGif.render()
              setLoadError(`Converted to static image`)
              setTimeout(() => setLoadError(null), 5000)
            }
          }
        }
      }
      
      // Export with the indices we actually used (may be reduced)
      onExport(outputBlob, exportIndices, speedMultiplier)
      
    } catch (error) {
      setLoadError('Failed to create GIF. Please try again.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // Update preview when frames load
  useEffect(() => {
    if (frames.length > 0 && frameDataUrls.length > 0 && !previewPlaying) {
      setCurrentPreviewFrame(0)
    }
  }, [frames.length, frameDataUrls.length])

  const selectedCount = getExportFrameIndices().length

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl" onInteractOutside={(e) => {
          e.preventDefault()
          handleClose()
        }}>
          <DialogHeader>
            <DialogTitle>Create Slack Emoji</DialogTitle>
          </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                Extracting frames from your {isVideo ? 'video' : 'GIF'}...
              </p>
              {extractionMessage && (
                <p className="text-xs text-muted-foreground">{extractionMessage}</p>
              )}
            </div>
            {extractionProgress > 0 && (
              <Progress value={extractionProgress} className="w-64" />
            )}
          </div>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : frames.length > 0 ? (
          <div className="space-y-6">
            {/* Preview */}
            <div className="flex flex-col lg:flex-row items-start justify-center gap-6">
              {/* Main Preview */}
              <div className="flex flex-col items-center space-y-4">
                <div className="text-center">
                  <h3 className="text-sm font-medium mb-2">
                    {showExportPreview ? 'Export Preview (128x128)' : 'Display Preview (200x200)'}
                  </h3>
                  <div className={`relative border rounded-lg shadow-xs bg-white overflow-hidden ${
                    showExportPreview ? 'w-[128px] h-[128px]' : 'w-[200px] h-[200px]'
                  }`}>
                    {(showExportPreview ? exportPreviewUrls[currentPreviewFrame] : frameDataUrls[currentPreviewFrame]) && (
                      <img 
                        src={showExportPreview ? exportPreviewUrls[currentPreviewFrame] : frameDataUrls[currentPreviewFrame]}
                        alt={`Frame ${currentPreviewFrame + 1}`}
                        className="absolute inset-0 w-full h-full"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => setShowExportPreview(!showExportPreview)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {showExportPreview ? 'Show display preview' : 'Show exact export preview'}
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <Button
                    size="sm"
                    variant={previewPlaying ? "destructive" : "default"}
                    onClick={previewPlaying ? stopPreview : startPreview}
                    disabled={selectedCount === 0}
                  >
                    {previewPlaying ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                      </>
                    )}
                  </Button>
                  
                  <div className="text-sm text-muted-foreground">
                    {(() => {
                      const exportIndices = getExportFrameIndices()
                      const selectedIndices = getSelectedFrames()
                      const strategy = exportStrategy || calculateExportStrategy()
                      const smoothnessPercent = Math.round((exportIndices.length / selectedIndices.length) * 100)
                      
                      if (strategy.frameSkip > 1) {
                        // Frames are being skipped
                        return (
                          <span className="text-muted-foreground">
                            {exportIndices.length} of {selectedIndices.length} frames
                          </span>
                        )
                      } else {
                        // All frames are being used
                        return (
                          <span className="text-muted-foreground">
                            All {frames.length} frames
                          </span>
                        )
                      }
                    })()}
                  </div>
                </div>
              </div>
              
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Frame selection for GIFs with >50 frames */}
              {frames.length > 50 && (
                <div className="space-y-3">
                  <div className="text-sm text-center">Frame Selection</div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      variant={frameSelectionMode === 'magic' ? 'default' : 'outline'}
                      onClick={() => setFrameSelectionMode('magic')}
                      title="Evenly distribute 50 frames across the animation"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Magic Selection
                    </Button>
                    <Button
                      size="sm"
                      variant={frameSelectionMode === 'everyN' ? 'default' : 'outline'}
                      onClick={() => setFrameSelectionMode('everyN')}
                    >
                      Every Nth Frame
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
                        onValueChange={([v]) => setEveryNthFrame(v)}
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
                </div>
              )}

              {/* Speed */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>GIF Speed</span>
                  <span className="text-muted-foreground">
                    {speedMultiplier}x
                    {frames.length > 0 && frames[0] && (
                      <span className="ml-1 text-xs">
                        (~{Math.round(1000 / Math.max(20, Math.round(100 / speedMultiplier)))} fps)
                      </span>
                    )}
                  </span>
                </div>
                <Slider
                  value={[speedMultiplier]}
                  onValueChange={([v]) => setSpeedMultiplier(v)}
                  min={0.5}
                  max={15}
                  step={0.5}
                />
              </div>
              
              {/* Scale Mode */}
              <div className="space-y-2">
                <div className="text-sm">Scale Mode</div>
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
              
              {/* Slack Context Previews - Collapsible */}
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => setShowSlackPreviews(!showSlackPreviews)}
                >
                  <span className="text-sm font-medium">Show in Slack</span>
                  {showSlackPreviews ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                <div 
                  className={cn(
                    "space-y-2 overflow-hidden transition-all duration-300 ease-in-out",
                    showSlackPreviews ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  {/* Standalone Message */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xs border dark:border-gray-700 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                        JD
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="font-semibold text-xs dark:text-gray-100">Jane Doe</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">2:34 PM</span>
                        </div>
                        {frameDataUrls[currentPreviewFrame] && (
                          <img 
                            src={frameDataUrls[currentPreviewFrame]}
                            className="block w-12 h-12"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Reaction Context */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xs border dark:border-gray-700 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded bg-green-500 dark:bg-green-600 flex items-center justify-center text-white font-semibold text-[10px] shrink-0">
                        JS
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-1.5 mb-0.5">
                          <span className="font-semibold text-xs dark:text-gray-100">John Smith</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">2:30 PM</span>
                        </div>
                        <div className="text-[11px] text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                          Great job on the presentation! 
                        </div>
                        <div className="inline-flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-full px-1.5 py-0.5 border border-gray-200 dark:border-gray-600">
                          {frameDataUrls[currentPreviewFrame] && (
                            <img 
                              src={frameDataUrls[currentPreviewFrame]}
                              className="w-3 h-3"
                              style={{ imageRendering: 'pixelated' }}
                            />
                          )}
                          <span className="text-[10px] text-gray-600 dark:text-gray-300">3</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="border-t pt-4">
              {selectedCount > 50 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Only the first 50 frames will be used (Slack limit)
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={exportGif} 
                disabled={selectedCount === 0 || isExporting}
                className="w-full"
                size="lg"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Emoji... {exportProgress > 0 && `${exportProgress}%`}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Emoji
                  </>
                )}
              </Button>
              
              {isExporting && exportProgress > 0 && (
                <Progress value={exportProgress} className="mt-2" />
              )}
            </div>
          </div>
        ) : null}
        </DialogContent>
      </Dialog>
      
      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your emoji edits will be lost if you close now. Are you sure you want to exit without creating your emoji?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}