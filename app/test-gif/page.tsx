"use client"

import { useState, useEffect } from "react"
import { GifFrameExtractor, ExtractedFrame } from "@/lib/utils/gif-frame-extractor"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function TestGifPage() {
  const [frames, setFrames] = useState<ExtractedFrame[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [extractionMethod, setExtractionMethod] = useState<string>("")

  useEffect(() => {
    // Auto-load giphy-3.gif on mount
    loadGiphy3()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isPlaying && frames.length > 0) {
      interval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % frames.length)
      }, frames[currentFrame]?.delay || 100)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, currentFrame, frames])

  const loadGiphy3 = async () => {
    setLoading(true)
    setError(null)
    setFrames([])
    
    try {
      const response = await fetch('/emojis/giphy-3.gif')
      const blob = await response.blob()
      const file = new File([blob], 'giphy-3.gif', { type: 'image/gif' })
      
      console.log('[TestGif] Loading giphy-3.gif...')
      
      // Store the original console.log to capture extraction method
      const originalLog = console.log
      let capturedMethod = ""
      
      console.log = function(...args) {
        originalLog.apply(console, args)
        const msg = args[0]
        if (typeof msg === 'string') {
          if (msg.includes('[GifFrameExtractor] Attempting canvas frame extraction...')) {
            capturedMethod = "Canvas Frame"
          } else if (msg.includes('[GifFrameExtractor] Attempting accumulative extraction...')) {
            capturedMethod = "Accumulative"
          } else if (msg.includes('[GifFrameExtractor] Attempting proper omggif extraction...')) {
            capturedMethod = "Proper omggif"
          } else if (msg.includes('[GifFrameExtractor] Attempting WebCodecs extraction...')) {
            capturedMethod = "WebCodecs API"
          } else if (msg.includes('[GifFrameExtractor] Attempting diagnostic extraction...')) {
            capturedMethod = "Diagnostic"
          } else if (msg.includes('[GifFrameExtractor] Attempting indexed decoder extraction...')) {
            capturedMethod = "Indexed Decoder"  
          } else if (msg.includes('[GifFrameExtractor] Attempting simple decoder extraction...')) {
            capturedMethod = "Simple Decoder"
          } else if (msg.includes('[GifFrameExtractor] Attempting Gifler extraction...')) {
            capturedMethod = "Gifler"
          } else if (msg.includes('[GifFrameExtractor] Attempting libgif extraction...')) {
            capturedMethod = "libgif"
          } else if (msg.includes('[GifCanvasFrameExtractor] Captured')) {
            capturedMethod = "Canvas Frame"
          } else if (msg.includes('[GifAccumulativeExtractor] Successfully extracted')) {
            capturedMethod = "Accumulative"
          } else if (msg.includes('[GifOmggifProper] Successfully extracted')) {
            capturedMethod = "Proper omggif"
          } else if (msg.includes('[GifWebCodecsExtractor] Successfully extracted')) {
            capturedMethod = "WebCodecs API"
          } else if (msg.includes('[GifDiagnosticExtractor]') && msg.includes('loaded')) {
            capturedMethod = "Diagnostic"
          } else if (msg.includes('[GifIndexedDecoder] Successfully extracted')) {
            capturedMethod = "Indexed Decoder"
          } else if (msg.includes('[GifDecoderSimple] Successfully extracted')) {
            capturedMethod = "Simple Decoder"
          } else if (msg.includes('[GifFrameExtractor] Successfully extracted') && msg.includes('frames using')) {
            // Extract method from success message
            if (msg.includes('Gifler')) capturedMethod = "Gifler"
            else if (msg.includes('libgif')) capturedMethod = "libgif"
            else if (msg.includes('omggif')) capturedMethod = "omggif"
            else if (msg.includes('proper')) capturedMethod = "Proper (with compositing)"
            else if (msg.includes('native')) capturedMethod = "Browser native"
            else if (msg.includes('safe')) capturedMethod = "Safe extraction"
          }
        }
      }
      
      const extractedFrames = await GifFrameExtractor.extractFrames(file)
      
      // Restore original console.log
      console.log = originalLog
      
      console.log(`[TestGif] Extracted ${extractedFrames.length} frames using ${capturedMethod || 'unknown'} method`)
      setExtractionMethod(capturedMethod || "Unknown")
      setFrames(extractedFrames)
    } catch (err) {
      console.error('[TestGif] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load GIF')
    } finally {
      setLoading(false)
    }
  }

  const renderFrame = (frame: ExtractedFrame) => {
    const canvas = document.createElement('canvas')
    canvas.width = frame.data.width
    canvas.height = frame.data.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.putImageData(frame.data, 0, 0)
      return canvas.toDataURL()
    }
    return ''
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">GIF Frame Extractor Test - giphy-3.gif</h1>
      
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={loadGiphy3} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Reload GIF'
              )}
            </Button>
            
            {frames.length > 0 && (
              <>
                <Button onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? 'Pause' : 'Play'} Animation
                </Button>
                <span className="text-sm text-muted-foreground">
                  Frame {currentFrame + 1} of {frames.length}
                </span>
              </>
            )}
          </div>
          
          {extractionMethod && (
            <div className="text-sm">
              <strong>Extraction Method:</strong> {extractionMethod}
            </div>
          )}
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>
      </Card>
      
      {frames.length > 0 && (
        <>
          {/* Current frame preview */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Frame Preview</h2>
            <div className="flex justify-center">
              <img 
                src={renderFrame(frames[currentFrame])} 
                alt={`Frame ${currentFrame + 1}`}
                className="border rounded"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <div className="text-center mt-2 text-sm text-muted-foreground">
              Delay: {frames[currentFrame].delay}ms
            </div>
          </Card>
          
          {/* Frame grid */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">All Frames</h2>
            <div className="grid grid-cols-8 gap-2">
              {frames.map((frame, index) => (
                <div 
                  key={index} 
                  className={`border rounded p-1 cursor-pointer ${
                    index === currentFrame ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setCurrentFrame(index)}
                >
                  <img 
                    src={renderFrame(frame)} 
                    alt={`Frame ${index + 1}`}
                    className="w-full h-auto"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <div className="text-xs text-center mt-1">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}