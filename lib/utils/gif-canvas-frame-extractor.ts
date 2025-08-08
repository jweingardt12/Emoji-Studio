/**
 * GIF Canvas Frame Extractor - Extracts multiple frames using canvas rendering
 * This avoids the omggif pixel corruption issue by using the browser's native GIF renderer
 */

import { GifReader } from 'omggif'

export interface ExtractedFrame {
  data: ImageData
  delay: number
}

export type ProgressCallback = (progress: number, message?: string) => void

export class GifCanvasFrameExtractor {
  static async extractFrames(file: File, onProgress?: ProgressCallback): Promise<ExtractedFrame[]> {
    console.log(`[GifCanvasFrameExtractor] Processing: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB`)
    
    // Report initial progress
    onProgress?.(15, 'Reading GIF file...')
    
    // First, get frame count and timing info from omggif
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const reader = new GifReader(uint8Array as any)
    
    console.log(`[GifCanvasFrameExtractor] GIF has ${reader.numFrames()} frames`)
    onProgress?.(20, `Found ${reader.numFrames()} frames`)
    
    // Get frame delays from omggif (this part works correctly)
    const frameDelays: number[] = []
    for (let i = 0; i < reader.numFrames(); i++) {
      const frameInfo = reader.frameInfo(i)
      // Convert centiseconds to milliseconds (no speed change)
      const delayMs = frameInfo.delay * 10 || 100
      frameDelays.push(delayMs)
    }
    
    // For single-frame GIFs, just render once
    if (reader.numFrames() === 1) {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to load GIF'))
          img.src = url
        })
        
        const canvas = document.createElement('canvas')
        // Use naturalWidth/naturalHeight if available, fallback to width/height, then reader dimensions
        const imgWidth = img.naturalWidth || img.width || reader.width
        const imgHeight = img.naturalHeight || img.height || reader.height
        
        if (imgWidth === 0 || imgHeight === 0) {
          console.error('[GifCanvasFrameExtractor] Invalid image dimensions for single frame:', { 
            naturalWidth: img.naturalWidth, 
            naturalHeight: img.naturalHeight,
            width: img.width,
            height: img.height,
            readerWidth: reader.width,
            readerHeight: reader.height
          })
          throw new Error('Invalid image dimensions - cannot extract frame')
        }
        
        canvas.width = imgWidth
        canvas.height = imgHeight
        const ctx = canvas.getContext('2d')
        
        if (!ctx) throw new Error('Failed to create canvas context')
        
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        return [{
          data: imageData,
          delay: frameDelays[0]
        }]
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    
    // For multi-frame GIFs, we need a different approach
    // Since we can't control which frame the browser shows, we'll extract frames
    // by letting the GIF play in a hidden element and capturing at intervals
    
    const frames: ExtractedFrame[] = []
    const url = URL.createObjectURL(file)
    
    try {
      // Create a container for the GIF
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '-9999px'
      container.style.width = '0'
      container.style.height = '0'
      container.style.overflow = 'hidden'
      document.body.appendChild(container)
      
      // Create image element
      const img = document.createElement('img')
      img.src = url
      container.appendChild(img)
      
      // Wait for image to load
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load GIF'))
      })
      
      // Create canvas for capturing
      const canvas = document.createElement('canvas')
      // Use naturalWidth/naturalHeight if available, fallback to width/height, then reader dimensions
      const imgWidth = img.naturalWidth || img.width || reader.width
      const imgHeight = img.naturalHeight || img.height || reader.height
      
      if (imgWidth === 0 || imgHeight === 0) {
        console.error('[GifCanvasFrameExtractor] Invalid image dimensions:', { 
          naturalWidth: img.naturalWidth, 
          naturalHeight: img.naturalHeight,
          width: img.width,
          height: img.height,
          readerWidth: reader.width,
          readerHeight: reader.height
        })
        throw new Error('Invalid image dimensions - cannot extract frames')
      }
      
      canvas.width = imgWidth
      canvas.height = imgHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Failed to create canvas context')
      
      // Calculate total duration
      const totalDuration = frameDelays.reduce((sum, delay) => sum + delay, 0)
      
      // Capture frames at calculated intervals
      let capturedFrames = 0
      const captureInterval = Math.max(20, totalDuration / reader.numFrames())
      
      // Function to capture current frame
      const captureFrame = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        // Check if this frame is different from the last
        if (frames.length === 0 || !this.framesAreIdentical(frames[frames.length - 1].data, imageData)) {
          frames.push({
            data: new ImageData(
              new Uint8ClampedArray(imageData.data),
              imageData.width,
              imageData.height
            ),
            delay: frameDelays[Math.min(capturedFrames, frameDelays.length - 1)]
          })
          capturedFrames++
          
          // Report progress
          const progress = 30 + Math.round((capturedFrames / reader.numFrames()) * 60)
          onProgress?.(progress, `Extracting frame ${capturedFrames} of ${reader.numFrames()}...`)
        }
      }
      
      // Capture first frame immediately
      captureFrame()
      
      // Set up interval to capture more frames
      const intervalId = setInterval(() => {
        captureFrame()
        
        // Stop when we have enough unique frames or after reasonable time
        if (frames.length >= reader.numFrames() || capturedFrames > reader.numFrames() * 2) {
          clearInterval(intervalId)
        }
      }, captureInterval)
      
      // Wait for capture to complete
      await new Promise(resolve => setTimeout(resolve, totalDuration * 2))
      clearInterval(intervalId)
      
      // Clean up
      document.body.removeChild(container)
      
      console.log(`[GifCanvasFrameExtractor] Captured ${frames.length} unique frames`)
      
      // If we only captured 1 frame but the GIF has multiple frames, this method failed
      if (frames.length <= 1 && reader.numFrames() > 1) {
        console.warn('[GifCanvasFrameExtractor] Failed to capture animated frames - only got 1 unique frame')
        throw new Error('Canvas extraction failed to capture animated frames')
      }
      
      // If we didn't capture enough frames, pad with the last frame
      while (frames.length < reader.numFrames()) {
        const lastFrame = frames[frames.length - 1]
        frames.push({
          data: new ImageData(
            new Uint8ClampedArray(lastFrame.data.data),
            lastFrame.data.width,
            lastFrame.data.height
          ),
          delay: frameDelays[frames.length]
        })
      }
      
      return frames
      
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  
  private static framesAreIdentical(a: ImageData, b: ImageData): boolean {
    if (a.width !== b.width || a.height !== b.height) return false
    
    // Quick sample check - compare every 1000th pixel
    for (let i = 0; i < a.data.length; i += 4000) {
      if (a.data[i] !== b.data[i] || 
          a.data[i+1] !== b.data[i+1] || 
          a.data[i+2] !== b.data[i+2] || 
          a.data[i+3] !== b.data[i+3]) {
        return false
      }
    }
    
    return true
  }
}