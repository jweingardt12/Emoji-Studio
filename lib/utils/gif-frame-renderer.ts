/**
 * GIF Frame Renderer - Renders GIF frames directly without pixel extraction
 * This approach uses the browser's native GIF rendering capabilities
 */

export interface RenderedFrame {
  canvas: HTMLCanvasElement
  delay: number
}

export class GifFrameRenderer {
  static async renderFrames(file: File): Promise<RenderedFrame[]> {
    console.log(`[GifFrameRenderer] Processing: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB`)
    
    // For static rendering, we'll create a single frame
    const url = URL.createObjectURL(file)
    
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Failed to load GIF'))
        img.src = url
      })
      
      // Create a canvas and render the GIF
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) throw new Error('Failed to create canvas context')
      
      // Draw the image - browser handles GIF rendering natively
      ctx.drawImage(img, 0, 0)
      
      console.log(`[GifFrameRenderer] Rendered 1 frame (static)`)
      
      return [{
        canvas,
        delay: 100
      }]
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  
  /**
   * Convert rendered frames to ImageData for compatibility
   */
  static framesToImageData(frames: RenderedFrame[]): { data: ImageData, delay: number }[] {
    return frames.map(frame => {
      const ctx = frame.canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')
      
      const imageData = ctx.getImageData(0, 0, frame.canvas.width, frame.canvas.height)
      
      return {
        data: imageData,
        delay: frame.delay
      }
    })
  }
}