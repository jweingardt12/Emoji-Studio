/**
 * Simple background removal using canvas manipulation
 * This removes white/light backgrounds from images
 */

export async function removeBackground(blob: Blob): Promise<Blob> {
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
      
      // Draw the image
      ctx.drawImage(img, 0, 0)
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Analyze the image to find the background color
      // Sample corners and edges to determine background
      const samples: Array<{r: number, g: number, b: number}> = []
      const samplePoints = [
        [0, 0], [canvas.width - 1, 0], // Top corners
        [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1], // Bottom corners
        [Math.floor(canvas.width / 2), 0], // Top center
        [Math.floor(canvas.width / 2), canvas.height - 1], // Bottom center
        [0, Math.floor(canvas.height / 2)], // Left center
        [canvas.width - 1, Math.floor(canvas.height / 2)] // Right center
      ]
      
      samplePoints.forEach(([x, y]) => {
        const idx = (y * canvas.width + x) * 4
        samples.push({
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2]
        })
      })
      
      // Find the most common color (likely background)
      const avgBg = {
        r: Math.round(samples.reduce((sum, s) => sum + s.r, 0) / samples.length),
        g: Math.round(samples.reduce((sum, s) => sum + s.g, 0) / samples.length),
        b: Math.round(samples.reduce((sum, s) => sum + s.b, 0) / samples.length)
      }
      
      // Process pixels - remove those similar to background
      const tolerance = 50 // Adjust for sensitivity
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Calculate color distance from background
        const distance = Math.sqrt(
          Math.pow(r - avgBg.r, 2) +
          Math.pow(g - avgBg.g, 2) +
          Math.pow(b - avgBg.b, 2)
        )
        
        // If close to background color, make transparent
        if (distance < tolerance) {
          // Gradual transparency based on distance
          const alpha = Math.min(255, (distance / tolerance) * 255)
          data[i + 3] = alpha
        }
        
        // Special handling for pure white/very light colors
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0 // Make fully transparent
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
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }
    
    img.src = URL.createObjectURL(blob)
  })
}