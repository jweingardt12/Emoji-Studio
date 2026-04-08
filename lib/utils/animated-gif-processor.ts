import GIF from 'gif.js'
import { ResourceManager, withResourceCleanup } from './resource-manager'

export class AnimatedGifProcessor {
  static async processAnimatedGif(
    file: File,
    targetSize: number = 128,
    maxFileSize: number = 128 * 1024
  ): Promise<Blob> {
    return withResourceCleanup(async (resources) => {
      // First, check if the GIF is already optimized
      const img = await this.loadImage(file, resources)
      if (file.size <= maxFileSize && img.width <= targetSize && img.height <= targetSize) {
        return file
      }

      // Try to maintain animation by creating a new optimized GIF
      const qualitySettings = [
        { quality: 10, dither: false, workers: 2, repeat: 0 },
        { quality: 15, dither: false, workers: 2, repeat: 0 },
        { quality: 20, dither: true, workers: 2, repeat: 0 },
        { quality: 30, dither: true, workers: 1, repeat: 0 },
      ]

      for (const settings of qualitySettings) {
        try {
          const result = await this.createOptimizedGif(file, targetSize, settings)
          if (result.size <= maxFileSize) {
            return result
          }
        } catch (error) {
          console.error(`Failed with quality ${settings.quality}:`, error)
        }
      }

      // If we still can't get under the size limit, create a highly compressed version
      try {
        const lastResort = await this.createHighlyCompressedGif(file, targetSize)
        if (lastResort.size <= maxFileSize) {
          return lastResort
        }
      } catch (error) {
        console.error('Failed to create highly compressed GIF:', error)
      }

      // As a final fallback, just resize the original without re-encoding
      return this.resizeGifDirectly(file, targetSize, maxFileSize)
    })
  }

  private static loadImage(file: File, resources?: ResourceManager): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      
      if (resources) {
        img.src = resources.createObjectURL(file)
        resources.trackElement(img)
      } else {
        img.src = URL.createObjectURL(file)
      }
    })
  }

  private static async createOptimizedGif(
    file: File,
    targetSize: number,
    settings: { quality: number; dither: boolean; workers: number; repeat: number }
  ): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const img = await this.loadImage(file)
      
      // Calculate scaling
      const scale = Math.min(targetSize / img.width, targetSize / img.height)
      const scaledWidth = Math.round(img.width * scale)
      const scaledHeight = Math.round(img.height * scale)
      const offsetX = Math.round((targetSize - scaledWidth) / 2)
      const offsetY = Math.round((targetSize - scaledHeight) / 2)

      const gif = new GIF({
        workers: settings.workers,
        quality: settings.quality,
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        dither: settings.dither,
        repeat: settings.repeat, // 0 = infinite loop
        transparent: '#FFFFFF' // white transparent
      })

      // Create canvas for drawing frames
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      canvas.width = targetSize
      canvas.height = targetSize

      // Try to maintain GIF animation by drawing the image at different time points
      // We'll use a trick where we draw the GIF multiple times to capture its animation
      const frameDelay = 100 // 100ms between frames
      const maxFrames = 20 // Capture up to 20 frames
      
      // Create a video element to help with GIF frame extraction
      const video = document.createElement('video')
      video.muted = true
      video.loop = true
      
      try {
        // Try to load the GIF as a video (some browsers support this)
        video.src = img.src
        await new Promise((resolve, reject) => {
          video.onloadeddata = resolve
          video.onerror = () => {
            // If video loading fails, fall back to static frames
            resolve(null)
          }
          setTimeout(() => resolve(null), 1000) // Timeout after 1 second
        })
        
        if (video.duration > 0) {
          // Video loaded successfully, extract frames
          const frameCount = Math.min(maxFrames, Math.ceil(video.duration * 10)) // 10 fps
          const frameInterval = video.duration / frameCount
          
          for (let i = 0; i < frameCount; i++) {
            video.currentTime = i * frameInterval
            await new Promise(resolve => {
              video.onseeked = resolve
            })
            
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, targetSize, targetSize)
            ctx.drawImage(video, offsetX, offsetY, scaledWidth, scaledHeight)
            
            gif.addFrame(ctx, {
              copy: true,
              delay: frameDelay,
              dispose: 2
            })
          }
        } else {
          // Fall back to drawing the image multiple times
          // This will at least preserve the GIF format
          const frameCount = 10
          
          for (let i = 0; i < frameCount; i++) {
            ctx.fillStyle = 'white'
            ctx.fillRect(0, 0, targetSize, targetSize)
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
            
            gif.addFrame(ctx, {
              copy: true,
              delay: frameDelay,
              dispose: 2
            })
          }
        }
      } catch (error) {
        console.warn('Failed to extract GIF frames, using static approach:', error)
        // Fallback: just add the same frame multiple times
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, targetSize, targetSize)
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
          
          gif.addFrame(ctx, {
            copy: true,
            delay: frameDelay,
            dispose: 2
          })
        }
      }

      gif.on('finished', (blob: Blob) => {
        URL.revokeObjectURL(img.src)
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

  private static async createHighlyCompressedGif(file: File, targetSize: number): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      const img = await this.loadImage(file)
      
      // More aggressive scaling
      const scale = Math.min(targetSize / img.width, targetSize / img.height) * 0.8
      const scaledWidth = Math.round(img.width * scale)
      const scaledHeight = Math.round(img.height * scale)
      const offsetX = Math.round((targetSize - scaledWidth) / 2)
      const offsetY = Math.round((targetSize - scaledHeight) / 2)

      const gif = new GIF({
        workers: 1,
        quality: 50, // Very low quality
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        dither: true,
        repeat: 0
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = targetSize
      canvas.height = targetSize

      // Fewer frames for smaller size
      const frameCount = 5
      const frameDuration = 200

      // Create basic animation frames
      for (let i = 0; i < frameCount; i++) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
        
        gif.addFrame(ctx, {
          copy: true,
          delay: frameDuration,
          dispose: 2
        })
      }

      gif.on('finished', (blob: Blob) => {
        URL.revokeObjectURL(img.src)
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

  private static async resizeGifDirectly(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    // Use canvas to resize the GIF as a static image
    const img = await this.loadImage(file)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    canvas.width = targetSize
    canvas.height = targetSize
    
    const scale = Math.min(targetSize / img.width, targetSize / img.height)
    const scaledWidth = img.width * scale
    const scaledHeight = img.height * scale
    const offsetX = (targetSize - scaledWidth) / 2
    const offsetY = (targetSize - scaledHeight) / 2
    
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, targetSize, targetSize)
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
    
    URL.revokeObjectURL(img.src)
    
    // Try to return as GIF first, then fall back to PNG
    return new Promise((resolve) => {
      // First try GIF format
      canvas.toBlob((blob) => {
        if (blob && blob.size <= maxFileSize) {
          resolve(blob)
        } else {
          // Fall back to PNG
          canvas.toBlob((pngBlob) => {
            resolve(pngBlob || new Blob())
          }, 'image/png', 0.9)
        }
      }, 'image/gif')
    })
  }
}