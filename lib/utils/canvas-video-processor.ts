// Canvas-based video to GIF processor as a fallback
export class CanvasVideoProcessor {
  static async videoToGif(
    file: File,
    targetSize: number = 128,
    maxFrames: number = 50,
    maxFileSize: number = 128 * 1024
  ): Promise<{ blob: Blob; frameCount: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      
      canvas.width = targetSize
      canvas.height = targetSize

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration
          const fps = Math.min(10, maxFrames / duration) // Max 10 fps
          const frameInterval = 1 / fps
          const totalFrames = Math.min(maxFrames, Math.floor(duration * fps))
          
          const frames: ImageData[] = []
          
          // Capture frames
          for (let i = 0; i < totalFrames; i++) {
            video.currentTime = i * frameInterval
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
            
            // Capture frame data
            frames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
          }
          
          // For now, return the first frame as a static image
          // (Full GIF encoding would require a library like gif.js)
          canvas.width = targetSize
          canvas.height = targetSize
          ctx.putImageData(frames[0], 0, 0)
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ blob, frameCount: frames.length })
            } else {
              reject(new Error('Failed to create blob'))
            }
          }, 'image/png', 0.9)
          
        } catch (error) {
          reject(error)
        } finally {
          URL.revokeObjectURL(video.src)
        }
      }

      video.onerror = () => reject(new Error('Failed to load video'))
      video.src = URL.createObjectURL(file)
    })
  }

  static async extractOptimalFrame(
    file: File,
    targetSize: number = 128,
    timestamp?: number,
    maxFileSize: number = 128 * 1024
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      canvas.width = targetSize
      canvas.height = targetSize

      video.onloadedmetadata = () => {
        // Use provided timestamp or pick a frame 10% into the video
        video.currentTime = timestamp || video.duration * 0.1
      }

      video.onseeked = async () => {
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Calculate scaling to fit
        const scale = Math.min(targetSize / video.videoWidth, targetSize / video.videoHeight)
        const scaledWidth = video.videoWidth * scale
        const scaledHeight = video.videoHeight * scale
        const offsetX = (targetSize - scaledWidth) / 2
        const offsetY = (targetSize - scaledHeight) / 2
        
        // Draw video frame
        ctx.drawImage(video, offsetX, offsetY, scaledWidth, scaledHeight)
        
        // Try different qualities to get under size limit
        let quality = 0.95
        let blob: Blob | null = null
        
        while (quality > 0.1) {
          blob = await new Promise<Blob | null>(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', quality)
          })
          
          if (blob && blob.size <= maxFileSize) break
          quality -= 0.1
        }
        
        if (!blob) {
          reject(new Error('Failed to create image'))
          return
        }
        
        resolve(blob)
        URL.revokeObjectURL(video.src)
      }

      video.onerror = () => reject(new Error('Failed to load video'))
      video.src = URL.createObjectURL(file)
    })
  }
}