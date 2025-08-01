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
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration
          const videoFps = 30 // Assume 30fps if we can't detect
          const frameInterval = 1 / targetFps // Extract at target FPS
          const totalFrames = Math.ceil(duration * targetFps)
          
          console.log(`Video duration: ${duration}s, extracting ${totalFrames} frames at ${targetFps}fps`)
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
          }
          
          onProgress?.(100, 'Video processing complete!')
          
          URL.revokeObjectURL(video.src)
          resolve(frames)
        } catch (error) {
          URL.revokeObjectURL(video.src)
          reject(error)
        }
      }

      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error('Failed to load video'))
      }
      
      video.src = URL.createObjectURL(file)
    })
  }
  
  static async getVideoInfo(file: File): Promise<{ duration: number; frameCount: number; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      
      video.onloadedmetadata = () => {
        const duration = video.duration
        const fps = 10 // We'll extract at 10fps for preview
        const frameCount = Math.ceil(duration * fps)
        
        resolve({
          duration: duration * 1000, // Convert to milliseconds
          frameCount,
          width: video.videoWidth,
          height: video.videoHeight
        })
        
        URL.revokeObjectURL(video.src)
      }
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src)
        reject(new Error('Failed to load video'))
      }
      
      video.src = URL.createObjectURL(file)
    })
  }
}