import GIF from 'gif.js'

// gif.js dither methods
type DitherMethod = 'FloydSteinberg' | 'FalseFloydSteinberg' | 'Stucki' | 'Atkinson'

interface ImprovedGIFOptions {
  width: number
  height: number
  quality?: number
  workers?: number
  workerScript?: string
  dither?: boolean | DitherMethod
  transparent?: number | null
}

interface FrameOptions {
  delay: number
  copy?: boolean
  dispose?: number
}

/**
 * Improved GIF encoder with better color quantization and dithering
 */
export class ImprovedGIFEncoder {
  private gif: any
  private options: ImprovedGIFOptions
  
  constructor(options: ImprovedGIFOptions) {
    this.options = {
      quality: 1, // Use best quality by default
      workers: 4, // Use more workers for faster processing
      workerScript: '/gif.worker.js',
      dither: false, // Disable dithering to avoid noise
      ...options
    }
    
    this.gif = new GIF({
      width: this.options.width,
      height: this.options.height,
      quality: this.options.quality,
      workers: this.options.workers,
      workerScript: this.options.workerScript,
      dither: this.options.dither as any
      // Remove background color - let GIF handle transparency naturally
    })
  }
  
  /**
   * Pre-process image data to improve color accuracy
   */
  private preprocessImageData(ctx: CanvasRenderingContext2D, width: number, height: number): ImageData {
    // Simply return the original image data without modification
    // The gamma correction was causing color corruption
    return ctx.getImageData(0, 0, width, height)
  }
  
  /**
   * Add a frame with improved color handling
   */
  addFrame(ctx: CanvasRenderingContext2D | HTMLCanvasElement, options: FrameOptions): void {
    if (ctx instanceof HTMLCanvasElement) {
      // If canvas element is passed, get its context
      const context = ctx.getContext('2d')
      if (!context) throw new Error('Could not get 2d context from canvas')
      ctx = context
    }
    
    // Add frame directly without modification
    // All preprocessing was causing quality issues
    this.gif.addFrame(ctx, {
      delay: options.delay,
      copy: options.copy !== false, // Default to true
      dispose: options.dispose || 1 // Use "do not dispose" as default
    })
  }
  
  /**
   * Render the GIF
   */
  render(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.gif.on('finished', (blob: Blob) => {
        resolve(blob)
      })
      
      this.gif.on('error', (error: any) => {
        reject(error)
      })
      
      this.gif.render()
    })
  }
  
  /**
   * Set progress callback
   */
  onProgress(callback: (progress: number) => void): void {
    this.gif.on('progress', callback)
  }
}

/**
 * Helper function to create optimal GIF settings based on frame count and dimensions
 */
export function getOptimalGIFSettings(frameCount: number, width: number, height: number) {
  let quality = 1 // Best quality by default
  let dither: boolean | DitherMethod = false // Disable dithering - it causes noise
  
  // Adjust quality based on frame count
  if (frameCount > 30) {
    quality = 2
  }
  if (frameCount > 40) {
    quality = 3
  }
  
  // For very small images, we can use better quality
  if (width <= 128 && height <= 128) {
    quality = Math.max(1, quality - 1)
  }
  
  return { quality, dither }
}