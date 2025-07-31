import { parseGIF, decompressFrames } from 'gifuct-js'
import GIF from 'gif.js'

export interface ExtractedFrame {
  data: ImageData
  delay: number
}

export class GifFrameExtractor {
  static async extractFrames(file: File): Promise<ExtractedFrame[]> {
    const arrayBuffer = await file.arrayBuffer()
    
    // Log file details for debugging
    console.log(`Extracting frames from GIF: ${file.name}, size: ${file.size} bytes`)
    
    // Log file size for monitoring
    if (file.size > 50 * 1024 * 1024) {
      console.warn(`Processing large GIF file: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
    }
    
    let gif: any
    let frames: any[]
    
    try {
      gif = parseGIF(arrayBuffer)
      frames = decompressFrames(gif, true)
    } catch (parseError) {
      console.error('Failed to parse GIF with gifuct-js:', parseError)
      const header = new Uint8Array(arrayBuffer.slice(0, 10))
      console.log('GIF file header:', Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' '))
      
      // Check if it's actually a GIF
      const isGif = header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46
      if (!isGif) {
        throw new Error('SKIP_FRAME_EDITOR: Not a valid GIF file')
      }
      
      // Try to provide more context about the error
      if (parseError instanceof Error && parseError.message.includes('Unknown block')) {
        throw new Error('SKIP_FRAME_EDITOR: GIF contains unsupported extensions')
      }
      
      throw new Error(`SKIP_FRAME_EDITOR: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`)
    }
    
    console.log(`Parsed GIF: dimensions=${gif.lsd?.width}x${gif.lsd?.height}, frames=${frames?.length || 0}`)
    
    // Check if we got valid data
    if (!gif || !gif.lsd) {
      throw new Error('Invalid GIF structure - missing logical screen descriptor')
    }
    
    // Log dimensions for monitoring
    const width = gif.lsd.width
    const height = gif.lsd.height
    const totalPixels = width * height
    console.log(`GIF dimensions: ${width}x${height} (${(totalPixels / 1000000).toFixed(2)}M pixels)`)
    
    // For extremely large GIFs, warn but continue
    if (width > 5000 || height > 5000 || totalPixels > 25000000) {
      console.warn(`Processing very large GIF: ${width}x${height}. This may take a while or require significant memory.`)
    }
    
    if (!frames || frames.length === 0) {
      console.warn('No frames found in GIF')
      console.log(`GIF dimensions: ${gif.lsd?.width}x${gif.lsd?.height}`)
      
      // Some GIFs might be static images or have format issues
      // Instead of throwing an error, return an indication that this GIF can't be edited
      throw new Error('SKIP_FRAME_EDITOR: No frames found in GIF')
    }
    
    const extractedFrames: ExtractedFrame[] = []
    
    // Create a canvas to properly composite frames
    const canvas = document.createElement('canvas')
    canvas.width = gif.lsd.width
    canvas.height = gif.lsd.height
    
    // Try to get context with error handling
    let ctx: CanvasRenderingContext2D | null
    try {
      ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }
    } catch (canvasError) {
      console.error('Failed to create canvas for GIF dimensions:', canvasError)
      // For very large GIFs, we might not be able to create a canvas
      // Return empty array to indicate we can't extract frames
      throw new Error(`Cannot create canvas for ${width}x${height} GIF. The image is too large for frame extraction.`)
    }
    
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i]
      
      // Handle disposal method from previous frame
      if (i > 0) {
        const prevFrame = frames[i - 1]
        if (prevFrame.disposalType === 2) {
          // Restore to background color
          ctx.fillStyle = 'rgba(0,0,0,0)'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else if (prevFrame.disposalType === 3) {
          // Restore to previous - for now just clear
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        // disposalType 1 = do not dispose (keep previous frame)
      }
      
      // The patch contains the actual pixel data for this frame
      // Check if we have valid patch data
      if (!frame.patch || frame.patch.length === 0) {
        console.warn(`Frame ${i} has no patch data`)
        continue
      }
      
      // Create ImageData from the patch
      try {
        // Check if we have enough memory for this operation
        if (frame.patch.length > 100 * 1024 * 1024) { // 100MB patch
          console.warn(`Frame ${i} has very large patch data: ${(frame.patch.length / 1024 / 1024).toFixed(2)}MB`)
        }
        
        const patchData = new ImageData(
          new Uint8ClampedArray(frame.patch),
          frame.dims.width,
          frame.dims.height
        )
        
        // Put the patch directly on the main canvas at the correct position
        ctx.putImageData(patchData, frame.dims.left, frame.dims.top)
      } catch (dataError) {
        console.error(`Failed to create ImageData for frame ${i}:`, dataError)
        if (dataError instanceof Error && dataError.message.includes('memory')) {
          throw new Error('Out of memory while processing GIF frames. The GIF is too large for frame-by-frame editing.')
        }
        continue
      }
      
      // Get the full composited frame
      let fullFrameData: ImageData
      try {
        fullFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      } catch (getDataError) {
        console.error(`Failed to get image data for frame ${i}:`, getDataError)
        if (i === 0) {
          // If we can't even get the first frame, we need to fail
          throw new Error('Cannot extract frames from this GIF. It may be too large for processing.')
        }
        // Skip this frame and continue
        continue
      }
      
      extractedFrames.push({
        data: fullFrameData,
        delay: frame.delay * 10 || 100 // Convert from centiseconds to milliseconds, default 100ms
      })
      
      console.log(`Frame ${i + 1}: ${frame.dims.width}x${frame.dims.height} at (${frame.dims.left},${frame.dims.top}), delay: ${frame.delay * 10}ms`)
    }
    
    if (extractedFrames.length === 0) {
      throw new Error('No valid frames could be extracted from GIF')
    }
    
    return extractedFrames
  }
  
  static async processAnimatedGif(
    file: File,
    targetSize: number = 128,
    maxFileSize: number = 128 * 1024
  ): Promise<Blob> {
    try {
      // First check if the original is already optimized
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = URL.createObjectURL(file)
      })
      
      if (file.size <= maxFileSize && img.width <= targetSize && img.height <= targetSize) {
        URL.revokeObjectURL(img.src)
        return file
      }
      
      // Extract frames from the original GIF
      console.log('Extracting frames from animated GIF...')
      const frames = await this.extractFrames(file)
      console.log(`Extracted ${frames.length} frames from GIF`)
      
      if (frames.length === 0) {
        throw new Error('No frames found in GIF')
      }
      
      // If only one frame, this might be a static GIF
      if (frames.length === 1) {
        console.warn('GIF has only one frame - might be static')
      }
      
      // Calculate scaling
      const scale = Math.min(targetSize / img.width, targetSize / img.height)
      const scaledWidth = Math.round(img.width * scale)
      const scaledHeight = Math.round(img.height * scale)
      const offsetX = Math.round((targetSize - scaledWidth) / 2)
      const offsetY = Math.round((targetSize - scaledHeight) / 2)
      
      URL.revokeObjectURL(img.src)
      
      // Try different quality settings - more aggressive
      const qualitySettings = [
        { quality: 10, dither: false, workers: 2 },
        { quality: 15, dither: false, workers: 2 },
        { quality: 20, dither: true, workers: 2 },
        { quality: 30, dither: true, workers: 1 },
        { quality: 40, dither: true, workers: 1, reduceFrames: 0.5 }, // Skip every other frame
        { quality: 50, dither: true, workers: 1, reduceFrames: 0.3 }, // Keep only 30% of frames
        { quality: 60, dither: true, workers: 1, reduceFrames: 0.2 }, // Fewer frames
        { quality: 80, dither: true, workers: 1, reduceFrames: 0.1 }, // Much fewer frames
        { quality: 100, dither: true, workers: 1, reduceFrames: 0.05 }, // Only 5% of frames
      ]
      
      for (const settings of qualitySettings) {
        try {
          // Use the calculated scale directly
          const adjustedScaledWidth = scaledWidth
          const adjustedScaledHeight = scaledHeight
          const adjustedOffsetX = offsetX
          const adjustedOffsetY = offsetY
          
          const result = await this.createOptimizedGif(
            frames,
            targetSize,
            adjustedScaledWidth,
            adjustedScaledHeight,
            adjustedOffsetX,
            adjustedOffsetY,
            settings
          )
          
          if (result.size <= maxFileSize) {
            console.log(`Created optimized animated GIF: ${result.size} bytes with quality ${settings.quality}`)
            return result
          } else {
            console.log(`GIF still too large: ${result.size} bytes (limit: ${maxFileSize}) with settings:`, settings)
          }
        } catch (error) {
          console.error(`Failed with quality ${settings.quality}:`, error)
        }
      }
      
      // Last resort: create a minimal GIF with very few frames
      console.warn('All quality settings failed, trying minimal GIF...')
      try {
        const minimalResult = await this.createMinimalGif(frames, targetSize, maxFileSize)
        return minimalResult
      } catch (minimalError) {
        console.error('Even minimal GIF failed:', minimalError)
        throw new Error(`Could not create GIF under ${maxFileSize} bytes. Smallest achieved: varies by settings`)
      }
    } catch (error) {
      console.error('Failed to process animated GIF with frame extraction:', error)
      throw error
    }
  }
  
  private static async createOptimizedGif(
    frames: ExtractedFrame[],
    targetSize: number,
    scaledWidth: number,
    scaledHeight: number,
    offsetX: number,
    offsetY: number,
    settings: {
      quality: number
      dither: boolean
      workers: number
      reduceFrames?: number
    }
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: settings.workers,
        quality: settings.quality,
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        dither: settings.dither,
        repeat: 0 // 0 = infinite loop
      })
      
      // Create canvases for processing
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!
      // Use the full dimensions from the first frame's data
      const firstFrame = frames[0]
      tempCanvas.width = firstFrame.data.width
      tempCanvas.height = firstFrame.data.height
      
      const outputCanvas = document.createElement('canvas')
      const outputCtx = outputCanvas.getContext('2d', { willReadFrequently: true })!
      outputCanvas.width = targetSize
      outputCanvas.height = targetSize
      
      // Process frames
      let framesToProcess = frames
      
      // Reduce frames if needed
      if (settings.reduceFrames && settings.reduceFrames < 1) {
        const step = Math.round(1 / settings.reduceFrames)
        framesToProcess = frames.filter((_, index) => index % step === 0)
        console.log(`Reduced frames from ${frames.length} to ${framesToProcess.length}`)
      }
      
      framesToProcess.forEach((frame, index) => {
        // Put frame data on temp canvas
        tempCtx.putImageData(frame.data, 0, 0)
        
        // Clear output canvas with white background
        outputCtx.fillStyle = 'white'
        outputCtx.fillRect(0, 0, targetSize, targetSize)
        
        // Draw scaled frame onto output canvas
        outputCtx.drawImage(
          tempCanvas,
          0, 0, tempCanvas.width, tempCanvas.height,
          offsetX, offsetY, scaledWidth, scaledHeight
        )
        
        // Add frame to GIF
        const delay = Math.max(20, frame.delay || 100) // Ensure minimum delay
        console.log(`Adding frame ${index + 1}/${framesToProcess.length} with delay: ${delay}ms`)
        
        gif.addFrame(outputCtx, {
          copy: true,
          delay: delay,
          dispose: 2 // Restore to background
        })
      })
      
      gif.on('finished', (blob: Blob) => {
        console.log(`GIF rendered: ${blob.size} bytes, type: ${blob.type}, frames processed: ${framesToProcess.length}`)
        // Ensure the blob has the correct MIME type
        if (blob.type !== 'image/gif') {
          const correctedBlob = new Blob([blob], { type: 'image/gif' })
          resolve(correctedBlob)
        } else {
          resolve(blob)
        }
      })
      
      // Note: gif.js doesn't have error event in types, errors will be thrown synchronously
      
      gif.render()
    })
  }
  
  private static selectFramesEvenly(frames: ExtractedFrame[], count: number): ExtractedFrame[] {
    if (frames.length <= count) return frames
    
    const selected: ExtractedFrame[] = []
    const step = frames.length / count
    
    for (let i = 0; i < count; i++) {
      const index = Math.floor(i * step)
      selected.push(frames[index])
    }
    
    return selected
  }
  
  private static async createMinimalGif(
    frames: ExtractedFrame[],
    targetSize: number,
    maxFileSize: number
  ): Promise<Blob> {
    // Try multiple approaches with fewer frames but maintaining size
    const attempts = [
      { frames: 5, size: 1.0, quality: 100 },  // Full size, 5 frames
      { frames: 3, size: 1.0, quality: 100 },  // Full size, 3 frames
      { frames: 2, size: 1.0, quality: 100 },  // Full size, 2 frames
      { frames: 2, size: 0.8, quality: 100 },  // Slightly smaller as last resort
    ]
    
    for (const attempt of attempts) {
      try {
        const result = await this.createMinimalGifAttempt(
          frames,
          targetSize,
          attempt.frames,
          attempt.size,
          attempt.quality
        )
        
        if (result.size <= maxFileSize) {
          console.log(`Minimal GIF created: ${result.size} bytes with ${attempt.frames} frames at ${attempt.size * 100}% size`)
          return result
        } else {
          console.log(`Minimal attempt failed: ${result.size} bytes (too large)`)
        }
      } catch (error) {
        console.error('Minimal GIF attempt failed:', error)
      }
    }
    
    // Final attempt: single frame
    return this.createSingleFrameGif(frames[0], targetSize)
  }
  
  private static async createMinimalGifAttempt(
    frames: ExtractedFrame[],
    targetSize: number,
    frameCount: number,
    sizeMultiplier: number,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const selectedFrames = this.selectFramesEvenly(frames, frameCount)
      const outputSize = Math.floor(targetSize * sizeMultiplier)
      
      const gif = new GIF({
        workers: 1,
        quality: quality,
        width: outputSize,
        height: outputSize,
        workerScript: '/gif.worker.js',
        dither: true,
        repeat: 0
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      canvas.width = outputSize
      canvas.height = outputSize
      
      selectedFrames.forEach((frame, index) => {
        // Clear canvas
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, outputSize, outputSize)
        
        // Draw frame scaled to fit the output size
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')!
        tempCanvas.width = frame.data.width
        tempCanvas.height = frame.data.height
        tempCtx.putImageData(frame.data, 0, 0)
        
        // Calculate scaling to fit the frame in the output size
        const scale = Math.min(outputSize / tempCanvas.width, outputSize / tempCanvas.height)
        const scaledWidth = tempCanvas.width * scale
        const scaledHeight = tempCanvas.height * scale
        const offsetX = (outputSize - scaledWidth) / 2
        const offsetY = (outputSize - scaledHeight) / 2
        
        ctx.drawImage(tempCanvas, offsetX, offsetY, scaledWidth, scaledHeight)
        
        gif.addFrame(ctx, {
          copy: true,
          delay: 200, // Slower animation
          dispose: 2
        })
      })
      
      gif.on('finished', (blob: Blob) => {
        if (blob.type !== 'image/gif') {
          resolve(new Blob([blob], { type: 'image/gif' }))
        } else {
          resolve(blob)
        }
      })
      
      // Note: gif.js doesn't have error event in types
      
      gif.render()
    })
  }
  
  private static async createSingleFrameGif(
    frame: ExtractedFrame,
    targetSize: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 1,
        quality: 100,
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        repeat: 0
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = targetSize
      canvas.height = targetSize
      
      // Clear and draw
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, targetSize, targetSize)
      
      const tempCanvas = document.createElement('canvas')
      const tempCtx = tempCanvas.getContext('2d')!
      tempCanvas.width = frame.data.width
      tempCanvas.height = frame.data.height
      tempCtx.putImageData(frame.data, 0, 0)
      
      ctx.drawImage(tempCanvas, 0, 0, targetSize, targetSize)
      
      // Add two identical frames to maintain GIF format
      gif.addFrame(ctx, { copy: true, delay: 500 })
      gif.addFrame(ctx, { copy: true, delay: 500 })
      
      gif.on('finished', (blob: Blob) => {
        console.log('Created single-frame GIF as last resort')
        if (blob.type !== 'image/gif') {
          resolve(new Blob([blob], { type: 'image/gif' }))
        } else {
          resolve(blob)
        }
      })
      
      // Note: gif.js doesn't have error event in types
      
      gif.render()
    })
  }
}