export class CanvasGifProcessor {
  static async processAnimatedGif(
    file: File,
    targetSize: number = 128,
    maxFileSize: number = 128 * 1024
  ): Promise<Blob> {
    // First check if resizing alone would work
    const resized = await this.resizeGif(file, targetSize)
    if (resized.size <= maxFileSize) {
      console.log('Resized GIF is within limits')
      return resized
    }

    // If not, we need to reduce quality
    // Since we can't easily re-encode GIFs in the browser while maintaining animation,
    // we'll use a canvas-based approach that maintains the format
    return this.optimizeGif(file, targetSize, maxFileSize)
  }

  private static async resizeGif(file: File, targetSize: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Calculate dimensions
        const scale = Math.min(targetSize / img.width, targetSize / img.height)
        const scaledWidth = Math.round(img.width * scale)
        const scaledHeight = Math.round(img.height * scale)
        
        canvas.width = targetSize
        canvas.height = targetSize
        
        // Clear with white background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, targetSize, targetSize)
        
        // Draw centered
        const offsetX = (targetSize - scaledWidth) / 2
        const offsetY = (targetSize - scaledHeight) / 2
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
        
        // Try to export as GIF first
        canvas.toBlob((blob) => {
          if (blob) {
            console.log(`Resized GIF: ${blob.size} bytes`)
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, 'image/gif')
      }
      
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  private static async optimizeGif(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    // For now, just return the resized version
    // In a production app, you'd want to use a proper GIF encoder
    const resized = await this.resizeGif(file, targetSize)
    
    // If it's still too large, we have to accept it or convert to static
    if (resized.size > maxFileSize) {
      console.warn(`Could not optimize GIF to under ${maxFileSize} bytes. Current size: ${resized.size}`)
    }
    
    return resized
  }
}