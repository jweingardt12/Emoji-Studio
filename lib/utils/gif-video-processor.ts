import GIF from 'gif.js'

export class GifVideoProcessor {
  static async videoToAnimatedGif(
    file: File,
    targetSize: number = 128,
    maxFrames: number = 50,
    maxFileSize: number = 128 * 1024
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      
      canvas.width = targetSize
      canvas.height = targetSize

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration
          
          // Calculate settings to include entire video, always maximizing frame usage
          const getOptimalSettings = (duration: number, maxFrames: number) => {
            const settings = []
            
            // Always try to use as many frames as possible for best quality
            const idealFps = 10 // Target frame rate for smooth animation
            const totalFramesAt10fps = Math.ceil(duration * idealFps)
            
            let framesToUse: number
            let speedup: number
            let outputFps: number
            
            if (totalFramesAt10fps <= maxFrames) {
              // Video naturally fits - use actual frame count
              framesToUse = totalFramesAt10fps
              speedup = 1.0
              outputFps = idealFps
            } else {
              // Video is too long - ALWAYS use maximum frames and speed up
              framesToUse = maxFrames
              speedup = totalFramesAt10fps / maxFrames
              // Increase output fps to maintain smooth motion when sped up
              outputFps = Math.min(30, idealFps * speedup)
            }
            
            const captureInterval = duration / framesToUse
            
            // Try different quality/size combinations
            settings.push(
              { fps: outputFps, quality: 10, frames: framesToUse, scale: 1.0, speedup: speedup, captureInterval: captureInterval },
              { fps: outputFps, quality: 15, frames: framesToUse, scale: 0.9, speedup: speedup, captureInterval: captureInterval },
              { fps: outputFps, quality: 20, frames: framesToUse, scale: 0.8, speedup: speedup, captureInterval: captureInterval },
              { fps: outputFps, quality: 25, frames: framesToUse, scale: 0.7, speedup: speedup, captureInterval: captureInterval },
              { fps: outputFps, quality: 30, frames: framesToUse, scale: 0.6, speedup: speedup, captureInterval: captureInterval },
              { fps: outputFps, quality: 40, frames: framesToUse, scale: 0.5, speedup: speedup, captureInterval: captureInterval },
              { fps: outputFps, quality: 50, frames: framesToUse, scale: 0.4, speedup: speedup, captureInterval: captureInterval }
            )
            
            console.log(`Video duration: ${duration}s, using ${framesToUse} frames, speedup: ${speedup.toFixed(1)}x`)
            
            return settings
          }
          
          const qualitySettings = getOptimalSettings(duration, maxFrames)

          for (const settings of qualitySettings) {
            const scaledSize = Math.floor(targetSize * settings.scale)
            const result = await this.tryCreateGif(
              video, 
              canvas, 
              ctx, 
              settings.fps, 
              settings.quality, 
              settings.frames,
              scaledSize,
              settings.speedup || 1.0,
              settings.captureInterval
            )
            
            if (result && result.size <= maxFileSize) {
              URL.revokeObjectURL(video.src)
              resolve(result)
              return
            }
          }

          // If all attempts fail, force create a very small GIF but still use max frames
          console.warn('All quality settings exceeded size limit, creating minimal GIF...')
          const speedup = Math.ceil(duration * 10) / maxFrames
          const minimalResult = await this.tryCreateGif(
            video,
            canvas,
            ctx,
            Math.min(20, 10 * speedup), // Higher fps for sped up content
            80, // Very low quality
            maxFrames, // Still use all 50 frames
            48, // Very small size
            speedup,
            duration / maxFrames
          )
          
          if (minimalResult) {
            URL.revokeObjectURL(video.src)
            resolve(minimalResult)
          } else {
            reject(new Error('Could not create GIF even with minimal settings'))
          }
        } catch (error) {
          reject(error)
        }
      }

      video.onerror = () => reject(new Error('Failed to load video'))
      video.src = URL.createObjectURL(file)
    })
  }

  private static async tryCreateGif(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    fps: number,
    quality: number,
    totalFrames: number,
    targetSize: number,
    speedup: number = 1.0,
    captureInterval?: number
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        debug: true // Enable debug mode to see what's happening
      })

      // Calculate frame interval to cover entire video duration
      const videoDuration = video.duration
      const frameInterval = captureInterval || (videoDuration / totalFrames)
      let framesAdded = 0

      const captureFrame = async (frameIndex: number) => {
        if (frameIndex >= totalFrames) {
          // All frames captured, render the GIF
          gif.render()
          return
        }

        // Spread frames evenly across the entire video duration
        video.currentTime = Math.min(frameIndex * frameInterval, videoDuration - 0.01)
        
        await new Promise(resolve => {
          video.onseeked = resolve
        })

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Calculate scaling
        const scale = Math.min(targetSize / video.videoWidth, targetSize / video.videoHeight)
        const scaledWidth = video.videoWidth * scale
        const scaledHeight = video.videoHeight * scale
        const offsetX = (targetSize - scaledWidth) / 2
        const offsetY = (targetSize - scaledHeight) / 2
        
        // Draw frame
        ctx.drawImage(video, offsetX, offsetY, scaledWidth, scaledHeight)
        
        // Add frame to GIF with correct delay
        // Apply speedup to make the GIF play faster if needed
        const baseDelay = 1000 / fps // Normal delay based on fps
        const adjustedDelay = baseDelay / speedup // Speed up the playback
        gif.addFrame(ctx, { copy: true, delay: Math.max(20, Math.round(adjustedDelay)) }) // Min 20ms delay
        framesAdded++
        
        // Continue to next frame
        captureFrame(frameIndex + 1)
      }

      gif.on('finished', (blob: Blob) => {
        console.log(`GIF created: ${framesAdded} frames, ${blob.size} bytes`)
        resolve(blob)
      })

      gif.on('error', () => {
        resolve(null)
      })

      // Start capturing frames
      captureFrame(0)
    })
  }
}