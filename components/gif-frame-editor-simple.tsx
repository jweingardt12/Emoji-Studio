"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Play, 
  Pause, 
  Loader2,
  AlertCircle,
  Sparkles
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

export function GifFrameEditorSimple({ file, isOpen, onClose, onExport }: GifFrameEditorProps) {
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
  const [speedMultiplier, setSpeedMultiplier] = useState(5) // Default to 5x speed
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  
  // Scaling mode: 'fit' maintains aspect ratio with padding, 'fill' crops to fill, 'stretch' distorts to fill
  const [scaleMode, setScaleMode] = useState<'fit' | 'fill' | 'stretch'>('fill')
  
  // Pre-rendered frame canvases
  const frameCanvasesRef = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationIntervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (isOpen && file) {
      loadFrames()
    }
    return () => {
      stopPreview()
      // Clean up frame canvases
      frameCanvasesRef.current.clear()
    }
  }, [file, isOpen])

  const loadFrames = async () => {
    setIsLoading(true)
    setLoadError(null)
    setFrames([])
    setIsVideo(file.type.startsWith('video/'))
    frameCanvasesRef.current.clear()
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
      
      setFrames(extractedFrames)
      
      // Pre-render all frames to canvases
      prerenderFrames(extractedFrames)
      
    } catch (error) {
      console.error("Failed to extract frames:", error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract frames'
      setLoadError(errorMessage)
      
      if (errorMessage.includes('SKIP_FRAME_EDITOR')) {
        setTimeout(() => onClose(), 500)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const prerenderFrames = (framesToRender: FrameData[]) => {
    frameCanvasesRef.current.clear()
    
    framesToRender.forEach((frame, index) => {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      // White background
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 200, 200)
      
      // Create temp canvas for frame
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frame.data.width
      tempCanvas.height = frame.data.height
      const tempCtx = tempCanvas.getContext('2d')
      if (!tempCtx) return
      
      tempCtx.putImageData(frame.data, 0, 0)
      
      // Apply scaling based on mode
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
      
      
      frameCanvasesRef.current.set(index, canvas)
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

  const displayFrame = (frameIndex: number) => {
    const canvas = previewCanvasRef.current
    const frameCanvas = frameCanvasesRef.current.get(frameIndex)
    
    if (!canvas || !frameCanvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, 200, 200)
    ctx.drawImage(frameCanvas, 0, 0)
    
    // Also update Slack preview canvases if they exist
    const messageCanvas = document.getElementById('message-preview') as HTMLCanvasElement
    const reactionCanvas = document.getElementById('reaction-preview') as HTMLCanvasElement
    
    if (messageCanvas) {
      const msgCtx = messageCanvas.getContext('2d')
      if (msgCtx) {
        msgCtx.imageSmoothingEnabled = false
        msgCtx.clearRect(0, 0, 64, 64)
        msgCtx.drawImage(frameCanvas, 0, 0, 64, 64)
      }
    }
    
    if (reactionCanvas) {
      const reactCtx = reactionCanvas.getContext('2d')
      if (reactCtx) {
        reactCtx.imageSmoothingEnabled = false
        reactCtx.clearRect(0, 0, 16, 16)
        reactCtx.drawImage(frameCanvas, 0, 0, 16, 16)
      }
    }
  }

  const startPreview = () => {
    if (frames.length === 0) return
    
    const selectedIndices = getSelectedFrames()
    if (selectedIndices.length === 0) return
    
    setPreviewPlaying(true)
    let currentIndex = 0
    
    // Display first frame immediately
    displayFrame(selectedIndices[0])
    setCurrentFrameIndex(selectedIndices[0])
    
    // Calculate delay based on frame data
    const getFrameDelay = () => {
      const frameIndex = selectedIndices[currentIndex]
      const frame = frames[frameIndex]
      if (!frame) return 100
      
      const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
      return Math.max(20, baseDelay / speedMultiplier)
    }
    
    const animate = () => {
      currentIndex = (currentIndex + 1) % selectedIndices.length
      const frameIndex = selectedIndices[currentIndex]
      
      displayFrame(frameIndex)
      setCurrentFrameIndex(frameIndex)
      
      // Schedule next frame with appropriate delay
      animationIntervalRef.current = window.setTimeout(animate, getFrameDelay())
    }
    
    // Start animation
    animationIntervalRef.current = window.setTimeout(animate, getFrameDelay())
  }

  const stopPreview = () => {
    setPreviewPlaying(false)
    if (animationIntervalRef.current) {
      clearTimeout(animationIntervalRef.current)
      animationIntervalRef.current = null
    }
  }

  const exportGif = async () => {
    const selectedIndices = getSelectedFrames()
    if (selectedIndices.length === 0) return
    
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      const selectedFrames = selectedIndices.map(i => frames[i]).filter(Boolean)
      const MAX_FILE_SIZE = 128 * 1024 // 128KB strict limit
      
      // Optimization strategies with increasing aggressiveness
      const strategies = [
        { quality: 10, frameSkip: 1, dither: false },   // Best quality, all frames
        { quality: 20, frameSkip: 1, dither: false },   // Good quality, all frames
        { quality: 30, frameSkip: 2, dither: false },   // OK quality, every 2nd frame
        { quality: 40, frameSkip: 3, dither: false },   // Lower quality, every 3rd frame
        { quality: 50, frameSkip: 4, dither: false },   // Lower quality, every 4th frame
        { quality: 60, frameSkip: 5, dither: false },   // Very low quality, every 5th frame
        { quality: 80, frameSkip: 8, dither: false },   // Extreme compression
        { quality: 100, frameSkip: 10, dither: false }, // Maximum compression
        { quality: 100, frameSkip: 15, dither: false }, // Last resort - very few frames
        { quality: 100, frameSkip: 20, dither: false }, // Final attempt
      ]
      
      let outputBlob: Blob | null = null
      let usedFrames = selectedFrames
      
      for (let strategyIndex = 0; strategyIndex < strategies.length; strategyIndex++) {
        const strategy = strategies[strategyIndex]
        console.log(`Trying strategy ${strategyIndex + 1}/${strategies.length}: quality=${strategy.quality}, frameSkip=${strategy.frameSkip}`)
        
        // Apply frame skipping
        if (strategy.frameSkip > 1) {
          usedFrames = selectedFrames.filter((_, idx) => idx % strategy.frameSkip === 0)
          
          // Ensure at least 2 frames for animation
          if (usedFrames.length < 2 && selectedFrames.length >= 2) {
            usedFrames = [selectedFrames[0], selectedFrames[selectedFrames.length - 1]]
          }
        } else {
          usedFrames = selectedFrames
        }
        
        // Create encoder with current strategy
        const gif = new ImprovedGIFEncoder({
          width: 128,
          height: 128,
          quality: strategy.quality,
          workers: 2,
          workerScript: '/gif.worker.js',
          dither: strategy.dither
        })
        
        // Process each frame
        for (let i = 0; i < usedFrames.length; i++) {
          const frame = usedFrames[i]
          const canvas = document.createElement('canvas')
          canvas.width = 128
          canvas.height = 128
          const ctx = canvas.getContext('2d', { alpha: true })
          if (!ctx) continue
          
          // White background
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, 128, 128)
          
          // Create temp canvas
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
          
          const delay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
          gif.addFrame(ctx, {
            delay: Math.round(delay / speedMultiplier),
            dispose: 1
          })
          
          // Update progress
          const overallProgress = Math.round(
            (strategyIndex / strategies.length) * 100 + 
            ((i + 1) / usedFrames.length) * (100 / strategies.length)
          )
          setExportProgress(overallProgress)
        }
        
        outputBlob = await gif.render()
        console.log(`Strategy ${strategyIndex + 1} produced ${outputBlob.size} bytes (limit: ${MAX_FILE_SIZE})`)
        
        // Check if we're under the limit
        if (outputBlob.size <= MAX_FILE_SIZE) {
          console.log(`Success! File size: ${outputBlob.size} bytes`)
          break
        }
        
        // If this is the last strategy and we're still over, we have no choice but to use it
        if (strategyIndex === strategies.length - 1) {
          console.warn(`Could not get under 128KB. Final size: ${outputBlob.size} bytes`)
          // Add a warning to the user
          setLoadError(`Warning: GIF is ${Math.round(outputBlob.size / 1024)}KB (limit: 128KB). Try selecting fewer frames.`)
          setTimeout(() => setLoadError(null), 5000)
        }
      }
      
      if (outputBlob) {
        onExport(outputBlob, selectedIndices, speedMultiplier)
        onClose()
      } else {
        throw new Error('Failed to create GIF')
      }
      
    } catch (error) {
      console.error('Failed to export GIF:', error)
      setLoadError('Failed to create GIF. Please try again.')
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  // Update preview when frames load
  useEffect(() => {
    if (frames.length > 0 && !previewPlaying) {
      displayFrame(0)
      setCurrentFrameIndex(0)
    }
  }, [frames.length])
  
  // Re-render frames when scale mode changes
  useEffect(() => {
    if (frames.length > 0 && scaleMode) {
      prerenderFrames(frames)
    }
  }, [scaleMode])
  
  // Restart preview when frame selection mode or everyNthFrame changes
  useEffect(() => {
    if (previewPlaying && frames.length > 0) {
      stopPreview()
      startPreview()
    }
  }, [frameSelectionMode, everyNthFrame])

  const selectedCount = getSelectedFrames().length

  return (
    <Dialog open={isOpen} onOpenChange={() => !isExporting && onClose()}>
      <DialogContent className="max-w-2xl">
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
                  <h3 className="text-sm font-medium mb-2">Emoji Preview</h3>
                  <canvas
                    ref={previewCanvasRef}
                    width={200}
                    height={200}
                    className="border rounded-lg shadow-sm bg-white"
                    style={{ imageRendering: 'pixelated' }}
                  />
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
                    {selectedCount} frames selected
                  </div>
                </div>
              </div>
              
              {/* Slack Context Previews */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-center lg:text-left">In Slack</h3>
                
                {/* Standalone Message */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-semibold text-xs">
                      JD
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm dark:text-gray-100">Jane Doe</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">2:34 PM</span>
                      </div>
                      <canvas 
                        id="message-preview"
                        width={64} 
                        height={64} 
                        className="block"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Reaction Context */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-green-500 dark:bg-green-600 flex items-center justify-center text-white font-semibold text-xs">
                      JS
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm dark:text-gray-100">John Smith</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">2:30 PM</span>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">
                        Woah. Have you seen Emoji Studio? Crazy how Slack won't build something like it.
                      </div>
                      <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1 border border-gray-200 dark:border-gray-600">
                        <canvas 
                          id="reaction-preview"
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
              
              {/* Frame info */}
              <div className="text-sm text-center text-muted-foreground">
                {frames.length <= 50 ? (
                  <span>Using all {frames.length} frames</span>
                ) : (
                  <span>Using {getSelectedFrames().length} of {frames.length} frames</span>
                )}
              </div>

              {/* Speed */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>GIF Speed</span>
                  <span className="text-muted-foreground">{speedMultiplier}x</span>
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
              
              {selectedCount > 30 && (
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    With {selectedCount} frames selected, the GIF encoder will optimize aggressively to stay under 128KB. Consider selecting fewer frames for better quality.
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
  )
}