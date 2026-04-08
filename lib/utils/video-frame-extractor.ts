export interface VideoFrame {
  data: ImageData
  time: number // Time in milliseconds
  index: number
}

export type ProgressCallback = (progress: number, message?: string) => void

export class VideoFrameExtractor {
  static async extractFrames(file: File, targetFps: number = 10, onProgress?: ProgressCallback): Promise<VideoFrame[]> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      // Cleanup function to release all resources
      const cleanup = () => {
        if (video.src) URL.revokeObjectURL(video.src)
        video.src = ''
        video.load() // Force browser to release video resources
        canvas.width = 0
        canvas.height = 0
      }

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration
          const frameInterval = 1 / targetFps // Extract at target FPS
          const totalFrames = Math.ceil(duration * targetFps)

          onProgress?.(10, `Processing ${duration.toFixed(1)}s video...`)

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          const frames: VideoFrame[] = []

          // Extract frames at regular intervals
          for (let i = 0; i < totalFrames; i++) {
            const time = i * frameInterval
            video.currentTime = time

            await new Promise<void>((resolve) => {
              video.onseeked = () => {
                ctx.drawImage(video, 0, 0)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

                frames.push({
                  data: imageData,
                  time: time * 1000, // Convert to milliseconds
                  index: i
                })

                // Report progress
                const progress = 10 + Math.round((i / totalFrames) * 80)
                onProgress?.(progress, `Extracting frame ${i + 1} of ${totalFrames}...`)

                resolve()
              }
            })

            // Yield to main thread every 10 frames to prevent UI freezing
            if (i % 10 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0))
            }
          }

          onProgress?.(100, 'Video processing complete!')

          cleanup()
          resolve(frames)
        } catch (error) {
          cleanup()
          reject(error)
        }
      }

      video.onerror = () => {
        cleanup()
        reject(new Error('Failed to load video'))
      }

      video.src = URL.createObjectURL(file)
    })
  }
  
  static async getVideoInfo(file: File): Promise<{ duration: number; frameCount: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')

      const cleanup = () => {
        if (video.src) URL.revokeObjectURL(video.src)
        video.src = ''
        video.load()
      }

      video.onloadedmetadata = () => {
        const duration = video.duration
        const fps = 10 // We'll extract at 10fps for preview
        const frameCount = Math.ceil(duration * fps)

        const result = {
          duration: duration * 1000, // Convert to milliseconds
          frameCount,
          width: video.videoWidth,
          height: video.videoHeight
        }

        cleanup()
        resolve(result)
      }

      video.onerror = () => {
        cleanup()
        reject(new Error('Failed to load video'))
      }

      video.src = URL.createObjectURL(file)
    })
  }
}