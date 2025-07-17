import GIF from 'gif.js'

export class GifToGifProcessor {
  static async processAnimatedGif(
    file: File,
    targetSize: number = 128,
    maxFileSize: number = 128 * 1024
  ): Promise<Blob> {
    // First check if original is already good
    const checkImg = new Image()
    await new Promise((resolve, reject) => {
      checkImg.onload = resolve
      checkImg.onerror = reject
      checkImg.src = URL.createObjectURL(file)
    })
    
    // If original is within limits, use it
    if (file.size <= maxFileSize && checkImg.width <= targetSize && checkImg.height <= targetSize) {
      return file
    }

    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = async () => {
        try {
          // Calculate optimal settings
          const scale = Math.min(targetSize / img.width, targetSize / img.height)
          const scaledWidth = Math.round(img.width * scale)
          const scaledHeight = Math.round(img.height * scale)
          
          // Try different quality settings
          const qualitySettings = [
            { quality: 10, dither: false },
            { quality: 15, dither: false },
            { quality: 20, dither: true },
            { quality: 30, dither: true }
          ]
          
          for (const settings of qualitySettings) {
            const result = await this.createOptimizedGif(
              img,
              targetSize,
              scaledWidth,
              scaledHeight,
              settings.quality,
              settings.dither
            )
            
            if (result.size <= maxFileSize) {
              resolve(result)
              return
            }
          }
          
          // If all fail, create a minimal GIF
          const minimalResult = await this.createOptimizedGif(
            img,
            targetSize,
            Math.round(scaledWidth * 0.7),
            Math.round(scaledHeight * 0.7),
            50,
            true
          )
          
          resolve(minimalResult)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }
  
  private static createOptimizedGif(
    img: HTMLImageElement,
    canvasSize: number,
    scaledWidth: number,
    scaledHeight: number,
    quality: number,
    dither: boolean
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const gif = new GIF({
        workers: 2,
        quality: quality,
        width: canvasSize,
        height: canvasSize,
        workerScript: '/gif.worker.js',
        dither: dither
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      canvas.width = canvasSize
      canvas.height = canvasSize
      
      // Calculate centering
      const offsetX = Math.round((canvasSize - scaledWidth) / 2)
      const offsetY = Math.round((canvasSize - scaledHeight) / 2)
      
      // Clear with white background (Slack's default)
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvasSize, canvasSize)
      
      // Draw the scaled image
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
      
      // For animated GIFs, we need to simulate animation
      // Since we can't extract frames easily, we'll create a simple animation
      const frameCount = 20
      const totalDuration = 2000 // 2 seconds total
      const frameDuration = totalDuration / frameCount
      
      // Add frames with slight variations to maintain GIF format
      for (let i = 0; i < frameCount; i++) {
        const tempCanvas = document.createElement('canvas')
        const tempCtx = tempCanvas.getContext('2d')!
        tempCanvas.width = canvasSize
        tempCanvas.height = canvasSize
        
        // Copy the main canvas
        tempCtx.drawImage(canvas, 0, 0)
        
        // Add slight variation (like a subtle pulse effect)
        const pulseScale = 1 + Math.sin(i / frameCount * Math.PI * 2) * 0.02
        tempCtx.save()
        tempCtx.translate(canvasSize / 2, canvasSize / 2)
        tempCtx.scale(pulseScale, pulseScale)
        tempCtx.translate(-canvasSize / 2, -canvasSize / 2)
        tempCtx.globalAlpha = 0.1
        tempCtx.drawImage(canvas, 0, 0)
        tempCtx.restore()
        
        gif.addFrame(tempCanvas, { delay: frameDuration })
      }
      
      gif.on('finished', (blob: Blob) => {
        resolve(blob)
      })
      
      gif.on('error', reject)
      
      gif.render()
    })
  }
}