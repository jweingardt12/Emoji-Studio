/**
 * Canvas Pool for efficient canvas element reuse
 * Reduces memory allocation and garbage collection overhead
 */
export class CanvasPool {
  private pool: HTMLCanvasElement[] = []
  private maxPoolSize: number
  private canvasesInUse = new WeakSet<HTMLCanvasElement>()

  constructor(maxPoolSize = 20) {
    this.maxPoolSize = maxPoolSize
  }

  /**
   * Get a canvas from the pool or create a new one
   */
  acquire(width: number, height: number): HTMLCanvasElement {
    // Try to find a suitable canvas in the pool
    let canvas = this.pool.find(c => !this.canvasesInUse.has(c))
    
    if (!canvas) {
      // Create new canvas if pool is empty or all are in use
      canvas = document.createElement('canvas')
    } else {
      // Remove from pool
      const index = this.pool.indexOf(canvas)
      this.pool.splice(index, 1)
    }
    
    // Configure canvas
    canvas.width = width
    canvas.height = height
    
    // Mark as in use
    this.canvasesInUse.add(canvas)
    
    // Clear any previous content
    const ctx = canvas.getContext('2d', { alpha: false })
    if (ctx) {
      ctx.clearRect(0, 0, width, height)
    }
    
    return canvas
  }

  /**
   * Return a canvas to the pool
   */
  release(canvas: HTMLCanvasElement): void {
    if (!this.canvasesInUse.has(canvas)) {
      return
    }
    
    this.canvasesInUse.delete(canvas)
    
    // Only add back to pool if we haven't reached max size
    if (this.pool.length < this.maxPoolSize) {
      // Clear the canvas before returning to pool
      const ctx = canvas.getContext('2d', { alpha: false })
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      
      this.pool.push(canvas)
    }
    // Otherwise, let it be garbage collected
  }

  /**
   * Clear all canvases from the pool
   */
  clear(): void {
    this.pool = []
    // canvasesInUse will be garbage collected with the canvases
  }

  /**
   * Get current pool size
   */
  getPoolSize(): number {
    return this.pool.length
  }
}

// Global instance
export const globalCanvasPool = new CanvasPool()