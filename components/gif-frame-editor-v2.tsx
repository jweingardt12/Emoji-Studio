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
import GIF from 'gif.js'
import { cn } from "@/lib/utils"
import { FrameThumbnail, clearThumbnailCache } from "./frame-thumbnail"
import { useDebounce } from "@/hooks/use-debounce"
import { VirtualFrameGrid } from "./virtual-frame-grid"
import { globalCanvasPool } from "@/lib/utils/canvas-pool"

interface GifFrameEditorProps {
  file: File
  isOpen: boolean
  onClose: () => void
  onExport: (blob: Blob, selectedFrames: number[]) => void
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
  const [quality, setQuality] = useState(10)
  const [targetSize, setTargetSize] = useState(128)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [frameSize, setFrameSize] = useState(120)
  const [exportProgress, setExportProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [currentPreviewDataUrl, setCurrentPreviewDataUrl] = useState<string>("")
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
  
  // Debounce frame size for performance
  const debouncedFrameSize = useDebounce(frameSize, 300)
  
  const previewIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameGridContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && file) {
      loadFrames()
    }
    return () => {
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current)
      }
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

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isExporting) {
        e.preventDefault()
        if (previewPlaying) {
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
  }, [isOpen, previewPlaying, isExporting, selectedIndices.size])

  const loadFrames = async () => {
    setIsLoading(true)
    setLoadError(null)
    setIsVideo(file.type.startsWith('video/'))
    
    try {
      let extractedFrames: FrameData[]
      
      if (file.type.startsWith('video/')) {
        console.log('Extracting frames from video...')
        extractedFrames = await VideoFrameExtractor.extractFrames(file, 10) // 10 fps
      } else {
        extractedFrames = await GifFrameExtractor.extractFrames(file)
      }
      
      // Process frames in chunks to avoid blocking
      const CHUNK_SIZE = 50
      const chunks: FrameData[][] = []
      for (let i = 0; i < extractedFrames.length; i += CHUNK_SIZE) {
        chunks.push(extractedFrames.slice(i, i + CHUNK_SIZE))
      }
      
      // Load first chunk immediately
      if (chunks.length > 0) {
        setFrames(chunks[0])
        
        // Load remaining chunks progressively
        for (let i = 1; i < chunks.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 10)) // Small delay between chunks
          setFrames(prev => [...prev, ...chunks[i]])
        }
      } else {
        setFrames(extractedFrames)
      }
      
      // Smart initial selection
      if (extractedFrames.length > 50) {
        // Auto-select evenly distributed frames
        const selectedSet = new Set<number>()
        const step = extractedFrames.length / 50
        for (let i = 0; i < 50; i++) {
          selectedSet.add(Math.floor(i * step))
        }
        setSelectedIndices(selectedSet)
        
        // Auto-export for files over 50 frames
        setTimeout(() => {
          exportGif(selectedSet)
        }, 500)
      } else {
        // Select all if 50 or fewer
        setSelectedIndices(new Set(Array.from({ length: extractedFrames.length }, (_, i) => i)))
      }
    } catch (error) {
      console.error("Failed to extract frames:", error)
      const errorMessage = error instanceof Error ? error.message : 
        (isVideo ? 'Failed to extract frames from video' : 'Failed to extract frames from GIF')
      setLoadError(errorMessage)
      
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
      return newSelected
    })
  }

  const selectRange = (start: number, end: number) => {
    const newSelected = new Set(selectedIndices)
    for (let i = start; i <= end && newSelected.size < 50; i++) {
      newSelected.add(i)
    }
    setSelectedIndices(newSelected)
  }

  const smartSelection = () => {
    const targetCount = Math.min(50, frames.length)
    const newSelected = new Set<number>()
    
    if (frames.length <= 50) {
      // Select all
      for (let i = 0; i < frames.length; i++) {
        newSelected.add(i)
      }
    } else {
      // Evenly distribute selection
      const step = (frames.length - 1) / (targetCount - 1)
      for (let i = 0; i < targetCount; i++) {
        newSelected.add(Math.round(i * step))
      }
    }
    
    setSelectedIndices(newSelected)
  }

  const randomSelection = () => {
    const targetCount = Math.min(50, frames.length)
    const newSelected = new Set<number>()
    
    // Always include first and last
    newSelected.add(0)
    newSelected.add(frames.length - 1)
    
    // Randomly select the rest
    while (newSelected.size < targetCount) {
      const randomIndex = Math.floor(Math.random() * frames.length)
      newSelected.add(randomIndex)
    }
    
    setSelectedIndices(newSelected)
  }

  const selectEveryNth = (n: number) => {
    const newSelected = new Set<number>()
    for (let i = 0; i < frames.length && newSelected.size < 50; i += n) {
      newSelected.add(i)
    }
    setSelectedIndices(newSelected)
  }

  const drawPreviewFrame = (frameIndex: number) => {
    if (!previewCanvasRef.current || !frames[frameIndex]) return
    
    const ctx = previewCanvasRef.current.getContext('2d')
    if (!ctx) return
    
    const frame = frames[frameIndex]
    const canvas = previewCanvasRef.current
    
    // Clear canvas with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, targetSize, targetSize)
    
    // Get temp canvas from pool
    const tempCanvas = globalCanvasPool.acquire(frame.data.width, frame.data.height)
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.putImageData(frame.data, 0, 0)
    
    // Scale and center the frame
    const scale = Math.min(targetSize / tempCanvas.width, targetSize / tempCanvas.height)
    const scaledWidth = tempCanvas.width * scale
    const scaledHeight = tempCanvas.height * scale
    const offsetX = (targetSize - scaledWidth) / 2
    const offsetY = (targetSize - scaledHeight) / 2
    
    ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
    
    // Release temp canvas back to pool
    globalCanvasPool.release(tempCanvas)
    
    // Update the data URL for the small preview
    setCurrentPreviewDataUrl(canvas.toDataURL())
  }

  const startPreview = () => {
    if (selectedIndices.size === 0) return
    
    setPreviewPlaying(true)
    setShowPreview(true)
    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b)
    let currentIndex = 0
    
    const animate = () => {
      const frameIndex = sortedIndices[currentIndex]
      setCurrentPreviewIndex(frameIndex)
      drawPreviewFrame(frameIndex)
      currentIndex = (currentIndex + 1) % sortedIndices.length
    }
    
    animate() // Show first frame immediately
    
    // Use frame delays for accurate timing with speed multiplier
    const getNextDelay = () => {
      const frameIndex = sortedIndices[currentIndex]
      const frame = frames[frameIndex]
      const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
      return Math.max(20, baseDelay / speedMultiplier) // Minimum 20ms to prevent too fast
    }
    
    const scheduleNext = () => {
      previewIntervalRef.current = setTimeout(() => {
        animate()
        scheduleNext()
      }, getNextDelay())
    }
    
    scheduleNext()
  }

  const stopPreview = () => {
    setPreviewPlaying(false)
    if (previewIntervalRef.current) {
      clearTimeout(previewIntervalRef.current)
      previewIntervalRef.current = null
    }
  }

  const exportGif = async (indices?: Set<number>) => {
    const selectedToExport = indices || selectedIndices
    if (selectedToExport.size === 0) return
    
    setIsExporting(true)
    try {
      const sortedIndices = Array.from(selectedToExport).sort((a, b) => a - b)
      const selectedFrames = sortedIndices
        .filter(i => i >= 0 && i < frames.length && frames[i])
        .map(i => frames[i])
      
      if (selectedFrames.length === 0) {
        console.error('No valid frames selected')
        setIsExporting(false)
        return
      }
      
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js'
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = targetSize
      canvas.height = targetSize
      
      for (let i = 0; i < selectedFrames.length; i++) {
        const frame = selectedFrames[i]
        if (!frame || !frame.data) {
          console.error(`Invalid frame at index ${i}`)
          continue
        }
        
        setExportProgress(Math.round((i / selectedFrames.length) * 100))
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)
        
        const tempCanvas = globalCanvasPool.acquire(frame.data.width, frame.data.height)
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(frame.data, 0, 0)
        
        const scale = Math.min(targetSize / tempCanvas.width, targetSize / tempCanvas.height)
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (targetSize - scaledWidth) / 2
        const offsetY = (targetSize - scaledHeight) / 2
        
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
        
        const baseDelay = isVideo ? 100 : ('delay' in frame ? frame.delay : 100)
        const adjustedDelay = Math.max(20, Math.round(baseDelay / speedMultiplier))
        
        gif.addFrame(ctx, {
          copy: true,
          delay: adjustedDelay,
          dispose: 2
        })
        
        // Release temp canvas
        globalCanvasPool.release(tempCanvas)
      }
      
      gif.on('finished', (blob: Blob) => {
        // Pass only the valid indices that were actually used
        const validIndices = sortedIndices.filter(i => i >= 0 && i < frames.length && frames[i])
        onExport(blob, validIndices)
        onClose()
      })
      
      gif.render()
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
              <Progress className="w-48" value={33} />
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
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={smartSelection}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Smart Select
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={randomSelection}
                  className="gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                  Random
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectEveryNth(2)}
                >
                  Every 2nd
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectEveryNth(3)}
                >
                  Every 3rd
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIndices(new Set())}
                >
                  Clear All
                </Button>
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
              {showPreview && (
                <div className="hidden lg:flex lg:flex-1 flex-col gap-4 rounded-lg border bg-muted/20 p-4">
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-sm">Slack Emoji Preview</h3>
                    <p className="text-xs text-muted-foreground">
                      This is how your emoji will look in Slack
                    </p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center">
                    <div className="space-y-4">
                      {/* Actual size preview */}
                      <div className="text-center space-y-2">
                        <p className="text-xs text-muted-foreground">Actual Size (128×128)</p>
                        <div className="inline-block bg-white rounded-lg p-4 shadow-sm">
                          <canvas
                            ref={previewCanvasRef}
                            width={targetSize}
                            height={targetSize}
                            className="pixelated"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        </div>
                      </div>
                      
                      {/* Slack context preview */}
                      <div className="text-center space-y-2">
                        <p className="text-xs text-muted-foreground">In Slack Context</p>
                        <div className="bg-white rounded-lg p-4 shadow-sm">
                          <div className="flex items-center gap-2 text-sm">
                            <span>Great work team!</span>
                            <div 
                              className="inline-block align-middle"
                              style={{ 
                                width: '20px', 
                                height: '20px',
                                backgroundImage: currentPreviewDataUrl ? `url(${currentPreviewDataUrl})` : undefined,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                imageRendering: 'auto' as any
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="text-xs text-muted-foreground space-y-1">
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
                  </Button>
                </div>
                <canvas
                  width={targetSize}
                  height={targetSize}
                  style={{ width: '100px', height: '100px' }}
                  className="bg-white rounded"
                  ref={el => {
                    if (el && previewCanvasRef.current) {
                      const ctx = el.getContext('2d')
                      if (ctx && currentPreviewDataUrl) {
                        const img = document.createElement('img')
                        img.onload = () => {
                          ctx.drawImage(img, 0, 0, targetSize, targetSize)
                        }
                        img.src = currentPreviewDataUrl
                      }
                    }
                  }}
                />
              </div>
            )}

            {/* Export Settings */}
            <div className="space-y-3 pt-3 flex-shrink-0">
              <div className="flex gap-6">
                <div className="flex-1 space-y-2">
                  <Label className="text-sm">Quality (Lower = Smaller file)</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[quality]}
                      onValueChange={([v]) => setQuality(v)}
                      min={1}
                      max={30}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-8">{quality}</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <Label className="text-sm">Output Size</Label>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[targetSize]}
                      onValueChange={([v]) => setTargetSize(v)}
                      min={64}
                      max={128}
                      step={8}
                      disabled
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">{targetSize}px</span>
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
                    onClick={() => setSpeedMultiplier(1.5)}
                    className={cn("text-xs", speedMultiplier === 1.5 && "bg-accent")}
                  >
                    1.5x
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
                    onClick={() => setSpeedMultiplier(3)}
                    className={cn("text-xs", speedMultiplier === 3 && "bg-accent")}
                  >
                    3x
                  </Button>
                  <div className="text-xs text-muted-foreground ml-2">
                    Tip: Speed up for smoother animations
                  </div>
                </div>
              </div>
              
              {selectedIndices.size > 30 && quality > 10 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    With {selectedIndices.size} frames, consider lowering quality to keep file size under 128KB
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
            disabled={selectedIndices.size === 0 || isExporting || isLoading}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Emoji... {exportProgress > 0 && `${exportProgress}%`}
              </>
            ) : (
              <>
                <Film className="h-4 w-4" />
                Create Emoji ({selectedIndices.size} frames)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}