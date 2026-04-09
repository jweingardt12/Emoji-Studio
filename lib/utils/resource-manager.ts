/**
 * Resource manager for cleaning up browser resources like object URLs and media elements
 */
export class ResourceManager {
  private objectUrls: Set<string> = new Set()
  private elements: Set<HTMLElement> = new Set()
  private disposed = false

  /**
   * Create an object URL and track it for cleanup
   */
  createObjectURL(blob: Blob): string {
    if (this.disposed) {
      throw new Error('ResourceManager has been disposed')
    }
    const url = URL.createObjectURL(blob)
    this.objectUrls.add(url)
    return url
  }

  /**
   * Track an HTML element for cleanup
   */
  trackElement(element: HTMLElement): void {
    if (this.disposed) {
      throw new Error('ResourceManager has been disposed')
    }
    this.elements.add(element)
  }

  /**
   * Clean up all tracked resources
   */
  dispose(): void {
    if (this.disposed) return

    // Revoke all object URLs
    this.objectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url)
      } catch (error) {
      }
    })
    this.objectUrls.clear()

    // Clean up elements
    this.elements.forEach(element => {
      try {
        // Clear src for media elements
        if (element instanceof HTMLImageElement || 
            element instanceof HTMLVideoElement || 
            element instanceof HTMLAudioElement) {
          element.src = ''
        }
        
        // Remove from DOM if attached
        if (element.parentNode) {
          element.parentNode.removeChild(element)
        }

        // Clear canvas if applicable
        if (element instanceof HTMLCanvasElement) {
          const ctx = element.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, element.width, element.height)
          }
          element.width = 0
          element.height = 0
        }
      } catch (error) {
      }
    })
    this.elements.clear()

    this.disposed = true
  }

  /**
   * Check if the manager has been disposed
   */
  isDisposed(): boolean {
    return this.disposed
  }
}

/**
 * Helper function to process with automatic resource cleanup
 */
export async function withResourceCleanup<T>(
  processor: (resources: ResourceManager) => Promise<T>
): Promise<T> {
  const resources = new ResourceManager()
  try {
    return await processor(resources)
  } finally {
    resources.dispose()
  }
}