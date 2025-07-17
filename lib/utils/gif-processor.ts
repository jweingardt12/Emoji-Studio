import GIF from 'gif.js'
import { GifFrameExtractor } from './gif-frame-extractor'
import { AnimatedGifProcessor } from './animated-gif-processor'

export class GifProcessor {
  static async processGif(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    // Check if the original is already within limits
    const img = await this.loadImage(file)
    if (file.size <= maxFileSize && img.width <= targetSize && img.height <= targetSize) {
      return file
    }

    // Try to process with proper frame extraction first
    try {
      console.log('Processing animated GIF with frame extraction...')
      
      // Quick test to see if this is actually an animated GIF
      const testImg = new Image()
      testImg.src = URL.createObjectURL(file)
      await new Promise(resolve => {
        testImg.onload = resolve
        testImg.onerror = resolve
      })
      console.log(`Original GIF dimensions: ${testImg.width}x${testImg.height}`)
      URL.revokeObjectURL(testImg.src)
      
      return await GifFrameExtractor.processAnimatedGif(file, targetSize, maxFileSize)
    } catch (error) {
      console.error('Failed to process with frame extraction, trying fallback method:', error)
      
      // If it's a size limit error, provide more information
      if (error instanceof Error && error.message.includes('Could not create GIF under')) {
        console.warn('GIF is too complex to fit in 128KB while maintaining animation')
      }
      // Try simpler animated GIF processor
      try {
        return await AnimatedGifProcessor.processAnimatedGif(file, targetSize, maxFileSize)
      } catch (fallbackError) {
        console.error('Fallback animated processor failed, trying original method:', fallbackError)
        // Try our original animated GIF processor
        try {
          return await this.processAnimatedGif(file, targetSize, maxFileSize)
        } catch (lastError) {
          console.error('All animated GIF processors failed, falling back to static:', lastError)
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
      try {
        // Create a temporary video element to extract frames
        // This is a workaround since we can't easily parse GIF frames in the browser
        const img = await this.loadImage(file)
        
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
        const canvas = document.createElement('canvas')
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
        reject(error)
      }
    })
  }

  private static async processAnimatedGifLowQuality(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        const img = await this.loadImage(file)
        
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

        const canvas = document.createElement('canvas')
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
          resolve(blob)
        })

        gif.render()
      } catch (error) {
        reject(error)
      }
    })
  }

  private static async processStaticImage(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const img = await this.loadImage(file)
      const canvas = document.createElement('canvas')
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
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      }, 'image/png', 0.95)
    })
  }
  
  
  static async getGifInfo(file: File): Promise<{ frameCount: number; duration: number }> {
    // Basic implementation - in a real app, you'd parse the GIF format
    return {
      frameCount: 1, // Treat as static for now
      duration: 0
    }
  }
}