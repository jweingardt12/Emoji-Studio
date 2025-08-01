import { parseGIF, decompressFrames } from 'gifuct-js'
import { GifReader } from 'omggif'
import GIF from 'gif.js'

export interface ExtractedFrame {
  data: ImageData
  delay: number
}

export type ProgressCallback = (progress: number, message?: string) => void

/**
 * Clean GIF frame extractor that preserves original quality
 * This implementation avoids pixel manipulation to prevent corruption
 */
export class GifFrameExtractor {
  /**
   * Extract frames from GIF with multiple fallback strategies
   */
  static async extractFrames(file: File, onProgress?: ProgressCallback): Promise<ExtractedFrame[]> {
    console.log(`[GifFrameExtractor] Processing: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB`)
    
    // Report initial progress
    onProgress?.(0, 'Checking file...')
    
    // First check if we should skip extraction
    if (await this.shouldSkipExtraction(file)) {
      throw new Error('SKIP_FRAME_EDITOR: GIF already meets Slack requirements')
    }
    
    // Try canvas frame extraction - uses browser's native GIF rendering
    try {
      console.log('[GifFrameExtractor] Attempting canvas frame extraction...')
      onProgress?.(10, 'Extracting frames using canvas method...')
      const { GifCanvasFrameExtractor } = await import('./gif-canvas-frame-extractor')
      const frames = await GifCanvasFrameExtractor.extractFrames(file, onProgress)
      onProgress?.(100, 'Extraction complete!')
      return frames
    } catch (error) {
      console.warn('[GifFrameExtractor] Canvas frame extraction failed:', error)
    }
    
    
    // Try browser-native extraction (if available)
    try {
      console.log('[GifFrameExtractor] Attempting browser-native extraction...')
      return await this.extractFramesNative(file)
    } catch (error) {
      console.warn('[GifFrameExtractor] Native extraction failed:', error)
    }
    
    // Try omggif extraction
    try {
      console.log('[GifFrameExtractor] Attempting omggif extraction...')
      return await this.extractFramesOmggif(file)
    } catch (error) {
      console.warn('[GifFrameExtractor] Omggif extraction failed:', error)
    }
    
    // Fall back to safe frame extraction
    try {
      console.log('[GifFrameExtractor] Attempting safe frame extraction...')
      return await this.extractFramesSafe(file)
    } catch (error) {
      console.warn('[GifFrameExtractor] Safe extraction failed:', error)
    }
    
    // Last resort: single frame extraction
    console.log('[GifFrameExtractor] Falling back to single frame extraction')
    return await this.extractSingleFrame(file)
  }
  
  /**
   * Check if GIF already meets requirements
   */
  private static async shouldSkipExtraction(file: File): Promise<boolean> {
    if (file.size > 128 * 1024) return false
    
    const img = await this.loadImage(file)
    return img.width <= 128 && img.height <= 128
  }
  
  /**
   * Browser-native frame extraction using ImageDecoder API (when available)
   */
  private static async extractFramesNative(file: File): Promise<ExtractedFrame[]> {
    // Check if ImageDecoder is available (Chrome 94+)
    if ('ImageDecoder' in window) {
      const decoder = new (window as any).ImageDecoder({
        data: file.stream(),
        type: 'image/gif'
      })
      
      await decoder.decode()
      const frames: ExtractedFrame[] = []
      
      for (let i = 0; i < decoder.frameCount; i++) {
        const result = await decoder.decode({ frameIndex: i })
        const bitmap = result.image
        
        // Convert VideoFrame to ImageData
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.displayWidth
        canvas.height = bitmap.displayHeight
        const ctx = canvas.getContext('2d')
        
        if (!ctx) throw new Error('Failed to create canvas context')
        
        ctx.drawImage(bitmap, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        
        frames.push({
          data: imageData,
          delay: result.duration / 1000 // Convert microseconds to milliseconds
        })
        
        bitmap.close()
      }
      
      decoder.close()
      return frames
    }
    
    throw new Error('ImageDecoder not available')
  }
  
  /**
   * Extract frames using omggif library (better color handling)
   */
  private static async extractFramesOmggif(file: File): Promise<ExtractedFrame[]> {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    
    // Parse GIF with omggif
    const reader = new GifReader(uint8Array)
    
    console.log(`[GifFrameExtractor] Omggif - GIF dimensions: ${reader.width}x${reader.height}, frames: ${reader.numFrames()}`)
    
    const extractedFrames: ExtractedFrame[] = []
    
    // Extract each frame
    for (let i = 0; i < reader.numFrames(); i++) {
      // Create a NEW buffer for each frame - this is critical!
      const framePixels = new Uint8ClampedArray(reader.width * reader.height * 4)
      
      // Decode frame into pixel buffer
      reader.decodeAndBlitFrameRGBA(i, framePixels as any)
      
      // Create ImageData from the frame's own pixel buffer
      const imageData = new ImageData(
        new Uint8ClampedArray(framePixels), // Create a copy to ensure independence
        reader.width,
        reader.height
      )
      
      // Get frame info
      const frameInfo = reader.frameInfo(i)
      
      extractedFrames.push({
        data: imageData,
        delay: frameInfo.delay * 10 || 100 // Convert centiseconds to milliseconds
      })
    }
    
    console.log(`[GifFrameExtractor] Successfully extracted ${extractedFrames.length} frames using omggif`)
    return extractedFrames
  }
  
  /**
   * Safe frame extraction that avoids pixel manipulation
   */
  private static async extractFramesSafe(file: File): Promise<ExtractedFrame[]> {
    const arrayBuffer = await file.arrayBuffer()
    const gif = parseGIF(arrayBuffer)
    const frames = decompressFrames(gif, true)
    
    if (!frames || frames.length === 0) {
      throw new Error('No frames found in GIF')
    }
    
    console.log(`[GifFrameExtractor] Found ${frames.length} frames`)
    
    const canvas = document.createElement('canvas')
    canvas.width = gif.lsd.width
    canvas.height = gif.lsd.height
    const ctx = canvas.getContext('2d', { 
      alpha: true,
      willReadFrequently: true 
    })
    
    if (!ctx) throw new Error('Failed to create canvas context')
    
    const extractedFrames: ExtractedFrame[] = []
    
    // Create ImageData for each frame without pixel manipulation
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      
      // Skip frames without valid patch data
      if (!frame.patch || frame.patch.length !== canvas.width * canvas.height * 4) {
        console.warn(`[GifFrameExtractor] Skipping frame ${i} - invalid patch data`)
        continue
      }
      
      try {
        // Create ImageData directly from patch without manipulation
        const imageData = new ImageData(
          new Uint8ClampedArray(frame.patch),
          canvas.width,
          canvas.height
        )
        
        extractedFrames.push({
          data: imageData,
          delay: frame.delay * 10 || 100 // Convert centiseconds to milliseconds
        })
      } catch (error) {
        console.error(`[GifFrameExtractor] Error processing frame ${i}:`, error)
      }
    }
    
    if (extractedFrames.length === 0) {
      throw new Error('No valid frames could be extracted')
    }
    
    return extractedFrames
  }
  
  /**
   * Extract single frame as last resort
   */
  private static async extractSingleFrame(file: File): Promise<ExtractedFrame[]> {
    const img = await this.loadImage(file)
    
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    
    if (!ctx) throw new Error('Failed to create canvas context')
    
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    return [{
      data: imageData,
      delay: 100
    }]
  }
  
  /**
   * Helper to load image from file
   */
  private static async loadImage(file: File): Promise<HTMLImageElement> {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = objectUrl
      })
      
      return img
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }
  
  /**
   * Process animated GIF for Slack emoji requirements
   */
  static async processAnimatedGif(
    file: File,
    targetSize: number = 128,
    maxFileSize: number = 128 * 1024
  ): Promise<Blob> {
    try {
      // Check if already optimized
      const img = await this.loadImage(file)
      if (file.size <= maxFileSize && img.width <= targetSize && img.height <= targetSize) {
        return file
      }
      
      // Extract frames
      const frames = await this.extractFrames(file)
      if (frames.length === 0) {
        throw new Error('No frames found in GIF')
      }
      
      // Calculate optimal settings
      const scale = Math.min(targetSize / img.width, targetSize / img.height)
      const scaledWidth = Math.round(img.width * scale)
      const scaledHeight = Math.round(img.height * scale)
      
      return await this.createOptimizedGif(
        frames,
        targetSize,
        scaledWidth,
        scaledHeight,
        (targetSize - scaledWidth) / 2,
        (targetSize - scaledHeight) / 2
      )
    } catch (error) {
      console.error('Failed to process animated GIF:', error)
      throw error
    }
  }
  
  /**
   * Create optimized GIF from frames
   */
  private static async createOptimizedGif(
    frames: ExtractedFrame[],
    targetSize: number,
    scaledWidth: number,
    scaledHeight: number,
    offsetX: number,
    offsetY: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        dither: false
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = targetSize
      canvas.height = targetSize
      const ctx = canvas.getContext('2d')!
      
      frames.forEach((frame) => {
        // Clear with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)
        
        // Create temp canvas for frame
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = frame.data.width
        tempCanvas.height = frame.data.height
        const tempCtx = tempCanvas.getContext('2d')!
        tempCtx.putImageData(frame.data, 0, 0)
        
        // Draw scaled frame
        ctx.drawImage(
          tempCanvas,
          0, 0, tempCanvas.width, tempCanvas.height,
          offsetX, offsetY, scaledWidth, scaledHeight
        )
        
        gif.addFrame(ctx, {
          copy: true,
          delay: frame.delay,
          dispose: 1
        })
      })
      
      gif.on('finished', (blob: Blob) => {
        resolve(blob.type === 'image/gif' ? blob : new Blob([blob], { type: 'image/gif' }))
      })
      
      gif.render()
    })
  }
}