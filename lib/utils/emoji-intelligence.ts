export interface ImageAnalysis {
  hasBackground: boolean
  backgroundScore: number // 0-100, higher means more prominent background
  contrastScore: number // 0-100, higher is better
  saturationScore: number // 0-100, 50 is neutral
  sharpnessScore: number // 0-100, higher is sharper
  subjectCoverageScore: number // 0-100, percentage of image that's the subject
  transparencyScore: number // 0-100, percentage of transparent pixels
  brightnessScore: number // 0-100, 50 is neutral
  colorDistributionScore: number // 0-100, higher means better color variety
  edgeClarity: number // 0-100, higher means clearer edges
  overallQuality: number // 0-100, weighted average
  whiteSpaceScore: number // 0-100, amount of unnecessary whitespace
  symmetryScore: number // 0-100, how symmetrical the image is
  noiseScore: number // 0-100, amount of noise/artifacts
  aspectRatioScore: number // 0-100, how square the subject is
  // Slack-specific readability metrics (simulated small sizes)
  readabilityScore32: number // 0-100, readability when shown ~32px
  readabilityScore64: number // 0-100, readability when shown ~64px
  // Contrast against common Slack themes
  themeContrastLight: number // 0-100, contrast vs light theme background
  themeContrastDark: number // 0-100, contrast vs dark theme background
  minThemeContrast: number // 0-100, min of light/dark for safety
}

export interface AnalysisDetails {
  dominantColors: string[]
  backgroundColor: string | null
  hasTransparency: boolean
  imageType: 'photo' | 'illustration' | 'text' | 'mixed'
  suggestedCropBox?: { x: number; y: number; width: number; height: number }
  // Useful Slack-specific context
  originalWidth?: number
  originalHeight?: number
  fileSize?: number
}

export class EmojiIntelligence {
  private static readonly EDGE_SAMPLE_POINTS = 20
  private static readonly COLOR_THRESHOLD = 30
  private static readonly BACKGROUND_SAMPLE_RATIO = 0.1

  static async analyzeImage(file: File): Promise<{ analysis: ImageAnalysis; details: AnalysisDetails }> {
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

        // Perform various analyses
        const backgroundAnalysis = this.analyzeBackground(data, canvas.width, canvas.height)
        const contrastAnalysis = this.analyzeContrast(data)
        const saturationAnalysis = this.analyzeSaturation(data)
        const sharpnessAnalysis = this.analyzeSharpness(data, canvas.width, canvas.height)
        const transparencyAnalysis = this.analyzeTransparency(data)
        const brightnessAnalysis = this.analyzeBrightness(data)
        const colorAnalysis = this.analyzeColorDistribution(data)
        const edgeAnalysis = this.analyzeEdgeClarity(data, canvas.width, canvas.height)
        const subjectAnalysis = this.analyzeSubjectCoverage(data, canvas.width, canvas.height, backgroundAnalysis.backgroundColor)
        const whiteSpaceAnalysis = this.analyzeWhiteSpace(data, canvas.width, canvas.height)
        const symmetryAnalysis = this.analyzeSymmetry(data, canvas.width, canvas.height)
        const noiseAnalysis = this.analyzeNoise(data, canvas.width, canvas.height)
        const aspectRatioAnalysis = this.analyzeAspectRatio(data, canvas.width, canvas.height, backgroundAnalysis.backgroundColor)
        const dominantColors = this.extractDominantColors(data)
        const imageType = this.detectImageType(data, canvas.width, canvas.height)
        const suggestedCrop = this.suggestCropBox(data, canvas.width, canvas.height, backgroundAnalysis.backgroundColor)

        // Slack-focused readability at small sizes (32px and 64px buckets)
        const readability32 = this.analyzeReadabilityAtSize(canvas, 32)
        const readability64 = this.analyzeReadabilityAtSize(canvas, 64)

        // Per-theme contrast evaluation (approximate Slack backgrounds)
        const themeContrast = this.analyzeThemeContrast(
          data,
          canvas.width,
          canvas.height,
          backgroundAnalysis.backgroundColor
        )

        // Calculate overall quality score
        const overallQuality = this.calculateOverallQuality({
          contrastScore: contrastAnalysis.score,
          saturationScore: Math.abs(saturationAnalysis.score - 50) < 30 ? 100 - Math.abs(saturationAnalysis.score - 50) : 70,
          sharpnessScore: sharpnessAnalysis.score,
          subjectCoverageScore: subjectAnalysis.score,
          edgeClarity: edgeAnalysis.score,
          backgroundScore: 100 - backgroundAnalysis.score,
        })

        resolve({
          analysis: {
            hasBackground: backgroundAnalysis.hasBackground,
            backgroundScore: backgroundAnalysis.score,
            contrastScore: contrastAnalysis.score,
            saturationScore: saturationAnalysis.score,
            sharpnessScore: sharpnessAnalysis.score,
            subjectCoverageScore: subjectAnalysis.score,
            transparencyScore: transparencyAnalysis.score,
            brightnessScore: brightnessAnalysis.score,
            colorDistributionScore: colorAnalysis.score,
            edgeClarity: edgeAnalysis.score,
            whiteSpaceScore: whiteSpaceAnalysis.score,
            symmetryScore: symmetryAnalysis.score,
            noiseScore: noiseAnalysis.score,
            aspectRatioScore: aspectRatioAnalysis.score,
            readabilityScore32: readability32,
            readabilityScore64: readability64,
            themeContrastLight: themeContrast.light,
            themeContrastDark: themeContrast.dark,
            minThemeContrast: Math.min(themeContrast.light, themeContrast.dark),
            overallQuality,
          },
          details: {
            dominantColors,
            backgroundColor: backgroundAnalysis.backgroundColor,
            hasTransparency: transparencyAnalysis.hasTransparency,
            imageType,
            suggestedCropBox: suggestedCrop,
            originalWidth: img.width,
            originalHeight: img.height,
            fileSize: file.size,
          },
        })
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  // Compute readability for a given target size (max dimension). Higher is better.
  private static analyzeReadabilityAtSize(baseCanvas: HTMLCanvasElement, targetMax: number): number {
    const width = baseCanvas.width
    const height = baseCanvas.height
    if (width === 0 || height === 0) return 50

    const scale = Math.min(targetMax / width, targetMax / height)
    const scaledW = Math.max(1, Math.round(width * scale))
    const scaledH = Math.max(1, Math.round(height * scale))

    const scaledCanvas = document.createElement('canvas')
    const scaledCtx = scaledCanvas.getContext('2d', { willReadFrequently: true })
    if (!scaledCtx) return 50
    scaledCanvas.width = scaledW
    scaledCanvas.height = scaledH
    scaledCtx.clearRect(0, 0, scaledW, scaledH)
    scaledCtx.drawImage(baseCanvas, 0, 0, scaledW, scaledH)

    const { data } = scaledCtx.getImageData(0, 0, scaledW, scaledH)
    const contrast = this.analyzeContrast(data).score
    const edge = this.analyzeEdgeClarity(data, scaledW, scaledH).score
    // Weight edges more because small-size crispness matters most
    return Math.round(edge * 0.6 + contrast * 0.4)
  }

  // Estimate contrast against Slack light and dark themes using subject luminance
  private static analyzeThemeContrast(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    backgroundColor: string | null
  ): { light: number; dark: number } {
    // Compute average luminance of likely-subject pixels (non-background, non-transparent)
    let sumLum = 0
    let count = 0
    const bgRgb = backgroundColor ? this.hexToRgb(backgroundColor) : null

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a === 0) continue
      if (bgRgb) {
        const diff = Math.abs(data[i] - bgRgb.r) + Math.abs(data[i + 1] - bgRgb.g) + Math.abs(data[i + 2] - bgRgb.b)
        if (diff < 30) continue // likely background
      }
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      sumLum += lum
      count++
    }

    const subjLum = count > 0 ? sumLum / count : 128
    const lightBgLum = 255 // approx white UI surfaces
    const darkBgLum = 34 // approx Slack dark theme surface

    const contrastLight = Math.abs(subjLum - lightBgLum) / 255 * 100
    const contrastDark = Math.abs(subjLum - darkBgLum) / 255 * 100
    return { light: Math.round(contrastLight), dark: Math.round(contrastDark) }
  }

  private static analyzeBackground(
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { hasBackground: boolean; score: number; backgroundColor: string | null } {
    // Sample edge pixels to detect background
    const edgePixels: Array<{ r: number; g: number; b: number }> = []
    
    // Sample corners and edges
    for (let i = 0; i < this.EDGE_SAMPLE_POINTS; i++) {
      const t = i / (this.EDGE_SAMPLE_POINTS - 1)
      
      // Top edge
      const topX = Math.floor(t * (width - 1))
      const topIdx = topX * 4
      edgePixels.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] })
      
      // Bottom edge
      const bottomIdx = ((height - 1) * width + topX) * 4
      edgePixels.push({ r: data[bottomIdx], g: data[bottomIdx + 1], b: data[bottomIdx + 2] })
      
      // Left edge
      const leftY = Math.floor(t * (height - 1))
      const leftIdx = (leftY * width) * 4
      edgePixels.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] })
      
      // Right edge
      const rightIdx = (leftY * width + width - 1) * 4
      edgePixels.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] })
    }

    // Find most common color
    const avgColor = {
      r: Math.round(edgePixels.reduce((sum, p) => sum + p.r, 0) / edgePixels.length),
      g: Math.round(edgePixels.reduce((sum, p) => sum + p.g, 0) / edgePixels.length),
      b: Math.round(edgePixels.reduce((sum, p) => sum + p.b, 0) / edgePixels.length),
    }

    // Check color consistency
    let consistentPixels = 0
    for (const pixel of edgePixels) {
      const distance = Math.sqrt(
        Math.pow(pixel.r - avgColor.r, 2) +
        Math.pow(pixel.g - avgColor.g, 2) +
        Math.pow(pixel.b - avgColor.b, 2)
      )
      if (distance < this.COLOR_THRESHOLD) {
        consistentPixels++
      }
    }

    const consistencyRatio = consistentPixels / edgePixels.length
    const hasBackground = consistencyRatio > 0.6
    const score = consistencyRatio * 100

    const backgroundColor = hasBackground
      ? `#${avgColor.r.toString(16).padStart(2, '0')}${avgColor.g.toString(16).padStart(2, '0')}${avgColor.b.toString(16).padStart(2, '0')}`
      : null

    return { hasBackground, score, backgroundColor }
  }

  private static analyzeContrast(data: Uint8ClampedArray): { score: number } {
    let minLuminance = 255
    let maxLuminance = 0
    let totalLuminance = 0
    let pixelCount = 0

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a > 0) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        minLuminance = Math.min(minLuminance, luminance)
        maxLuminance = Math.max(maxLuminance, luminance)
        totalLuminance += luminance
        pixelCount++
      }
    }

    const contrastRange = maxLuminance - minLuminance
    const score = (contrastRange / 255) * 100

    return { score }
  }

  private static analyzeSaturation(data: Uint8ClampedArray): { score: number } {
    let totalSaturation = 0
    let pixelCount = 0

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a > 0) {
        const r = data[i] / 255
        const g = data[i + 1] / 255
        const b = data[i + 2] / 255

        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const delta = max - min

        const lightness = (max + min) / 2
        
        let saturation = 0
        if (delta !== 0) {
          saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
        }

        totalSaturation += saturation
        pixelCount++
      }
    }

    const avgSaturation = pixelCount > 0 ? totalSaturation / pixelCount : 0
    const score = avgSaturation * 100

    return { score }
  }

  private static analyzeSharpness(data: Uint8ClampedArray, width: number, height: number): { score: number } {
    // Use Laplacian operator to detect edges (indicator of sharpness)
    let edgeStrength = 0
    let pixelCount = 0

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        if (data[idx + 3] === 0) continue // Skip transparent pixels
        
        const center = data[idx]
        const top = data[((y - 1) * width + x) * 4]
        const bottom = data[((y + 1) * width + x) * 4]
        const left = data[(y * width + (x - 1)) * 4]
        const right = data[(y * width + (x + 1)) * 4]
        
        const laplacian = Math.abs(4 * center - top - bottom - left - right)
        edgeStrength += laplacian
        pixelCount++
      }
    }

    const avgEdgeStrength = pixelCount > 0 ? edgeStrength / pixelCount : 0
    const score = Math.min(100, (avgEdgeStrength / 50) * 100) // Normalize to 0-100

    return { score }
  }

  private static analyzeTransparency(data: Uint8ClampedArray): { score: number; hasTransparency: boolean } {
    let transparentPixels = 0
    const totalPixels = data.length / 4

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        transparentPixels++
      }
    }

    const score = (transparentPixels / totalPixels) * 100
    const hasTransparency = transparentPixels > 0

    return { score, hasTransparency }
  }

  private static analyzeBrightness(data: Uint8ClampedArray): { score: number } {
    let totalBrightness = 0
    let pixelCount = 0

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a > 0) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
        totalBrightness += brightness
        pixelCount++
      }
    }

    const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 128
    const score = (avgBrightness / 255) * 100

    return { score }
  }

  private static analyzeColorDistribution(data: Uint8ClampedArray): { score: number } {
    const colorMap = new Map<string, number>()
    
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a > 0) {
        // Quantize colors to reduce noise
        const r = Math.floor(data[i] / 32) * 32
        const g = Math.floor(data[i + 1] / 32) * 32
        const b = Math.floor(data[i + 2] / 32) * 32
        const key = `${r},${g},${b}`
        
        colorMap.set(key, (colorMap.get(key) || 0) + 1)
      }
    }

    // Score based on color variety (more unique colors = better distribution)
    const uniqueColors = colorMap.size
    const score = Math.min(100, (uniqueColors / 50) * 100) // Normalize to 0-100

    return { score }
  }

  private static analyzeEdgeClarity(data: Uint8ClampedArray, width: number, height: number): { score: number } {
    // Analyze the clarity of edges using Sobel operator
    let totalEdgeClarity = 0
    let edgePixelCount = 0

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        
        if (data[idx + 3] === 0) continue
        
        // Sobel X
        const sobelX = 
          -1 * data[((y - 1) * width + (x - 1)) * 4] +
          1 * data[((y - 1) * width + (x + 1)) * 4] +
          -2 * data[(y * width + (x - 1)) * 4] +
          2 * data[(y * width + (x + 1)) * 4] +
          -1 * data[((y + 1) * width + (x - 1)) * 4] +
          1 * data[((y + 1) * width + (x + 1)) * 4]
        
        // Sobel Y
        const sobelY = 
          -1 * data[((y - 1) * width + (x - 1)) * 4] +
          -2 * data[((y - 1) * width + x) * 4] +
          -1 * data[((y - 1) * width + (x + 1)) * 4] +
          1 * data[((y + 1) * width + (x - 1)) * 4] +
          2 * data[((y + 1) * width + x) * 4] +
          1 * data[((y + 1) * width + (x + 1)) * 4]
        
        const magnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY)
        if (magnitude > 30) { // Edge detected
          totalEdgeClarity += Math.min(255, magnitude)
          edgePixelCount++
        }
      }
    }

    const avgClarity = edgePixelCount > 0 ? totalEdgeClarity / edgePixelCount : 0
    const score = (avgClarity / 255) * 100

    return { score }
  }

  private static analyzeSubjectCoverage(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    backgroundColor: string | null
  ): { score: number } {
    if (!backgroundColor) {
      // If no background detected, assume good subject coverage
      return { score: 75 }
    }

    // Parse background color
    const bgR = parseInt(backgroundColor.slice(1, 3), 16)
    const bgG = parseInt(backgroundColor.slice(3, 5), 16)
    const bgB = parseInt(backgroundColor.slice(5, 7), 16)

    let subjectPixels = 0
    const totalPixels = width * height

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a > 0) {
        const distance = Math.sqrt(
          Math.pow(data[i] - bgR, 2) +
          Math.pow(data[i + 1] - bgG, 2) +
          Math.pow(data[i + 2] - bgB, 2)
        )
        
        if (distance > this.COLOR_THRESHOLD * 1.5) {
          subjectPixels++
        }
      }
    }

    const score = (subjectPixels / totalPixels) * 100
    return { score }
  }

  private static extractDominantColors(data: Uint8ClampedArray): string[] {
    const colorMap = new Map<string, number>()
    
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a > 0) {
        // Quantize colors
        const r = Math.floor(data[i] / 64) * 64
        const g = Math.floor(data[i + 1] / 64) * 64
        const b = Math.floor(data[i + 2] / 64) * 64
        const key = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        
        colorMap.set(key, (colorMap.get(key) || 0) + 1)
      }
    }

    // Sort by frequency and return top 5
    return Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color)
  }

  private static detectImageType(data: Uint8ClampedArray, width: number, height: number): 'photo' | 'illustration' | 'text' | 'mixed' {
    // Simple heuristic based on color distribution and edge characteristics
    const colorAnalysis = this.analyzeColorDistribution(data)
    const sharpnessAnalysis = this.analyzeSharpness(data, width, height)
    
    if (colorAnalysis.score > 80) {
      return 'photo'
    } else if (sharpnessAnalysis.score > 70 && colorAnalysis.score < 30) {
      return 'illustration'
    } else if (sharpnessAnalysis.score > 80 && colorAnalysis.score < 20) {
      return 'text'
    } else {
      return 'mixed'
    }
  }

  private static suggestCropBox(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    backgroundColor: string | null
  ): { x: number; y: number; width: number; height: number } | undefined {
    if (!backgroundColor) return undefined

    // Parse background color
    const bgR = parseInt(backgroundColor.slice(1, 3), 16)
    const bgG = parseInt(backgroundColor.slice(3, 5), 16)
    const bgB = parseInt(backgroundColor.slice(5, 7), 16)

    let minX = width, maxX = 0, minY = height, maxY = 0
    let hasContent = false

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const a = data[idx + 3]
        
        if (a > 0) {
          const distance = Math.sqrt(
            Math.pow(data[idx] - bgR, 2) +
            Math.pow(data[idx + 1] - bgG, 2) +
            Math.pow(data[idx + 2] - bgB, 2)
          )
          
          if (distance > this.COLOR_THRESHOLD * 2) {
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
            hasContent = true
          }
        }
      }
    }

    if (!hasContent) return undefined

    // Add some padding
    const padding = Math.floor(Math.min(width, height) * 0.05)
    minX = Math.max(0, minX - padding)
    maxX = Math.min(width - 1, maxX + padding)
    minY = Math.max(0, minY - padding)
    maxY = Math.min(height - 1, maxY + padding)

    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    }
  }

  private static analyzeWhiteSpace(data: Uint8ClampedArray, width: number, height: number): { score: number } {
    // Analyze how much of the image is unnecessary whitespace
    let emptyPixels = 0
    const totalPixels = width * height
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      
      // Check if pixel is white or transparent
      if (a < 10 || (r > 240 && g > 240 && b > 240)) {
        emptyPixels++
      }
    }
    
    const whiteSpaceRatio = emptyPixels / totalPixels
    // Higher score means more whitespace (which is bad)
    return { score: Math.round(whiteSpaceRatio * 100) }
  }
  
  private static analyzeSymmetry(data: Uint8ClampedArray, width: number, height: number): { score: number } {
    // Analyze horizontal and vertical symmetry
    let horizontalDiff = 0
    let verticalDiff = 0
    let totalComparisons = 0
    
    // Check horizontal symmetry
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < Math.floor(width / 2); x++) {
        const leftIdx = (y * width + x) * 4
        const rightIdx = (y * width + (width - 1 - x)) * 4
        
        const diff = Math.abs(data[leftIdx] - data[rightIdx]) +
                    Math.abs(data[leftIdx + 1] - data[rightIdx + 1]) +
                    Math.abs(data[leftIdx + 2] - data[rightIdx + 2])
        horizontalDiff += diff / (255 * 3)
        totalComparisons++
      }
    }
    
    // Check vertical symmetry
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < Math.floor(height / 2); y++) {
        const topIdx = (y * width + x) * 4
        const bottomIdx = ((height - 1 - y) * width + x) * 4
        
        const diff = Math.abs(data[topIdx] - data[bottomIdx]) +
                    Math.abs(data[topIdx + 1] - data[bottomIdx + 1]) +
                    Math.abs(data[topIdx + 2] - data[bottomIdx + 2])
        verticalDiff += diff / (255 * 3)
        totalComparisons++
      }
    }
    
    const avgDiff = (horizontalDiff + verticalDiff) / (totalComparisons * 2)
    // Higher score means more symmetrical
    return { score: Math.round((1 - avgDiff) * 100) }
  }
  
  private static analyzeNoise(data: Uint8ClampedArray, width: number, height: number): { score: number } {
    // Analyze image noise and artifacts using local variance
    let totalVariance = 0
    let pixelCount = 0
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
        
        // Calculate variance with neighbors
        const neighbors = [
          ((y - 1) * width + (x - 1)) * 4,
          ((y - 1) * width + x) * 4,
          ((y - 1) * width + (x + 1)) * 4,
          (y * width + (x - 1)) * 4,
          (y * width + (x + 1)) * 4,
          ((y + 1) * width + (x - 1)) * 4,
          ((y + 1) * width + x) * 4,
          ((y + 1) * width + (x + 1)) * 4,
        ]
        
        let variance = 0
        for (const nIdx of neighbors) {
          const nGray = (data[nIdx] + data[nIdx + 1] + data[nIdx + 2]) / 3
          variance += Math.pow(gray - nGray, 2)
        }
        
        totalVariance += Math.sqrt(variance / 8)
        pixelCount++
      }
    }
    
    const avgNoise = totalVariance / pixelCount
    // Normalize noise (lower is better, so invert for score)
    const noiseScore = Math.max(0, Math.min(100, 100 - (avgNoise / 255) * 200))
    return { score: Math.round(noiseScore) }
  }
  
  private static analyzeAspectRatio(
    data: Uint8ClampedArray, 
    width: number, 
    height: number,
    backgroundColor: string | null
  ): { score: number } {
    // Find the bounding box of the subject
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0
    
    const bgColor = backgroundColor ? this.hexToRgb(backgroundColor) : null
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const a = data[idx + 3]
        
        // Check if pixel is part of subject (not transparent and not background)
        let isSubject = a > 10
        
        if (isSubject && bgColor) {
          const colorDiff = Math.abs(data[idx] - bgColor.r) +
                          Math.abs(data[idx + 1] - bgColor.g) +
                          Math.abs(data[idx + 2] - bgColor.b)
          isSubject = colorDiff > 30
        }
        
        if (isSubject) {
          minX = Math.min(minX, x)
          maxX = Math.max(maxX, x)
          minY = Math.min(minY, y)
          maxY = Math.max(maxY, y)
        }
      }
    }
    
    if (minX > maxX || minY > maxY) {
      return { score: 50 } // No subject found
    }
    
    const subjectWidth = maxX - minX + 1
    const subjectHeight = maxY - minY + 1
    const aspectRatio = subjectWidth / subjectHeight
    
    // Ideal aspect ratio is 1:1 (square) for emojis
    const deviationFromSquare = Math.abs(1 - aspectRatio)
    const score = Math.max(0, Math.min(100, 100 - deviationFromSquare * 100))
    
    return { score: Math.round(score) }
  }
  
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  private static calculateOverallQuality(scores: Record<string, number>): number {
    const weights = {
      contrastScore: 0.2,
      saturationScore: 0.15,
      sharpnessScore: 0.2,
      subjectCoverageScore: 0.25,
      edgeClarity: 0.1,
      backgroundScore: 0.1,
    }

    let totalScore = 0
    let totalWeight = 0

    for (const [key, weight] of Object.entries(weights)) {
      if (scores[key] !== undefined) {
        totalScore += scores[key] * weight
        totalWeight += weight
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 50
  }
}