import GIF from 'gif.js'

export interface VideoProcessingOptions {
  speed?: number // Speed multiplier (0.5 = slow, 2.0 = fast)
  scaleMode?: 'cover' | 'contain' | 'stretch' // How to fit the video in the frame
}

export class GifVideoProcessor {
  static async videoToAnimatedGif(
    file: File,
    targetSize: number = 128,
    maxFrames: number = 50,
    maxFileSize: number = 128 * 1024,
    options?: VideoProcessingOptions
  ): Promise<Blob> {
    console.log('[GifVideoProcessor] Starting video to GIF conversion:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      targetSize,
      maxFrames,
      maxFileSize
    })
    
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      
      // Set video attributes for mobile compatibility
      video.setAttribute('playsinline', 'true')
      video.setAttribute('webkit-playsinline', 'true')
      video.muted = true
      video.autoplay = false
      video.preload = 'metadata'
      
      canvas.width = targetSize
      canvas.height = targetSize

      video.onloadedmetadata = async () => {
        console.log('[GifVideoProcessor] Video metadata loaded:', {
          duration: video.duration,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          options
        })
        try {
          // Apply options
          const speed = options?.speed || 1
          const scaleMode = options?.scaleMode || 'cover'
          
          const fullDuration = video.duration
          const startTime = 0
          const endTime = fullDuration
          const duration = fullDuration
          
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
              settings.fps, // Keep base FPS
              settings.quality, 
              settings.frames,
              scaledSize,
              settings.speedup || 1.0, // Keep base speedup
              settings.captureInterval,
              startTime,
              endTime,
              scaleMode,
              speed // Pass speed as separate parameter
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
            duration / maxFrames,
            startTime,
            endTime,
            scaleMode,
            speed // Pass speed as separate parameter
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

      video.onerror = (e) => {
        console.error('[GifVideoProcessor] Video loading error:', e)
        reject(new Error(`Failed to load video: ${file.name}`))
      }
      
      // Set up video source
      const videoUrl = URL.createObjectURL(file)
      console.log('[GifVideoProcessor] Setting video source:', videoUrl)
      video.src = videoUrl
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
    captureInterval?: number,
    startTime: number = 0,
    endTime?: number,
    scaleMode: 'cover' | 'contain' | 'stretch' = 'cover',
    userSpeed: number = 1.0 // User-specified speed adjustment
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: targetSize,
        height: targetSize,
        workerScript: '/gif.worker.js',
        repeat: 0, // Always loop (Slack doesn't respect loop setting anyway)
        debug: true // Enable debug mode to see what's happening
      })

      // Calculate frame interval to cover the trimmed duration
      const videoDuration = (endTime || video.duration) - startTime
      const frameInterval = captureInterval || (videoDuration / totalFrames)
      let framesAdded = 0

      const captureFrame = async (frameIndex: number) => {
        if (frameIndex >= totalFrames) {
          // All frames captured, render the GIF
          gif.render()
          return
        }

        // Spread frames evenly across the trimmed video duration
        const captureTime = startTime + Math.min(frameIndex * frameInterval, videoDuration - 0.01)
        video.currentTime = captureTime
        
        await new Promise(resolve => {
          video.onseeked = resolve
        })

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Calculate scaling based on scale mode
        let scaledWidth: number, scaledHeight: number, offsetX: number, offsetY: number
        
        if (scaleMode === 'stretch') {
          // Stretch to fill exactly
          scaledWidth = targetSize
          scaledHeight = targetSize
          offsetX = 0
          offsetY = 0
        } else if (scaleMode === 'contain') {
          // Fit entire image, may add padding
          const scale = Math.min(targetSize / video.videoWidth, targetSize / video.videoHeight)
          scaledWidth = video.videoWidth * scale
          scaledHeight = video.videoHeight * scale
          offsetX = (targetSize - scaledWidth) / 2
          offsetY = (targetSize - scaledHeight) / 2
        } else { // cover
          // Fill the frame, may crop edges
          const scale = Math.max(targetSize / video.videoWidth, targetSize / video.videoHeight)
          scaledWidth = video.videoWidth * scale
          scaledHeight = video.videoHeight * scale
          offsetX = (targetSize - scaledWidth) / 2
          offsetY = (targetSize - scaledHeight) / 2
        }
        
        // Draw frame
        ctx.drawImage(video, offsetX, offsetY, scaledWidth, scaledHeight)
        
        // Add frame to GIF with correct delay
        // Apply both speedup and user speed to make the GIF play at desired speed
        const baseDelay = 1000 / fps // Normal delay based on fps
        const adjustedDelay = baseDelay / (speedup * userSpeed) // Apply both speedup factors
        gif.addFrame(ctx, { copy: true, delay: Math.max(20, Math.round(adjustedDelay)) }) // Min 20ms delay
        framesAdded++
        
        // Continue to next frame
        captureFrame(frameIndex + 1)
      }

      gif.on('finished', (blob: Blob) => {
        console.log(`GIF created: ${framesAdded} frames, ${blob.size} bytes, user speed: ${userSpeed}x`)
        resolve(blob)
      })

      // Note: gif.js doesn't have error event in types, errors will be thrown synchronously

      // Start capturing frames
      captureFrame(0)
    })
  }
}