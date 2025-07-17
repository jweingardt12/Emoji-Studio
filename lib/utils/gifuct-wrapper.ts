// A simple wrapper for parsing GIF frames
// This is a lightweight implementation that extracts basic frame data from GIFs

export interface GifFrame {
  data: Uint8ClampedArray
  width: number
  height: number
  delay: number
}

export class GifParser {
  static async parseGif(arrayBuffer: ArrayBuffer): Promise<{
    width: number
    height: number
    frames: GifFrame[]
  }> {
    const bytes = new Uint8Array(arrayBuffer)
    
    // Verify GIF signature
    const signature = String.fromCharCode(...bytes.slice(0, 6))
    if (signature !== 'GIF87a' && signature !== 'GIF89a') {
      throw new Error('Not a valid GIF file')
    }
    
    // Read logical screen descriptor
    const width = bytes[6] | (bytes[7] << 8)
    const height = bytes[8] | (bytes[9] << 8)
    
    // For now, we'll return a simplified result
    // In a real implementation, we'd parse the entire GIF structure
    return {
      width,
      height,
      frames: [] // Would contain actual frame data
    }
  }
  
  static async extractFirstFrame(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        URL.revokeObjectURL(img.src)
        resolve(imageData)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(img.src)
        reject(new Error('Failed to load GIF'))
      }
      
      img.src = URL.createObjectURL(file)
    })
  }
}