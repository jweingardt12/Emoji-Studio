/**
 * High-quality background removal that prefers a state-of-the-art ONNX/WebGL model
 * via the optional `@imgly/background-removal` package. Falls back to a
 * deterministic canvas-based algorithm if the ML model is unavailable.
 */
export async function removeBackground(blob: Blob): Promise<Blob> {
  // Try ML-based removal first (fast on GPU, high quality, returns transparent PNG)
  try {
    const mod: any = await import(/* @vite-ignore */ '@imgly/background-removal').catch(() => null)
    const bgRemove: any = mod?.default || mod?.removeBackground || null
    if (typeof bgRemove === 'function') {
      // The library accepts a Blob/File/HTMLImageElement. Wrap as File for metadata.
      const input = new File([blob], 'emoji.png', { type: (blob as any).type || 'image/png' })
      const output: any = await bgRemove(input, {
        model: 'isnet-general-use',
        debug: false,
      })
      const asBlob = await normalizeToBlob(output, (blob as any).type || 'image/png')
      if (asBlob) return asBlob
    }
  } catch (e) {
    // Ignore and fall back to deterministic approach
    // console.warn('ML background removal failed, falling back:', e)
  }

  // Fallback to previous deterministic implementation
  return removeBackgroundDeterministic(blob)
}

async function normalizeToBlob(result: any, mime: string): Promise<Blob | null> {
  if (!result) return null
  if (result instanceof Blob) return result
  if (result instanceof File) return result
  if (result instanceof HTMLCanvasElement) {
    return await new Promise((res) => result.toBlob(b => res(b || null), mime))
  }
  if (result instanceof ImageBitmap) {
    const canvas = document.createElement('canvas')
    canvas.width = result.width
    canvas.height = result.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(result as any, 0, 0)
    return await new Promise((res) => canvas.toBlob(b => res(b || null), mime))
  }
  if (typeof OffscreenCanvas !== 'undefined' && result instanceof OffscreenCanvas) {
    const blob: Blob | undefined = await (result as OffscreenCanvas).convertToBlob({ type: mime }).catch(() => undefined)
    return blob ?? null
  }
  return null
}

/**
 * Deterministic background removal (legacy fallback). This removes mostly
 * uniform light backgrounds using color-distance heuristics and edge smoothing.
 */
export async function removeBackgroundDeterministic(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      
      ctx.drawImage(img, 0, 0)
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      const samples: Array<{r: number, g: number, b: number}> = []
      const samplePoints = [
        [0, 0], [canvas.width - 1, 0],
        [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1],
        [Math.floor(canvas.width / 2), 0],
        [Math.floor(canvas.width / 2), canvas.height - 1],
        [0, Math.floor(canvas.height / 2)],
        [canvas.width - 1, Math.floor(canvas.height / 2)]
      ]
      
      samplePoints.forEach(([x, y]) => {
        const idx = (y * canvas.width + x) * 4
        samples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2]
        })
      })
      
      const avgBg = {
        r: Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length),
        g: Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length),
        b: Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length)
      }
      
      const tolerance = 50
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        const distance = Math.sqrt(
          Math.pow(r - avgBg.r, 2) +
          Math.pow(g - avgBg.g, 2) +
          Math.pow(b - avgBg.b, 2)
        )
        
        if (distance < tolerance) {
          const alpha = Math.min(255, (distance / tolerance) * 255)
          data[i + 3] = alpha
        }
        
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0
        }
      }
      
      smoothEdges(imageData)
      ctx.putImageData(imageData, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      }, 'image/png')
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    img.src = URL.createObjectURL(blob)
  })
}

function smoothEdges(imageData: ImageData) {
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height
  
  // Create a copy for reference
  const original = new Uint8ClampedArray(data)
  
  // Apply smoothing to alpha channel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4 + 3 // Alpha channel
      
      // Get surrounding alpha values
      const surroundingAlpha = [
        original[((y - 1) * width + (x - 1)) * 4 + 3],
        original[((y - 1) * width + x) * 4 + 3],
        original[((y - 1) * width + (x + 1)) * 4 + 3],
        original[(y * width + (x - 1)) * 4 + 3],
        original[(y * width + (x + 1)) * 4 + 3],
        original[((y + 1) * width + (x - 1)) * 4 + 3],
        original[((y + 1) * width + x) * 4 + 3],
        original[((y + 1) * width + (x + 1)) * 4 + 3]
      ]
      
      // If this pixel is on an edge (has both transparent and opaque neighbors)
      const hasTransparent = surroundingAlpha.some(a => a < 50)
      const hasOpaque = surroundingAlpha.some(a => a > 200)
      
      if (hasTransparent && hasOpaque) {
        // Average the alpha for smoothing
        const avgAlpha = surroundingAlpha.reduce((sum, a) => sum + a, 0) / surroundingAlpha.length
        data[idx] = Math.round(avgAlpha)
      }
    }
  }
}

/**
 * Enhanced background removal with better edge detection
 */
export async function removeBackgroundEnhanced(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      img.onload = () => {
        try {
      canvas.width = img.width
      canvas.height = img.height
      
      // Draw the image
      ctx.drawImage(img, 0, 0)
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Use flood fill from corners to detect background
      const visited = new Set<string>()
      const backgroundPixels = new Set<string>()
      
      // Flood fill from corners
      const floodFill = (startX: number, startY: number, tolerance: number) => {
        const stack = [[startX, startY]]
        const startIdx = (startY * canvas.width + startX) * 4
        const startColor = {
          r: data[startIdx],
          g: data[startIdx + 1],
          b: data[startIdx + 2]
        }
        
        while (stack.length > 0) {
          const [x, y] = stack.pop()!
          const key = `${x},${y}`
          
          if (visited.has(key)) continue
          if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue
          
          visited.add(key)
          
          const idx = (y * canvas.width + x) * 4
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          
          // Check color similarity
          const distance = Math.sqrt(
            Math.pow(r - startColor.r, 2) +
            Math.pow(g - startColor.g, 2) +
            Math.pow(b - startColor.b, 2)
          )
          
          if (distance < tolerance) {
            backgroundPixels.add(key)
            // Add neighbors
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
          }
        }
      }
      
      // Start flood fill from corners
      const tolerance = 30
      floodFill(0, 0, tolerance)
      floodFill(canvas.width - 1, 0, tolerance)
      floodFill(0, canvas.height - 1, tolerance)
      floodFill(canvas.width - 1, canvas.height - 1, tolerance)
      
      // Make background pixels transparent
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const key = `${x},${y}`
          if (backgroundPixels.has(key)) {
            const idx = (y * canvas.width + x) * 4
            data[idx + 3] = 0 // Make transparent
          }
        }
      }
      
      // Apply edge smoothing
      smoothEdges(imageData)
      
      // Put the processed image back
      ctx.putImageData(imageData, 0, 0)
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      }, 'image/png')
        } catch (error) {
          console.error('Error processing image in removeBackgroundEnhanced:', error)
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      img.src = URL.createObjectURL(blob)
    } catch (error) {
      console.error('Error setting up removeBackgroundEnhanced:', error)
      reject(error)
    }
  })
}