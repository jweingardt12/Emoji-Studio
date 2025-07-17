export class GifProcessor {
  static async processGif(file: File, targetSize: number, maxFileSize: number): Promise<Blob> {
    // For animated GIFs, we need to resize each frame
    // This is a simplified approach using canvas
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      img.onload = async () => {
        canvas.width = targetSize
        canvas.height = targetSize
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Calculate scaling to fit within target size while maintaining aspect ratio
        const scale = Math.min(targetSize / img.width, targetSize / img.height)
        const scaledWidth = img.width * scale
        const scaledHeight = img.height * scale
        const offsetX = (targetSize - scaledWidth) / 2
        const offsetY = (targetSize - scaledHeight) / 2
        
        // Draw image centered on canvas
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
        
        // Convert to blob - for GIFs, we need to maintain the format
        const blob = await new Promise<Blob | null>((resolveBlob) => {
          canvas.toBlob(blob => resolveBlob(blob), 'image/png', 0.95)
        })
        
        if (!blob) {
          reject(new Error('Failed to process GIF'))
          return
        }
        
        // If the result is still too large, reduce quality
        if (blob.size > maxFileSize) {
          let quality = 0.9
          let resultBlob = blob
          
          while (quality > 0.1 && resultBlob.size > maxFileSize) {
            const tempBlob = await new Promise<Blob | null>((resolveBlob) => {
              canvas.toBlob(blob => resolveBlob(blob), 'image/jpeg', quality)
            })
            
            if (tempBlob) {
              resultBlob = tempBlob
            }
            quality -= 0.1
          }
          
          resolve(resultBlob)
        } else {
          resolve(blob)
        }
      }
      
      img.onerror = () => reject(new Error('Failed to load GIF'))
      img.src = URL.createObjectURL(file)
    })
  }
  
  static async getGifInfo(file: File): Promise<{ frameCount: number; duration: number }> {
    // This is a placeholder - getting actual GIF frame count requires parsing the GIF format
    // For now, we'll return estimated values
    return {
      frameCount: 1, // Treat as static image for now
      duration: 0
    }
  }
}