import { parseGIF, decompressFrames } from 'gifuct-js'
import { GifReader } from 'omggif'
import GIF from 'gif.js'

export interface ExtractedFrame {
  data: ImageData
  delay: number
}

export type ProgressCallback = (progress: number, message?: string) => void

/**
 * Universal GIF frame extractor that prioritizes fidelity
 * Uses browser-native capabilities first, then falls back to libraries
 */
export class GifFrameExtractor {
  /**
   * Extract frames from GIF with maximum fidelity
   */
  static async extractFrames(file: File, onProgress?: ProgressCallback): Promise<ExtractedFrame[]> {
    onProgress?.(0, 'Starting extraction...')
    
    // Check if we should skip extraction
    if (await this.shouldSkipExtraction(file)) {
      throw new Error('SKIP_FRAME_EDITOR: GIF already meets Slack requirements')
    }
    
    // For speed, try gifuct-js first as it's fastest and usually works well
    try {
      const frames = await this.extractFramesGifuct(file, onProgress)
      if (frames.length > 0) {
        onProgress?.(100, 'Extraction complete!')
        return frames
      }
    } catch (error) {
    }
    
    // Method 2: omggif as second option (faster than ImageDecoder)
    try {
      const frames = await this.extractFramesOmggif(file, onProgress)
      if (frames.length > 0) {
        onProgress?.(100, 'Extraction complete!')
        return frames
      }
    } catch (error) {
    }
    
    // Method 3: Browser-native ImageDecoder as last resort (can be slow)
    if ('ImageDecoder' in window) {
      try {
        const frames = await this.extractFramesNative(file, onProgress)
        if (frames.length > 0) {
          onProgress?.(100, 'Extraction complete!')
          return frames
        }
      } catch (error) {
      }
    }
    
    // Last resort: single frame
    return await this.extractSingleFrame(file)
  }
  
  /**
   * Browser-native frame extraction using ImageDecoder API
   * This provides the best fidelity as it uses the browser's native decoder
   */
  private static async extractFramesNative(file: File, onProgress?: ProgressCallback): Promise<ExtractedFrame[]> {
    const decoder = new (window as any).ImageDecoder({
      data: file.stream(),
      type: 'image/gif'
    })
    
    // Wait for the decoder to be ready
    await decoder.completed
    
    const frames: ExtractedFrame[] = []
    const frameCount = decoder.frameCount || 0

    if (frameCount === 0) {
      throw new Error('ImageDecoder found no frames')
    }
    
    for (let i = 0; i < frameCount; i++) {
      onProgress?.(10 + (i / frameCount) * 80, `Extracting frame ${i + 1} of ${frameCount}...`)
      
      const result = await decoder.decode({ frameIndex: i })
      const bitmap = result.image
      
      // Create canvas to convert VideoFrame to ImageData
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.displayWidth || bitmap.codedWidth
      canvas.height = bitmap.displayHeight || bitmap.codedHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      if (!ctx) throw new Error('Failed to create canvas context')
      
      ctx.drawImage(bitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      
      frames.push({
        data: new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        ),
        delay: (result.duration || 100000) / 1000 // microseconds to milliseconds
      })
      
      bitmap.close()
    }
    
    decoder.close()
    return frames
  }
  
  /**
   * Extract frames by letting the browser render the GIF naturally
   * This method captures frames as the GIF plays in an img element
   */
  private static async extractFramesBrowserRendering(file: File, onProgress?: ProgressCallback): Promise<ExtractedFrame[]> {
    // First, use gifuct to get frame count and delays
    const arrayBuffer = await file.arrayBuffer()
    const gif = parseGIF(arrayBuffer)
    const gifFrames = decompressFrames(gif, false)
    
    if (!gifFrames || gifFrames.length === 0) {
      throw new Error('No frames found in GIF')
    }
    
    const frameCount = gifFrames.length
    const delays = gifFrames.map(f => f.delay * 10 || 100)

    // Load GIF as image
    const url = URL.createObjectURL(file)
    const img = new Image()
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          const frames: ExtractedFrame[] = []
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          
          if (!ctx) {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to create canvas context'))
            return
          }
          
          // Create offscreen container for GIF
          const container = document.createElement('div')
          container.style.position = 'fixed'
          container.style.left = '-9999px'
          container.style.top = '-9999px'
          container.style.width = `${img.width}px`
          container.style.height = `${img.height}px`
          document.body.appendChild(container)
          
          // Clone image for each frame capture
          for (let i = 0; i < frameCount; i++) {
            onProgress?.(10 + (i / frameCount) * 80, `Capturing frame ${i + 1} of ${frameCount}...`)
            
            // Create new image element for this frame
            const frameImg = new Image()
            frameImg.src = url
            
            // Wait for specific frame timing
            const targetTime = delays.slice(0, i).reduce((a, b) => a + b, 0)
            
            await new Promise<void>((resolve) => {
              frameImg.onload = () => {
                // Wait for the right moment
                setTimeout(() => {
                  ctx.clearRect(0, 0, canvas.width, canvas.height)
                  ctx.drawImage(frameImg, 0, 0)
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                  
                  frames.push({
                    data: new ImageData(
                      new Uint8ClampedArray(imageData.data),
                      imageData.width,
                      imageData.height
                    ),
                    delay: delays[i]
                  })
                  
                  resolve()
                }, targetTime % 3000) // Modulo to keep timing reasonable
              }
            })
          }
          
          // Cleanup
          document.body.removeChild(container)
          URL.revokeObjectURL(url)
          
          resolve(frames)
        } catch (error) {
          URL.revokeObjectURL(url)
          reject(error)
        }
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load GIF'))
      }
      
      img.src = url
    })
  }
  
  /**
   * Extract frames using gifuct-js with proper compositing
   */
  private static async extractFramesGifuct(file: File, onProgress?: ProgressCallback): Promise<ExtractedFrame[]> {
    const arrayBuffer = await file.arrayBuffer()
    const gif = parseGIF(arrayBuffer)
    const frames = decompressFrames(gif, true)
    
    if (!frames || frames.length === 0) {
      throw new Error('No frames found in GIF')
    }
    
    const canvas = document.createElement('canvas')
    canvas.width = gif.lsd.width
    canvas.height = gif.lsd.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx) throw new Error('Failed to create canvas context')
    
    const extractedFrames: ExtractedFrame[] = []
    let previousImageData: ImageData | null = null
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      onProgress?.(10 + (i / frames.length) * 80, `Processing frame ${i + 1} of ${frames.length}...`)
      
      if (!frame.patch || frame.patch.length === 0) {
        continue
      }
      
      // Handle disposal from previous frame
      if (i > 0) {
        const prevFrame = frames[i - 1]
        if (prevFrame.disposalType === 2) {
          // Clear to background
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        } else if (prevFrame.disposalType === 3 && previousImageData) {
          // Restore to previous
          ctx.putImageData(previousImageData, 0, 0)
        }
        // disposalType 0 or 1: don't dispose, leave canvas as is
      }
      
      // Save state before drawing if next frame needs it
      if (frame.disposalType === 3) {
        previousImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      }
      
      // Draw frame patch
      const patchData = new ImageData(
        new Uint8ClampedArray(frame.patch),
        frame.dims.width,
        frame.dims.height
      )
      
      // Use temporary canvas to draw patch
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = frame.dims.width
      tempCanvas.height = frame.dims.height
      const tempCtx = tempCanvas.getContext('2d')

      if (tempCtx) {
        tempCtx.putImageData(patchData, 0, 0)
        ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top)
      }

      // Clean up temp canvas
      tempCanvas.width = 0
      tempCanvas.height = 0

      // Capture composited frame
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      extractedFrames.push({
        data: new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        ),
        delay: frame.delay * 10 || 100
      })

      // Yield to main thread every 10 frames to prevent UI freezing
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    if (extractedFrames.length === 0) {
      throw new Error('No valid frames extracted')
    }
    
    return extractedFrames
  }
  
  /**
   * Extract frames using omggif with manual compositing
   */
  private static async extractFramesOmggif(file: File, onProgress?: ProgressCallback): Promise<ExtractedFrame[]> {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const reader = new GifReader(uint8Array)
    
    const frameCount = reader.numFrames()

    const canvas = document.createElement('canvas')
    canvas.width = reader.width
    canvas.height = reader.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx) throw new Error('Failed to create canvas context')
    
    const extractedFrames: ExtractedFrame[] = []
    let previousImageData: ImageData | null = null
    
    for (let i = 0; i < frameCount; i++) {
      onProgress?.(10 + (i / frameCount) * 80, `Extracting frame ${i + 1} of ${frameCount}...`)
      
      const frameInfo = reader.frameInfo(i)
      const framePixels = new Uint8ClampedArray(reader.width * reader.height * 4)
      
      // Handle disposal from previous frame
      if (i > 0) {
        const prevFrameInfo = reader.frameInfo(i - 1)
        
        if (prevFrameInfo.disposal === 2) {
          // Clear to background
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        } else if (prevFrameInfo.disposal === 3 && previousImageData) {
          // Restore to previous
          ctx.putImageData(previousImageData, 0, 0)
        }
        // disposal 0 or 1: keep canvas as is
      } else {
        // First frame - clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      
      // Save state if needed for next frame
      if (frameInfo.disposal === 3) {
        previousImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      }
      
      // Decode frame into buffer
      reader.decodeAndBlitFrameRGBA(i, framePixels as any)
      
      // Create ImageData from decoded pixels
      const frameData = new ImageData(framePixels, reader.width, reader.height)
      
      // Composite frame onto canvas
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = reader.width
      tempCanvas.height = reader.height
      const tempCtx = tempCanvas.getContext('2d')
      
      if (tempCtx) {
        tempCtx.putImageData(frameData, 0, 0)

        // Draw with proper compositing
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(
          tempCanvas,
          frameInfo.x || 0,
          frameInfo.y || 0,
          frameInfo.width || reader.width,
          frameInfo.height || reader.height
        )
      }

      // Clean up temp canvas
      tempCanvas.width = 0
      tempCanvas.height = 0

      // Capture composited result
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      extractedFrames.push({
        data: new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        ),
        delay: frameInfo.delay * 10 || 100
      })

      // Yield to main thread every 10 frames to prevent UI freezing
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // Clean up main canvas
    canvas.width = 0
    canvas.height = 0

    return extractedFrames
  }
  
  /**
   * Extract single frame as fallback
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
      data: new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ),
      delay: 100
    }]
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
        return file
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
        quality: 5, // Balance between quality and speed (1-30)
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        dither: false, // Disable dithering for speed
        repeat: 0, // Loop forever (important for animation)
        transparent: null,
        background: '#FFFFFF'
      })
      
      const canvas = document.createElement('canvas')
      canvas.width = targetSize
      canvas.height = targetSize
      const ctx = canvas.getContext('2d', { 
        alpha: true,
        desynchronized: false,
        willReadFrequently: true
      })!
      
      // Enable high quality image rendering
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      frames.forEach((frame) => {
        // Clear with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)
        
        // Create temp canvas for frame with high quality settings
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = frame.data.width
        tempCanvas.height = frame.data.height
        const tempCtx = tempCanvas.getContext('2d', {
          alpha: true,
          willReadFrequently: true
        })!
        
        tempCtx.putImageData(frame.data, 0, 0)
        
        // Use high quality scaling
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
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
      
      gif.on('error' as any, (error: any) => {
        reject(error)
      })
      
      gif.render()
    })
  }
}