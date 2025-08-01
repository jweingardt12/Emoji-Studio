"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Film, 
  Clock, 
  CheckSquare, 
  Square, 
  Play, 
  Pause, 
  RotateCcw,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  ZoomIn,
  ZoomOut,
  SkipBack,
  SkipForward
} from "lucide-react"
import { GifFrameExtractor, ExtractedFrame } from "@/lib/utils/gif-frame-extractor"
import { VideoFrameExtractor, VideoFrame } from "@/lib/utils/video-frame-extractor"
import GIF from 'gif.js'
import { cn } from "@/lib/utils"

interface GifFrameEditorProps {
  file: File
  isOpen: boolean
  onClose: () => void
  onExport: (blob: Blob, selectedFrames: number[], speedMultiplier: number) => void
}

interface FrameSelection {
  index: number
  selected: boolean
  delay: number
}

type FrameData = ExtractedFrame | VideoFrame

export function GifFrameEditor({ file, isOpen, onClose, onExport }: GifFrameEditorProps) {
  const [frames, setFrames] = useState<FrameData[]>([])
  const [isVideo, setIsVideo] = useState(false)
  const [frameSelections, setFrameSelections] = useState<FrameSelection[]>([])
  const [selectedCount, setSelectedCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isAutoExporting, setIsAutoExporting] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [estimatedSize, setEstimatedSize] = useState(0)
  const [quality, setQuality] = useState(10)
  const [targetSize, setTargetSize] = useState(128)
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const totalDuration = isVideo ? 
    frames.length * 100 : // For videos at 10fps, each frame is 100ms
    frames.reduce((sum, frame) => sum + (frame as ExtractedFrame).delay, 0)

  useEffect(() => {
    if (isOpen && file) {
      loadFrames()
    }
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [file, isOpen])

  useEffect(() => {
    const count = frameSelections.filter(f => f.selected).length
    setSelectedCount(count)
    estimateFileSize(count)
    
    // Safety check: if more than 50 frames are selected, fix it
    if (count > 50) {
      console.error(`WARNING: ${count} frames selected, exceeding limit of 50! Auto-fixing...`)
      let fixedCount = 0
      setFrameSelections(prev => prev.map(frame => {
        if (frame.selected && fixedCount >= 50) {
          return { ...frame, selected: false }
        }
        if (frame.selected) fixedCount++
        return frame
      }))
    }
  }, [frameSelections, quality, targetSize])

  const loadFrames = async () => {
    setIsLoading(true)
    setLoadError(null)
    setIsVideo(file.type.startsWith('video/'))
    console.log(`Loading file: ${file.name}, type: ${file.type}, size: ${file.size}, isVideo: ${file.type.startsWith('video/')}`)
    
    try {
      let extractedFrames: FrameData[]
      
      if (file.type.startsWith('video/')) {
        // Extract video frames
        console.log('Extracting frames from video...')
        const videoFrames = await VideoFrameExtractor.extractFrames(file, 10) // 10 fps
        // Convert video frames to match the interface
        extractedFrames = videoFrames.map(vf => ({
          data: vf.data,
          delay: 100 // 100ms per frame for 10fps
        }))
      } else {
        // Extract GIF frames
        extractedFrames = await GifFrameExtractor.extractFrames(file)
      }
      
      setFrames(extractedFrames)
      
      // Intelligent frame pre-selection
      let selections: FrameSelection[]
      
      if (extractedFrames.length <= 50) {
        // If 50 or fewer frames, select all
        selections = extractedFrames.map((frame, index) => ({
          index,
          selected: true,
          delay: 'delay' in frame ? frame.delay : 100 // VideoFrames use 100ms
        }))
      } else {
        // For more than 50 frames, use intelligent selection
        const targetFrames = 50
        const totalFrames = extractedFrames.length
        
        // Calculate which frames to select to get an even distribution
        const selectedIndices = new Set<number>()
        
        // Always include first and last frames
        selectedIndices.add(0)
        selectedIndices.add(totalFrames - 1)
        
        // Distribute remaining frames evenly
        const step = (totalFrames - 1) / (targetFrames - 1)
        for (let i = 1; i < targetFrames - 1; i++) {
          const index = Math.round(i * step)
          selectedIndices.add(index)
        }
        
        selections = extractedFrames.map((frame, index) => ({
          index,
          selected: selectedIndices.has(index),
          delay: 'delay' in frame ? frame.delay : 100 // VideoFrames use 100ms
        }))
        
        // Debug: count selected frames
        const selectedCount = selections.filter(s => s.selected).length
        console.log(`Initial selection: ${selectedCount} frames selected out of ${totalFrames} (target: ${targetFrames})`)
        console.log(`Selected indices size: ${selectedIndices.size}`)
      }
      
      setFrameSelections(selections)
      drawFrame(0)
    } catch (error) {
      console.error("Failed to extract frames:", error)
      const errorMessage = error instanceof Error ? error.message : 
        (isVideo ? 'Failed to extract frames from video' : 'Failed to extract frames from GIF')
      setLoadError(errorMessage)
      
      // If we can't extract frames, close the editor and let parent handle it
      if (errorMessage.includes('SKIP_FRAME_EDITOR') || 
          errorMessage.includes('No frames found') || 
          errorMessage.includes('unsupported') ||
          errorMessage.includes('too large') ||
          errorMessage.includes('too many pixels')) {
        // Close the editor immediately for skip errors, with delay for others
        const delay = errorMessage.includes('SKIP_FRAME_EDITOR') ? 500 : 2000
        setTimeout(() => {
          onClose()
        }, delay)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const estimateFileSize = (frameCount: number) => {
    const baseSize = 20 * 1024
    const perFrameSize = quality <= 10 ? 1.5 : quality <= 30 ? 2.0 : 2.5
    const sizeMultiplier = (targetSize / 128) * (targetSize / 128)
    const estimated = baseSize + (frameCount * perFrameSize * 1024 * sizeMultiplier)
    setEstimatedSize(estimated)
  }

  const drawFrame = (frameIndex: number) => {
    if (!previewCanvasRef.current || !frames[frameIndex]) return
    const ctx = previewCanvasRef.current.getContext('2d')
    if (!ctx) return
    
    const frame = frames[frameIndex]
    ctx.putImageData(frame.data, 0, 0)
  }

  const getFrameAtTime = (time: number): number => {
    let accumulatedTime = 0
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      const frameDelay = isVideo ? 100 : ('delay' in frame ? (frame as ExtractedFrame).delay : 100)
      accumulatedTime += frameDelay
      if (accumulatedTime > time) {
        return i
      }
    }
    return frames.length - 1
  }

  const getTimeAtFrame = (frameIndex: number): number => {
    if (isVideo && frames[frameIndex]) {
      // For video frames, we know they're evenly spaced at 100ms (10fps)
      return frameIndex * 100
    }
    
    // For GIFs, accumulate the delays
    let time = 0
    for (let i = 0; i < frameIndex && i < frames.length; i++) {
      time += (frames[i] as ExtractedFrame).delay
    }
    return time
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * totalDuration / timelineZoom
    const frameIndex = getFrameAtTime(time)
    setCurrentFrame(frameIndex)
    drawFrame(frameIndex)
  }

  const handleTimelineDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * totalDuration / timelineZoom
    const frameIndex = getFrameAtTime(time)
    setDragStart(frameIndex)
    setDragEnd(frameIndex)
    setIsDragging(true)
  }

  const handleTimelineDragMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || dragStart === null || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = Math.max(0, Math.min((x / rect.width) * totalDuration / timelineZoom, totalDuration))
    const frameIndex = getFrameAtTime(time)
    setDragEnd(frameIndex)
  }

  const handleTimelineDragEnd = () => {
    if (dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd)
      const end = Math.max(dragStart, dragEnd)
      
      setFrameSelections(prev => {
        const newSelections = [...prev]
        let selectedInRange = 0
        
        for (let i = start; i <= end && i < newSelections.length; i++) {
          if (!newSelections[i].selected && selectedCount + selectedInRange < 50) {
            newSelections[i].selected = true
            selectedInRange++
          }
        }
        
        return newSelections
      })
    }
    
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  const toggleFrame = (index: number) => {
    setFrameSelections(prev => {
      const newSelections = [...prev]
      const currentSelected = newSelections.filter(f => f.selected).length
      
      if (!newSelections[index].selected && currentSelected >= 50) {
        return prev
      }
      
      newSelections[index].selected = !newSelections[index].selected
      return newSelections
    })
  }

  const selectAll = () => {
    setFrameSelections(prev => 
      prev.map((frame, index) => ({
        ...frame,
        selected: index < 50
      }))
    )
  }

  const deselectAll = () => {
    setFrameSelections(prev => 
      prev.map(frame => ({
        ...frame,
        selected: false
      }))
    )
  }

  const selectEveryNth = (n: number) => {
    let selectedSoFar = 0
    setFrameSelections(prev => {
      const newSelections = prev.map((frame, index) => {
        const shouldSelect = index % n === 0 && selectedSoFar < 50
        if (shouldSelect) selectedSoFar++
        return {
          ...frame,
          selected: shouldSelect
        }
      })
      console.log(`selectEveryNth(${n}): Selected ${selectedSoFar} frames out of ${prev.length}`)
      return newSelections
    })
  }

  const selectKeyframes = async () => {
    const total = frames.length
    const maxFrames = Math.min(50, total)
    
    // Create a set of indices to select
    const selectedIndices = new Set<number>()
    
    if (total <= 50) {
      // Select all if 50 or fewer
      for (let i = 0; i < total; i++) {
        selectedIndices.add(i)
      }
    } else {
      // Always include first and last frames
      selectedIndices.add(0)
      selectedIndices.add(total - 1)
      
      // Distribute remaining frames evenly
      const step = (total - 1) / (maxFrames - 1)
      for (let i = 1; i < maxFrames - 1; i++) {
        const index = Math.round(i * step)
        selectedIndices.add(index)
      }
    }
    
    // Verify we have exactly the right number of frames
    console.log(`Smart selection: selected ${selectedIndices.size} frames out of ${total}`)
    
    // Update selections
    const newSelections = frameSelections.map((frame, index) => ({
      ...frame,
      selected: selectedIndices.has(index)
    }))
    setFrameSelections(newSelections)
    
    // If we have more than 50 frames, auto-export after smart selection
    if (total > 50) {
      console.log('Auto-exporting after smart selection for', total, 'frames')
      setIsAutoExporting(true)
      // Small delay to show the selection change
      setTimeout(() => {
        exportGif()
      }, 500)
    }
  }

  const startPreview = () => {
    if (frames.length === 0) return
    
    const selectedFrames = frameSelections
      .map((sel, idx) => sel.selected ? { 
        frame: frames[idx], 
        index: idx, 
        delay: isVideo ? 100 : sel.delay 
      } : null)
      .filter(Boolean) as { frame: FrameData; index: number; delay: number }[]
    
    if (selectedFrames.length === 0) {
      console.warn('No frames selected for preview')
      return
    }
    
    setPreviewPlaying(true)
    
    // Use interval-based animation for more reliable playback
    let currentSelectedIndex = 0
    let lastFrameTime = Date.now()
    
    const animate = () => {
      const now = Date.now()
      const currentFrameData = selectedFrames[currentSelectedIndex]
      
      // Check if it's time to advance to the next frame
      if (now - lastFrameTime >= currentFrameData.delay) {
        currentSelectedIndex = (currentSelectedIndex + 1) % selectedFrames.length
        lastFrameTime = now
        
        const nextFrame = selectedFrames[currentSelectedIndex]
        setCurrentFrame(nextFrame.index)
        drawFrame(nextFrame.index)
      }
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    // Draw first frame immediately
    setCurrentFrame(selectedFrames[0].index)
    drawFrame(selectedFrames[0].index)
    
    // Start animation
    animate()
  }

  const stopPreview = () => {
    setPreviewPlaying(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  const exportGif = async () => {
    setIsExporting(true)
    try {
      const selectedFrames = frameSelections
        .map((sel, idx) => sel.selected ? frames[idx] : null)
        .filter(Boolean) as FrameData[]
      
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
      
      for (const frame of selectedFrames) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)
        
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')!
        tempCanvas.width = frame.data.width
        tempCanvas.height = frame.data.height
        tempCtx.putImageData(frame.data, 0, 0)
        
        const scale = Math.min(targetSize / tempCanvas.width, targetSize / tempCanvas.height)
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (targetSize - scaledWidth) / 2
        const offsetY = (targetSize - scaledHeight) / 2
        
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
        
        const baseDelay = isVideo ? 100 : (frame as ExtractedFrame).delay
        const adjustedDelay = Math.max(20, Math.round(baseDelay / speedMultiplier))
        
        gif.addFrame(ctx, {
          copy: true,
          delay: adjustedDelay,
          dispose: 2
        })
      }
      
      gif.on('finished', (blob: Blob) => {
        const selectedIndices = frameSelections
          .map((sel, idx) => sel.selected ? idx : -1)
          .filter(idx => idx !== -1)
        onExport(blob, selectedIndices, speedMultiplier)
        onClose()
      })
      
      gif.render()
    } catch (error) {
      console.error('Failed to export GIF:', error)
    } finally {
      setIsExporting(false)
      setIsAutoExporting(false)
    }
  }

  const renderTimeline = () => {
    const timelineWidth = timelineRef.current?.clientWidth || 800
    const scaledDuration = totalDuration * timelineZoom
    
    return (
      <div className="relative">
        {/* Timeline controls */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                const newFrame = Math.max(0, currentFrame - 1)
                setCurrentFrame(newFrame)
                drawFrame(newFrame)
              }}
              disabled={currentFrame === 0}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={previewPlaying ? stopPreview : startPreview}
            >
              {previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                const newFrame = Math.min(frames.length - 1, currentFrame + 1)
                setCurrentFrame(newFrame)
                drawFrame(newFrame)
              }}
              disabled={currentFrame === frames.length - 1}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-2">
              Frame {currentFrame + 1} / {frames.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setTimelineZoom(Math.max(0.5, timelineZoom - 0.25))}
              disabled={timelineZoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">
              {Math.round(timelineZoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setTimelineZoom(Math.min(4, timelineZoom + 0.25))}
              disabled={timelineZoom >= 4}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Timeline */}
        <div 
          ref={timelineRef}
          className="relative h-24 bg-muted/50 rounded-lg overflow-hidden cursor-pointer"
          onClick={handleTimelineClick}
          onMouseDown={handleTimelineDragStart}
          onMouseMove={handleTimelineDragMove}
          onMouseUp={handleTimelineDragEnd}
          onMouseLeave={handleTimelineDragEnd}
        >
          {/* Time markers */}
          <div className="absolute top-0 left-0 right-0 h-4 border-b">
            {Array.from({ length: Math.ceil(scaledDuration / 100) + 1 }).map((_, i) => {
              const time = i * 100
              const x = (time / scaledDuration) * timelineWidth
              return (
                <div
                  key={i}
                  className="absolute top-0 text-xs text-muted-foreground"
                  style={{ left: `${x}px` }}
                >
                  <div className="relative">
                    <div className="absolute h-4 w-px bg-border" />
                    <span className="absolute left-1 top-0">{time}ms</span>
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Frames */}
          <div className="absolute top-4 left-0 right-0 bottom-0">
            {frames.map((frame, index) => {
              const startTime = getTimeAtFrame(index)
              const x = (startTime / scaledDuration) * timelineWidth * timelineZoom
              const frameDelay = isVideo ? 100 : (frame as ExtractedFrame).delay
              const width = (frameDelay / scaledDuration) * timelineWidth * timelineZoom
              const isSelected = frameSelections[index]?.selected
              const isInDragRange = isDragging && dragStart !== null && dragEnd !== null &&
                index >= Math.min(dragStart, dragEnd) && index <= Math.max(dragStart, dragEnd)
              
              return (
                <div
                  key={index}
                  className={cn(
                    "absolute top-2 bottom-2 border rounded cursor-pointer transition-all",
                    isSelected ? "bg-primary/20 border-primary" : "bg-muted border-border",
                    isInDragRange && "ring-2 ring-primary/50",
                    index === currentFrame && "ring-2 ring-yellow-500"
                  )}
                  style={{ 
                    left: `${x}px`, 
                    width: `${Math.max(2, width - 1)}px` 
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFrame(index)
                  }}
                >
                  {/* Frame thumbnail */}
                  {width > 20 && (
                    <div className="absolute inset-0 p-1 overflow-hidden">
                      <canvas
                        width={frame.data.width}
                        height={frame.data.height}
                        className="w-full h-full object-contain opacity-50"
                        ref={el => {
                          if (el && width > 40) {
                            const ctx = el.getContext('2d')
                            if (ctx) {
                              ctx.putImageData(frame.data, 0, 0)
                            }
                          }
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Frame number */}
                  <div className="absolute bottom-0 left-0 text-xs px-1 bg-background/80 rounded-tl">
                    {index + 1}
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 p-0.5">
                      <Checkbox checked className="h-3 w-3 pointer-events-none" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none transition-all"
            style={{ 
              left: `${(getTimeAtFrame(currentFrame) / scaledDuration) * timelineWidth * timelineZoom}px` 
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            {isVideo ? 'Video' : 'GIF'} Frame Editor
          </DialogTitle>
          <DialogDescription>
            {isVideo ? 
              `Select up to 50 frames from your video to create a Slack emoji GIF. Current: ${selectedCount}/50 frames` :
              `Select up to 50 frames to include in your Slack emoji. Current: ${selectedCount}/50 frames`
            }
          </DialogDescription>
        </DialogHeader>

        {(isLoading || isAutoExporting) ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              {isAutoExporting && (
                <p className="text-sm text-muted-foreground">Processing your selection...</p>
              )}
            </div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div className="text-center space-y-2">
              <p className="font-semibold">Unable to Edit GIF Frames</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {loadError}
              </p>
              {(loadError.includes('too large') || loadError.includes('memory')) && (
                <p className="text-sm text-muted-foreground">
                  This GIF is too large for frame-by-frame editing. Consider using a smaller GIF or video file.
                </p>
              )}
              {(loadError.includes('No frames found') || loadError.includes('SKIP_FRAME_EDITOR')) && (
                <p className="text-sm text-muted-foreground">
                  This GIF doesn't contain editable frames. It might be a static image or use a special format.
                </p>
              )}
              <p className="text-sm text-muted-foreground font-medium">
                The file will be processed automatically instead.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-1" />
                Select First 50
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>
                <Square className="h-4 w-4 mr-1" />
                Deselect All
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectEveryNth(2)}>
                <Zap className="h-4 w-4 mr-1" />
                Every 2nd Frame
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectEveryNth(3)}>
                <Zap className="h-4 w-4 mr-1" />
                Every 3rd Frame
              </Button>
              <Button 
                size="sm" 
                variant={frames.length > 50 ? "default" : "outline"}
                onClick={selectKeyframes}
                disabled={isAutoExporting || isExporting}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                {frames.length > 50 ? 'Smart Selection & Process' : 'Smart Selection'}
              </Button>
            </div>

            <Tabs defaultValue="timeline" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timeline">Timeline Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview & Export</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline" className="space-y-4">
                {/* Preview Canvas */}
                <div className="flex justify-center">
                  <div className="relative border rounded-lg p-4 bg-muted/50">
                    <canvas
                      ref={previewCanvasRef}
                      width={frames[0]?.data.width || 128}
                      height={frames[0]?.data.height || 128}
                      className="max-w-[256px] max-h-[256px] w-auto h-auto"
                    />
                    {previewPlaying && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Playing
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <ScrollArea className="w-full">
                  {renderTimeline()}
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {selectedCount === 50 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Maximum frame limit reached. Deselect some frames to add others.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="preview" className="space-y-4">
                {/* Preview Canvas */}
                <div className="flex justify-center">
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <canvas
                      width={frames[0]?.data.width || 128}
                      height={frames[0]?.data.height || 128}
                      className="max-w-[256px] max-h-[256px] w-auto h-auto"
                      ref={el => {
                        if (el && frames.length > 0) {
                          const ctx = el.getContext('2d')
                          if (ctx && frames[currentFrame]) {
                            ctx.putImageData(frames[currentFrame].data, 0, 0)
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Preview Controls */}
                <div className="flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={previewPlaying ? stopPreview : startPreview}
                    disabled={selectedCount === 0}
                  >
                    {previewPlaying ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Preview Selected
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCurrentFrame(0)
                      drawFrame(0)
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>

                {/* Export Settings */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Quality (Lower = Smaller file)</Label>
                    <Slider
                      value={[quality]}
                      onValueChange={([v]) => setQuality(v)}
                      min={1}
                      max={100}
                      step={1}
                    />
                    <div className="text-sm text-muted-foreground">
                      Current: {quality} (Estimated size: {(estimatedSize / 1024).toFixed(0)}KB)
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Size</Label>
                    <Slider
                      value={[targetSize]}
                      onValueChange={([v]) => setTargetSize(v)}
                      min={64}
                      max={128}
                      step={8}
                    />
                    <div className="text-sm text-muted-foreground">
                      {targetSize}x{targetSize} pixels
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Speed</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={speedMultiplier === 0.5 ? "default" : "outline"}
                        onClick={() => setSpeedMultiplier(0.5)}
                      >
                        0.5x
                      </Button>
                      <Button
                        size="sm"
                        variant={speedMultiplier === 1 ? "default" : "outline"}
                        onClick={() => setSpeedMultiplier(1)}
                      >
                        1x
                      </Button>
                      <Button
                        size="sm"
                        variant={speedMultiplier === 1.5 ? "default" : "outline"}
                        onClick={() => setSpeedMultiplier(1.5)}
                      >
                        1.5x
                      </Button>
                      <Button
                        size="sm"
                        variant={speedMultiplier === 2 ? "default" : "outline"}
                        onClick={() => setSpeedMultiplier(2)}
                      >
                        2x
                      </Button>
                      <Button
                        size="sm"
                        variant={speedMultiplier === 3 ? "default" : "outline"}
                        onClick={() => setSpeedMultiplier(3)}
                      >
                        3x
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Speed up for smoother animations
                    </div>
                  </div>

                  {estimatedSize > 128 * 1024 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Estimated size exceeds 128KB limit. Reduce quality or select fewer frames.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button 
            onClick={exportGif} 
            disabled={selectedCount === 0 || isExporting || isLoading}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Film className="h-4 w-4 mr-2" />
                {isVideo ? `Create GIF (${selectedCount} frames)` : `Export ${selectedCount} Frames`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}