import GIF from 'gif.js'
import { GifFrameExtractor } from './gif-frame-extractor'
import { AnimatedGifProcessor } from './animated-gif-processor'

export class GifProcessor {
  static async processGif(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    // First, verify this is actually a GIF file
    // Check if it's actually a GIF by examining the file content
    const isAnimatedGif = await this.isAnimatedGif(file)
    
    // Check if the original is already within limits
    const img = await this.loadImage(file)
    if (file.size <= maxFileSize && img.width <= targetSize && img.height <= targetSize) {
      return file
    }

    // Try to process with proper frame extraction first
    try {
      URL.revokeObjectURL(img.src)
      
      return await GifFrameExtractor.processAnimatedGif(file, targetSize, maxFileSize)
    } catch (error) {
      
      // If it's a size limit error, provide more information
      if (error instanceof Error && error.message.includes('Could not create GIF under')) {
      }
      // Try simpler animated GIF processor
      try {
        return await AnimatedGifProcessor.processAnimatedGif(file, targetSize, maxFileSize)
      } catch (fallbackError) {
        // Try our original animated GIF processor
        try {
          return await this.processAnimatedGif(file, targetSize, maxFileSize)
        } catch (lastError) {
          // Fall back to static image if animated processing fails
          return this.processStaticImage(file, targetSize, maxFileSize)
        }
      }
    }
  }

  private static loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  private static async processAnimatedGif(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      let img: HTMLImageElement | null = null
      let canvas: HTMLCanvasElement | null = null

      const cleanup = () => {
        if (img?.src) URL.revokeObjectURL(img.src)
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
        }
      }

      try {
        // Create a temporary video element to extract frames
        // This is a workaround since we can't easily parse GIF frames in the browser
        img = await this.loadImage(file)

        // Calculate scaling
        const scale = Math.min(targetSize / img.width, targetSize / img.height)
        const scaledWidth = Math.round(img.width * scale)
        const scaledHeight = Math.round(img.height * scale)
        const offsetX = Math.round((targetSize - scaledWidth) / 2)
        const offsetY = Math.round((targetSize - scaledHeight) / 2)

        // Create GIF encoder
        const gif = new GIF({
          workers: 2,
          quality: 10,
          width: targetSize,
          height: targetSize,
          workerScript: '/gif.worker.js'
        })

        // For now, we'll create a simple animated GIF by duplicating the frame
        // In a real implementation, you'd parse the actual GIF frames
        canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = targetSize
        canvas.height = targetSize

        // Clear canvas
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)

        // Draw scaled image
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

        // Add multiple frames to maintain GIF format
        // This is a simplified approach - ideally we'd extract actual frames
        const frameCount = 10
        const delay = 100

        for (let i = 0; i < frameCount; i++) {
          gif.addFrame(canvas, { copy: true, delay })
        }

        gif.on('finished', (blob: Blob) => {
          cleanup()
          if (blob.size > maxFileSize) {
            // Try with lower quality
            this.processAnimatedGifLowQuality(file, targetSize, maxFileSize)
              .then(resolve)
              .catch(() => {
                // Last resort: convert to static
                this.processStaticImage(file, targetSize, maxFileSize)
                  .then(resolve)
                  .catch(reject)
              })
          } else {
            resolve(blob)
          }
        })

        gif.render()
      } catch (error) {
        cleanup()
        reject(error)
      }
    })
  }

  private static async processAnimatedGifLowQuality(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      let img: HTMLImageElement | null = null
      let canvas: HTMLCanvasElement | null = null

      const cleanup = () => {
        if (img?.src) URL.revokeObjectURL(img.src)
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
        }
      }

      try {
        img = await this.loadImage(file)

        // Calculate scaling with more aggressive size reduction
        const scale = Math.min(targetSize / img.width, targetSize / img.height) * 0.8
        const scaledWidth = Math.round(img.width * scale)
        const scaledHeight = Math.round(img.height * scale)
        const offsetX = Math.round((targetSize - scaledWidth) / 2)
        const offsetY = Math.round((targetSize - scaledHeight) / 2)

        const gif = new GIF({
          workers: 2,
          quality: 30, // Lower quality
          width: targetSize,
          height: targetSize,
          workerScript: '/gif.worker.js'
        })

        canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        canvas.width = targetSize
        canvas.height = targetSize

        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

        // Fewer frames for smaller size
        const frameCount = 5
        const delay = 200

        for (let i = 0; i < frameCount; i++) {
          gif.addFrame(canvas, { copy: true, delay })
        }

        gif.on('finished', (blob: Blob) => {
          cleanup()
          resolve(blob)
        })

        gif.render()
      } catch (error) {
        cleanup()
        reject(error)
      }
    })
  }

  private static async processStaticImage(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      let img: HTMLImageElement | null = null
      let canvas: HTMLCanvasElement | null = null

      const cleanup = () => {
        if (img?.src) URL.revokeObjectURL(img.src)
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
        }
      }

      try {
        img = await this.loadImage(file)
        canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!

        canvas.width = targetSize
        canvas.height = targetSize

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const scale = Math.min(targetSize / img.width, targetSize / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const offsetX = (targetSize - scaledWidth) / 2
        const offsetY = (targetSize - scaledHeight) / 2

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

        canvas.toBlob((blob) => {
          cleanup()
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, 'image/png', 0.95)
      } catch (error) {
        cleanup()
        reject(error)
      }
    })
  }
  
  
  static async getGifInfo(file: File): Promise<{ frameCount: number; duration: number }> {
    try {
      const frames = await GifFrameExtractor.extractFrames(file)
      const duration = frames.reduce((sum, frame) => sum + frame.delay, 0)
      return {
        frameCount: frames.length,
        duration: duration
      }
    } catch (error) {
      return {
        frameCount: 1,
        duration: 0
      }
    }
  }
  
  private static async isAnimatedGif(file: File): Promise<boolean> {
    try {
      // Check file header for GIF signature
      const arrayBuffer = await file.slice(0, 6).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
      // Check for GIF signature (GIF87a or GIF89a)
      if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        // Try to parse and check frame count
        try {
          const info = await this.getGifInfo(file)

          // If we couldn't extract frames but file is large, assume it's animated
          if (info.frameCount === 0 && file.size > 100 * 1024) {
            return true
          }
          
          return info.frameCount > 1
        } catch (parseError) {
          return true // Assume it's animated if we can't parse
        }
      }
      
      return false
    } catch (error) {
      return false
    }
  }
}