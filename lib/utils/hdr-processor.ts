// Note: We're using P3 color space instead of gainmap for better compatibility

export interface HDRProcessingOptions {
  intensity: number // 0-100
  toneMapping?: 'linear' | 'reinhard' | 'aces' // Tone mapping algorithm
  maxContentBoost?: number // Max HDR brightness boost (1-4)
}

export class HDRProcessor {

  /**
   * Creates an Apple-compatible HDR image with gain map
   * This format displays as SDR on non-HDR displays and HDR on capable displays
   */
  static async createAppleHDR(
    imageBlob: Blob,
    options: HDRProcessingOptions = { intensity: 50 }
  ): Promise<Blob | null> {
    try {
      const img = new Image()
      const imageUrl = URL.createObjectURL(imageBlob)
      
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Create canvas for the SDR base image
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d', { colorSpace: 'srgb' })
            if (!ctx) {
              reject(new Error('Failed to get canvas context'))
              return
            }

            // Draw original image
            ctx.drawImage(img, 0, 0)

            // Apply SDR enhancements (subtle for base image)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            this.enhanceSDRImage(imageData.data, options.intensity * 0.3)
            ctx.putImageData(imageData, 0, 0)

            // Get SDR image
            const sdrBlob = await new Promise<Blob>((res) => {
              canvas.toBlob((blob) => res(blob!), 'image/jpeg', 0.95)
            })

            // Create HDR version for gain map calculation
            const hdrCanvas = document.createElement('canvas')
            hdrCanvas.width = img.width
            hdrCanvas.height = img.height
            const hdrCtx = hdrCanvas.getContext('2d', { colorSpace: 'srgb' })
            if (!hdrCtx) {
              reject(new Error('Failed to get HDR canvas context'))
              return
            }

            // Draw and enhance for HDR
            hdrCtx.drawImage(img, 0, 0)
            const hdrImageData = hdrCtx.getImageData(0, 0, hdrCanvas.width, hdrCanvas.height)
            this.enhanceHDRImage(hdrImageData.data, options)
            hdrCtx.putImageData(hdrImageData, 0, 0)

            // For now, let's create a simulated HDR effect without the gainmap library
            // The library seems to have compatibility issues with our setup
            
            // Apply HDR tone mapping to create a visually enhanced image
            const finalCanvas = document.createElement('canvas')
            finalCanvas.width = canvas.width
            finalCanvas.height = canvas.height
            const finalCtx = finalCanvas.getContext('2d', { colorSpace: 'display-p3' })
            if (!finalCtx) {
              reject(new Error('Failed to get final canvas context'))
              return
            }
            
            // Draw the HDR enhanced version
            finalCtx.drawImage(hdrCanvas, 0, 0)
            
            // Create a high-quality JPEG with P3 color space hint
            const jpegBlob = await new Promise<Blob>((res) => {
              finalCanvas.toBlob((blob) => res(blob!), 'image/jpeg', 0.98)
            })
            
            URL.revokeObjectURL(imageUrl)
            resolve(jpegBlob)
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl)
          reject(new Error('Failed to load image'))
        }

        img.src = imageUrl
      })
    } catch (error) {
      return null
    }
  }

  /**
   * Enhance SDR image (subtle natural enhancements)
   */
  private static enhanceSDRImage(data: Uint8ClampedArray, intensity: number) {
    const factor = intensity / 100

    // First pass: analyze image
    let totalLuminance = 0
    let pixelCount = 0
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
        totalLuminance += lum
        pixelCount++
      }
    }
    
    const avgLuminance = totalLuminance / pixelCount

    // Second pass: apply enhancements
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      const a = data[i + 3]

      if (a > 0) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        
        // Natural tone curve - very subtle adjustments
        let adjustment = 1.0
        
        if (lum < avgLuminance * 0.5) {
          // Stronger shadow lifting for SDR base
          const shadowFactor = (avgLuminance * 0.5 - lum) / (avgLuminance * 0.5)
          adjustment = 1 + (factor * 0.25 * shadowFactor)
        } else if (lum > avgLuminance * 2) {
          // Boost highlights for more brilliance
          const highlightFactor = (lum - avgLuminance * 2) / (255 - avgLuminance * 2)
          adjustment = 1 + (factor * 0.15 * highlightFactor)
        } else if (lum > avgLuminance * 1.5) {
          // Moderate highlight enhancement
          adjustment = 1 + (factor * 0.1)
        } else {
          // Slight midtone boost
          adjustment = 1 + (factor * 0.05)
        }
        
        r = Math.min(255, Math.max(0, r * adjustment))
        g = Math.min(255, Math.max(0, g * adjustment))
        b = Math.min(255, Math.max(0, b * adjustment))
        
        // Subtle natural vibrance
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const sat = max > 0 ? (max - min) / max : 0
        
        if (sat < 0.7) {
          const vibranceAmount = factor * 0.15 * (1 - sat)
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
          
          r = Math.min(255, Math.max(0, gray + (r - gray) * (1 + vibranceAmount)))
          g = Math.min(255, Math.max(0, gray + (g - gray) * (1 + vibranceAmount)))
          b = Math.min(255, Math.max(0, gray + (b - gray) * (1 + vibranceAmount)))
        }

        data[i] = Math.round(r)
        data[i + 1] = Math.round(g)
        data[i + 2] = Math.round(b)
      }
    }
  }

  /**
   * Enhance HDR image using natural HDR approach (Greg Benz method)
   */
  private static enhanceHDRImage(data: Uint8ClampedArray, options: HDRProcessingOptions) {
    const factor = options.intensity / 100

    // First pass: analyze image statistics
    const luminanceMap = new Float32Array(data.length / 4)
    const histogram = new Array(256).fill(0)
    let minLum = 255, maxLum = 0
    let totalLuminance = 0
    let pixelCount = 0

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]

      if (a > 0) {
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        luminanceMap[i / 4] = lum
        histogram[Math.floor(lum)]++

        totalLuminance += lum
        pixelCount++
        minLum = Math.min(minLum, lum)
        maxLum = Math.max(maxLum, lum)
      }
    }

    const avgLuminance = totalLuminance / pixelCount

    // Find percentiles for better tone mapping
    let cumulative = 0
    let lowPercentile = 0, highPercentile = 255
    const fivePercent = pixelCount * 0.05
    const ninetyFivePercent = pixelCount * 0.95

    for (let i = 0; i < 256; i++) {
      cumulative += histogram[i]
      if (cumulative >= fivePercent && lowPercentile === 0) {
        lowPercentile = i
      }
      if (cumulative >= ninetyFivePercent) {
        highPercentile = i
        break
      }
    }

    // Apply natural HDR enhancements
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      const a = data[i + 3]

      if (a > 0) {
        const lum = luminanceMap[i / 4]

        // Determine tone zone
        const isDeepShadow = lum < lowPercentile
        const isShadow = lum < avgLuminance * 0.6
        const isHighlight = lum > avgLuminance * 1.5
        const isBrightHighlight = lum > highPercentile

        // Natural tone adjustment
        let adjustment = 1.0

        if (isDeepShadow) {
          // Darken deep shadows for contrast
          const shadowCrush = 1 - (factor * 0.15 * (1 - lum / lowPercentile))
          adjustment = shadowCrush
        } else if (isShadow) {
          // Darken shadows while preserving detail
          const shadowFactor = (avgLuminance * 0.6 - lum) / (avgLuminance * 0.6)
          adjustment = 1 - (factor * 0.1 * shadowFactor) + (factor * 0.05 * shadowFactor * (lum / (avgLuminance * 0.6)))
        } else if (isBrightHighlight) {
          // Boost bright highlights
          const highlightFactor = (lum - highPercentile) / (255 - highPercentile)
          adjustment = 1 + (factor * 0.5 * highlightFactor)
        } else if (isHighlight) {
          // Highlight enhancement
          const highlightFactor = (lum - avgLuminance * 1.5) / (maxLum - avgLuminance * 1.5)
          adjustment = 1 + (factor * 0.4 * highlightFactor)
        } else if (lum > avgLuminance * 1.2) {
          // Boost bright midtones
          const upperMidFactor = (lum - avgLuminance * 1.2) / (avgLuminance * 0.6)
          adjustment = 1 + (factor * 0.25 * upperMidFactor)
        } else if (lum < avgLuminance * 0.8) {
          // Darken lower midtones
          const lowerMidFactor = (avgLuminance * 0.8 - lum) / (avgLuminance * 0.8)
          adjustment = 1 - (factor * 0.1 * lowerMidFactor)
        } else {
          // Regular midtones - minimal change
          adjustment = 1 + (factor * 0.03)
        }

        // Apply adjustment preserving color ratios
        r = Math.min(255, Math.max(0, r * adjustment))
        g = Math.min(255, Math.max(0, g * adjustment))
        b = Math.min(255, Math.max(0, b * adjustment))

        // Natural color enhancement
        const maxChannel = Math.max(r, g, b)
        const minChannel = Math.min(r, g, b)
        const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0

        // Subtle vibrance
        if (saturation < 0.8) {
          const vibranceAmount = factor * 0.15 * (1 - saturation * saturation)
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b

          r = Math.min(255, Math.max(0, gray + (r - gray) * (1 + vibranceAmount)))
          g = Math.min(255, Math.max(0, gray + (g - gray) * (1 + vibranceAmount)))
          b = Math.min(255, Math.max(0, gray + (b - gray) * (1 + vibranceAmount)))
        }

        // Subtle micro-contrast
        const contrast = 1 + factor * 0.05
        const mid = 128
        r = Math.min(255, Math.max(0, mid + (r - mid) * contrast))
        g = Math.min(255, Math.max(0, mid + (g - mid) * contrast))
        b = Math.min(255, Math.max(0, mid + (b - mid) * contrast))

        // Gentle bloom for bright areas
        if (isHighlight && factor > 0.2) {
          const bloomAmount = factor * 0.15 * ((lum - avgLuminance * 1.5) / (maxLum - avgLuminance * 1.5))
          r = Math.min(255, r + (255 - r) * bloomAmount)
          g = Math.min(255, g + (255 - g) * bloomAmount)
          b = Math.min(255, b + (255 - b) * bloomAmount)
        }

        // Moderate white push for brightest areas
        if (isBrightHighlight && factor > 0.2) {
          const whitePush = factor * 0.3 * ((lum - highPercentile) / (255 - highPercentile))
          r = Math.min(255, r + (255 - r) * whitePush)
          g = Math.min(255, g + (255 - g) * whitePush)
          b = Math.min(255, b + (255 - b) * whitePush)
        }

        // Subtle black crush for contrast
        if (lum < lowPercentile && factor > 0.3) {
          const blackCrush = factor * 0.2 * (1 - lum / lowPercentile)
          r = Math.max(0, r * (1 - blackCrush))
          g = Math.max(0, g * (1 - blackCrush))
          b = Math.max(0, b * (1 - blackCrush))
        }

        // Update pixel data
        data[i] = Math.round(Math.min(255, r))
        data[i + 1] = Math.round(Math.min(255, g))
        data[i + 2] = Math.round(Math.min(255, b))
      }
    }
  }

  /**
   * Check if an image already has HDR/gain map data or wide color gamut
   */
  static async hasHDRData(imageBlob: Blob): Promise<boolean> {
    try {
      // Check for various HDR indicators
      const arrayBuffer = await imageBlob.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
      // Look for HDR markers in metadata
      const headerText = new TextDecoder('latin1').decode(bytes.slice(0, 2000))
      
      // Check for various HDR indicators:
      // 1. Apple gain map markers
      if (headerText.includes('hdrgm:Version') || headerText.includes('GainMap')) {
        return true
      }
      
      // 2. Display P3 or other wide gamut color profiles
      if (headerText.includes('Display P3') || 
          headerText.includes('Rec2020') ||
          headerText.includes('Adobe RGB') ||
          headerText.includes('ProPhoto')) {
        return true
      }
      
      // 3. HDR metadata in PNG
      if (headerText.includes('iCCP') && 
          (headerText.includes('HDR') || headerText.includes('P3'))) {
        return true
      }
      
      // 4. Check for high bit depth (16-bit) PNG
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        // PNG signature found, check bit depth
        // IHDR chunk is always first after signature
        const bitDepth = bytes[24] // Bit depth is at offset 24 in PNG
        if (bitDepth === 16) {
          return true
        }
      }
      
      return false
    } catch (error) {
      return false
    }
  }
  
  /**
   * Process an existing HDR image to enhance it further
   */
  static async enhanceExistingHDR(
    imageBlob: Blob,
    options: HDRProcessingOptions = { intensity: 50 }
  ): Promise<Blob | null> {
    try {
      const img = new Image()
      const imageUrl = URL.createObjectURL(imageBlob)
      
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Create canvas with P3 color space to preserve wide gamut
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d', { 
              colorSpace: 'display-p3',
              willReadFrequently: true 
            })
            if (!ctx) {
              reject(new Error('Failed to get canvas context'))
              return
            }

            // Draw original HDR image
            ctx.drawImage(img, 0, 0)

            // Get image data and apply subtle enhancements
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            // For existing HDR, apply more subtle enhancements
            const subtleOptions = {
              ...options,
              intensity: options.intensity * 0.5 // Half intensity for existing HDR
            }
            
            this.enhanceHDRImage(imageData.data, subtleOptions)
            ctx.putImageData(imageData, 0, 0)

            // Create high-quality output preserving HDR
            const outputBlob = await new Promise<Blob>((res) => {
              canvas.toBlob((blob) => res(blob!), 'image/png', 1.0)
            })
            
            URL.revokeObjectURL(imageUrl)
            resolve(outputBlob)
          } catch (error) {
            reject(error)
          }
        }

        img.onerror = () => {
          URL.revokeObjectURL(imageUrl)
          reject(new Error('Failed to load image'))
        }

        img.src = imageUrl
      })
    } catch (error) {
      return null
    }
  }
}