import { removeBackground } from './background-removal'
import { HDRProcessor } from './hdr-processor'
import { AnalysisDetails } from './emoji-intelligence'
import { EmojiRecommendation } from './emoji-recommendations'

export interface EnhancementResult {
  blob: Blob
  appliedEnhancements: string[]
  processingTime: number
}

export class EmojiAutoEnhance {
  // Slack emoji requirements
  private static readonly SLACK_MAX_SIZE = 128 * 1024 // 128KB
  private static readonly SLACK_MAX_DIMENSION = 128 // 128x128 pixels
  
  // Try to load optional, faster libraries lazily at runtime (keeps bundle light)
  private static async getPicaInstance(): Promise<any | null> {
    try {
      const mod: any = await import('pica')
      return typeof mod.default === 'function' ? mod.default() : (typeof mod === 'function' ? mod() : null)
    } catch {
      return null
    }
  }
  
  private static async trySmartCrop(img: HTMLImageElement, target: number): Promise<{ x: number; y: number; width: number; height: number } | null> {
    try {
      const smartcrop: any = (await import('smartcrop')).default
      const result = await smartcrop.crop(img, { width: target, height: target, minScale: 1.0 })
      if (result && result.topCrop) {
        const c = result.topCrop
        return { x: c.x, y: c.y, width: c.width, height: c.height }
      }
      return null
    } catch {
      return null
    }
  }
  
  static async applyRecommendation(
    file: File,
    recommendation: EmojiRecommendation,
    analysisDetails?: AnalysisDetails
  ): Promise<EnhancementResult> {
    const startTime = performance.now()
    const appliedEnhancements: string[] = []

    let resultBlob: Blob = file

    switch (recommendation.type) {
      case 'background':
        resultBlob = await this.removeBackground(file)
        appliedEnhancements.push('Background removed')
        break

      case 'contrast':
        // Apply different levels based on recommendation ID
        const contrastLevel = recommendation.id === 'subtle-contrast' ? 1.15 : 1.3
        resultBlob = await this.enhanceContrastWithLevel(file, contrastLevel)
        appliedEnhancements.push('Contrast enhanced')
        break

      case 'crop':
        if (analysisDetails?.suggestedCropBox) {
          const { suggestedCropBox } = analysisDetails
          const originalW = analysisDetails.originalWidth || 0
          const originalH = analysisDetails.originalHeight || 0
          const cropArea = suggestedCropBox.width * suggestedCropBox.height
          const originalArea = originalW > 0 && originalH > 0 ? originalW * originalH : 0
          const areaRatio = originalArea > 0 ? cropArea / originalArea : 1
          // If suggested crop doesn't meaningfully change framing (>90% of original), try smart auto-crop
          if (areaRatio > 0.9) {
            resultBlob = await this.autoCrop(file)
            appliedEnhancements.push('Aspect optimized')
          } else {
            resultBlob = await this.cropToSubject(file, suggestedCropBox)
            appliedEnhancements.push('Cropped to subject')
          }
        } else if (recommendation.id === 'trim-whitespace' || recommendation.id === 'optimize-aspect') {
          // Auto-detect crop for whitespace and aspect ratio fixes
          resultBlob = await this.autoCrop(file)
          appliedEnhancements.push('Auto-cropped')
        }
        break

      case 'color':
        // Apply different saturation levels based on recommendation
        const saturationLevel = recommendation.id === 'subtle-color' ? 1.2 : 1.4
        resultBlob = await this.enhanceColorsWithLevel(file, saturationLevel)
        appliedEnhancements.push('Colors enhanced')
        break

      case 'sharpness':
        // Apply different sharpness levels
        const sharpnessLevel = recommendation.id === 'subtle-sharpen' ? 0.7 : 1.0
        resultBlob = await this.sharpenImageWithLevel(file, sharpnessLevel)
        appliedEnhancements.push(recommendation.id === 'reduce-noise' ? 'Noise reduced' : 'Sharpness improved')
        break

      case 'brightness':
        const needsBrightening = recommendation.id === 'brighten-image' || recommendation.id === 'subtle-brightness'
        const adjustmentLevel = recommendation.id.includes('subtle') ? 25 : 50  // Increased from 15/30 to 25/50
        resultBlob = await this.adjustBrightnessWithLevel(file, needsBrightening, adjustmentLevel)
        appliedEnhancements.push(needsBrightening ? 'Brightness increased' : 'Brightness reduced')
        break
      
      case 'hdr':
        // HDR look that remains Slack-compatible (PNG/JPEG)
        try {
          const hdr = await HDRProcessor.createAppleHDR(file, { intensity: 60, toneMapping: 'aces', maxContentBoost: 2 })
          if (hdr) {
            resultBlob = hdr
            appliedEnhancements.push('HDR look applied')
            break
          }
        } catch {}
        // Fallback: stronger contrast+vibrance if HDR creation fails
        resultBlob = await this.enhanceColorsWithLevel(await this.enhanceContrastWithLevel(file, 1.25) as any, 1.25)
        appliedEnhancements.push('HDR look (fallback)')
        break
    }

    // Ensure single recommendation output also meets Slack requirements
    resultBlob = await this.ensureSlackCompliance(resultBlob, file.type || 'image/png')

    const processingTime = performance.now() - startTime

    return {
      blob: resultBlob,
      appliedEnhancements,
      processingTime,
    }
  }

  static async applyAllRecommendations(
    file: File,
    recommendations: EmojiRecommendation[],
    analysisDetails?: AnalysisDetails
  ): Promise<EnhancementResult> {
    const startTime = performance.now()
    const appliedEnhancements: string[] = []
    let currentBlob: Blob = file

    // Sort recommendations by priority
    const sortedRecs = [...recommendations].sort((a, b) => b.priority - a.priority)

    for (const rec of sortedRecs) {
      try {
        const tempFile = new File([currentBlob], file.name, { type: currentBlob.type })
        const result = await this.applyRecommendation(tempFile, rec, analysisDetails)
        currentBlob = result.blob
        appliedEnhancements.push(...result.appliedEnhancements)
      } catch (error) {
        console.error(`Failed to apply ${rec.type} enhancement:`, error)
      }
    }

    // Ensure final output meets Slack requirements
    currentBlob = await this.ensureSlackCompliance(currentBlob, file.type || 'image/png')

    const processingTime = performance.now() - startTime

    return {
      blob: currentBlob,
      appliedEnhancements,
      processingTime,
    }
  }
  
  private static async ensureSlackCompliance(blob: Blob, mimeType: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }
      
      img.onload = async () => {
        // Determine final dimensions within 128x128
        let finalWidth = img.width
        let finalHeight = img.height
        if (finalWidth > this.SLACK_MAX_DIMENSION || finalHeight > this.SLACK_MAX_DIMENSION) {
          const s = Math.min(this.SLACK_MAX_DIMENSION / finalWidth, this.SLACK_MAX_DIMENSION / finalHeight)
          finalWidth = Math.round(finalWidth * s)
          finalHeight = Math.round(finalHeight * s)
        }

        // Prepare source and destination canvases
        const srcCanvas = document.createElement('canvas')
        const srcCtx = srcCanvas.getContext('2d')
        if (!srcCtx) { resolve(blob); return }
        srcCanvas.width = img.width
        srcCanvas.height = img.height
        srcCtx.clearRect(0, 0, srcCanvas.width, srcCanvas.height)
        srcCtx.drawImage(img, 0, 0)

        canvas.width = Math.min(finalWidth, this.SLACK_MAX_DIMENSION)
        canvas.height = Math.min(finalHeight, this.SLACK_MAX_DIMENSION)
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const pica = await this.getPicaInstance()
        if (pica) {
          try {
            await pica.resize(srcCanvas, canvas, {
              unsharpAmount: 80,
              unsharpRadius: 1.0,
              unsharpThreshold: 2,
            })
          } catch {
            // Fallback to drawImage
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          }
        } else {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }

        // Attempt encoding under 128KB: WebP → JPEG → PNG fallback
        const tryEncode = async (type: string, startQ = 0.95): Promise<Blob | null> => {
          let q = startQ
          let best: Blob | null = null
          while (q >= 0.1) {
            const b: Blob | null = await new Promise((res) => canvas.toBlob(res, type, q))
            if (b && b.size <= this.SLACK_MAX_SIZE) return b
            best = b
            q -= 0.08
          }
          return best && best.size <= this.SLACK_MAX_SIZE * 1.2 ? best : null
        }

        let resultBlob: Blob | null = null
        // Prefer webp if available
        try {
          resultBlob = await tryEncode('image/webp', 0.95)
        } catch {}
        if (!resultBlob) {
          resultBlob = await tryEncode('image/jpeg', 0.92)
        }
        if (!resultBlob) {
          resultBlob = await new Promise((res) => canvas.toBlob(b => res(b || new Blob([])), 'image/png'))
        }

        // If still too large, scale down progressively and retry JPEG
        while (resultBlob && resultBlob.size > this.SLACK_MAX_SIZE && (canvas.width > 64 || canvas.height > 64)) {
          const down = 0.9
          const nw = Math.max(64, Math.round(canvas.width * down))
          const nh = Math.max(64, Math.round(canvas.height * down))
          const tmp = document.createElement('canvas')
          tmp.width = nw
          tmp.height = nh
          const tctx = tmp.getContext('2d')!
          if (pica) {
            try {
              await pica.resize(canvas, tmp)
            } catch {
              tctx.drawImage(canvas, 0, 0, nw, nh)
            }
          } else {
            tctx.drawImage(canvas, 0, 0, nw, nh)
          }
          canvas.width = nw
          canvas.height = nh
          ctx.clearRect(0, 0, nw, nh)
          ctx.drawImage(tmp, 0, 0)
          resultBlob = await tryEncode('image/jpeg', 0.85)
          if (!resultBlob) break
        }

        resolve(resultBlob || blob)
      }
      
      img.onerror = () => {
        resolve(blob) // Return original if we can't process
      }
      
      img.src = URL.createObjectURL(blob)
    })
  }

  private static async removeBackground(file: File): Promise<Blob> {
    try {
      return await removeBackground(file)
    } catch (error) {
      console.error('Background removal failed:', error)
      return file
    }
  }

  private static async enhanceContrastWithLevel(file: File, contrastFactor: number = 1.3): Promise<Blob> {
    return this.enhanceContrast(file, contrastFactor)
  }

  private static async enhanceContrast(file: File, contrastFactor: number = 1.3): Promise<Blob> {
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

        // Apply contrast enhancement using S-curve
        // contrastFactor is now passed as parameter
        
        for (let i = 0; i < data.length; i += 4) {
          // Skip transparent pixels
          if (data[i + 3] === 0) continue

          // Apply contrast to each channel
          for (let j = 0; j < 3; j++) {
            let value = data[i + j] / 255
            // S-curve formula for contrast
            value = Math.pow(value, 1 / contrastFactor)
            value = 0.5 + (value - 0.5) * contrastFactor
            data[i + j] = Math.max(0, Math.min(255, value * 255))
          }
        }

        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, file.type || 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private static async cropToSubject(
    file: File,
    cropBox: { x: number; y: number; width: number; height: number }
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      img.onload = () => {
        // Set canvas to crop dimensions
        canvas.width = cropBox.width
        canvas.height = cropBox.height

        // Draw cropped portion
        ctx.drawImage(
          img,
          cropBox.x,
          cropBox.y,
          cropBox.width,
          cropBox.height,
          0,
          0,
          cropBox.width,
          cropBox.height
        )

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, file.type || 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private static async autoCrop(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      img.onload = async () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        // Prefer ML-based segmentation mask from @imgly/background-removal for tight crop
        const targetSize = 128
        let cropX = 0, cropY = 0, cropW = img.width, cropH = img.height

        try {
          const mod: any = await import(/* @vite-ignore */ '@imgly/background-removal').catch(() => null)
          const remove: any = mod?.default || mod?.removeBackground || null
          if (typeof remove === 'function') {
            // Run the model to get a transparent foreground-only canvas/blob
            const fileLike = new File([await new Promise<Blob>((res) => {
              // Convert current canvas region to blob to feed model
              canvas.toBlob((b) => res(b || new Blob([])), 'image/png')
            })], 'crop.png', { type: 'image/png' })
            const out: any = await remove(fileLike, { model: 'isnet-general-use' })
            const maskCanvas = await (async () => {
              if (out instanceof HTMLCanvasElement) return out
              if (out instanceof OffscreenCanvas) {
                const blob = await (out as OffscreenCanvas).convertToBlob({ type: 'image/png' })
                const bmp = await createImageBitmap(blob)
                const c = document.createElement('canvas')
                c.width = bmp.width; c.height = bmp.height
                const cx = c.getContext('2d')!
                cx.drawImage(bmp, 0, 0)
                return c
              }
              if (out instanceof Blob || out instanceof File) {
                const blob = out as Blob
                const url = URL.createObjectURL(blob)
                const im = new Image()
                await new Promise<void>((r, j) => { im.onload = () => r(); im.onerror = () => j(); im.src = url })
                const c = document.createElement('canvas')
                c.width = im.width; c.height = im.height
                const cx = c.getContext('2d')!
                cx.drawImage(im, 0, 0)
                URL.revokeObjectURL(url)
                return c
              }
              return null
            })()
            if (maskCanvas) {
              // Use alpha > 10 as foreground; compute tight bounds
              const mcx = maskCanvas.getContext('2d', { willReadFrequently: true })!
              const { data, width, height } = mcx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
              let minX = width, maxX = 0, minY = height, maxY = 0
              let found = false
              for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                  const a = data[(y * width + x) * 4 + 3]
                  if (a > 10) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                    found = true
                  }
                }
              }
              if (found) {
                const pad = 4
                cropX = Math.max(0, minX - pad)
                cropY = Math.max(0, minY - pad)
                cropW = Math.min(width - cropX, maxX - minX + 1 + pad * 2)
                cropH = Math.min(height - cropY, maxY - minY + 1 + pad * 2)
              }
            }
          }
        } catch {}

        // If ML path didn't refine box, try smartcrop as a heuristic fallback
        if (cropW === img.width && cropH === img.height) {
          const topCrop = await this.trySmartCrop(img, targetSize)
          if (topCrop) {
            cropX = topCrop.x; cropY = topCrop.y; cropW = topCrop.width; cropH = topCrop.height
          } else {
            // Fallback: simple content bounds detection (original logic)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0
            let foundContent = false
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const idx = (y * canvas.width + x) * 4
                const a = data[idx + 3]
                const r = data[idx]
                const g = data[idx + 1]
                const b = data[idx + 2]
                const isContent = a > 10 && (a < 255 || !(r > 240 && g > 240 && b > 240))
                if (isContent) {
                  minX = Math.min(minX, x)
                  maxX = Math.max(maxX, x)
                  minY = Math.min(minY, y)
                  maxY = Math.max(maxY, y)
                  foundContent = true
                }
              }
            }
            if (foundContent) {
              const padding = 5
              cropX = Math.max(0, minX - padding)
              cropY = Math.max(0, minY - padding)
              cropW = Math.min(canvas.width - cropX, maxX - minX + 1 + padding * 2)
              cropH = Math.min(canvas.height - cropY, maxY - minY + 1 + padding * 2)
            }
          }
        }

        const dest = document.createElement('canvas')
        dest.width = targetSize
        dest.height = targetSize
        const dctx = dest.getContext('2d')!
        const pica = await this.getPicaInstance()
        if (pica) {
          // Use an intermediate cropped canvas for pica
          const tmp = document.createElement('canvas')
          tmp.width = cropW
          tmp.height = cropH
          const tctx = tmp.getContext('2d')!
          tctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
          const scale = Math.min(targetSize / cropW, targetSize / cropH)
          const finalW = Math.round(cropW * scale)
          const finalH = Math.round(cropH * scale)
          const resized = document.createElement('canvas')
          resized.width = finalW
          resized.height = finalH
          await pica.resize(tmp, resized, { unsharpAmount: 80, unsharpRadius: 1.0, unsharpThreshold: 2 })
          dctx.clearRect(0, 0, targetSize, targetSize)
          dctx.drawImage(resized, Math.round((targetSize - finalW) / 2), Math.round((targetSize - finalH) / 2))
        } else {
          const scale = Math.min(targetSize / cropW, targetSize / cropH)
          const finalW = Math.round(cropW * scale)
          const finalH = Math.round(cropH * scale)
          dctx.clearRect(0, 0, targetSize, targetSize)
          dctx.drawImage(img, cropX, cropY, cropW, cropH, Math.round((targetSize - finalW) / 2), Math.round((targetSize - finalH) / 2), finalW, finalH)
        }

        dest.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('Failed to create blob'))
        }, file.type || 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private static async enhanceColorsWithLevel(file: File, saturationBoost: number = 1.4): Promise<Blob> {
    return this.enhanceColors(file, saturationBoost)
  }

  private static async enhanceColors(file: File, saturationBoost: number = 1.4): Promise<Blob> {
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

        // Enhance saturation using passed parameter

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue

          const r = data[i] / 255
          const g = data[i + 1] / 255
          const b = data[i + 2] / 255

          // Convert to HSL
          const max = Math.max(r, g, b)
          const min = Math.min(r, g, b)
          const l = (max + min) / 2
          let s = 0
          let h = 0

          if (max !== min) {
            const d = max - min
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

            switch (max) {
              case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6
                break
              case g:
                h = ((b - r) / d + 2) / 6
                break
              case b:
                h = ((r - g) / d + 4) / 6
                break
            }
          }

          // Boost saturation
          s = Math.min(1, s * saturationBoost)

          // Convert back to RGB
          let newR, newG, newB

          if (s === 0) {
            newR = newG = newB = l
          } else {
            const hue2rgb = (p: number, q: number, t: number) => {
              if (t < 0) t += 1
              if (t > 1) t -= 1
              if (t < 1/6) return p + (q - p) * 6 * t
              if (t < 1/2) return q
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
              return p
            }

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s
            const p = 2 * l - q
            newR = hue2rgb(p, q, h + 1/3)
            newG = hue2rgb(p, q, h)
            newB = hue2rgb(p, q, h - 1/3)
          }

          data[i] = Math.round(newR * 255)
          data[i + 1] = Math.round(newG * 255)
          data[i + 2] = Math.round(newB * 255)
        }

        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, file.type || 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private static async sharpenImageWithLevel(file: File, strength: number = 1.0): Promise<Blob> {
    return this.sharpenImage(file, strength)
  }

  private static async sharpenImage(file: File, strength: number = 1.0): Promise<Blob> {
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
        const width = canvas.width
        const height = canvas.height

        // Create a copy for the sharpening kernel
        const output = new Uint8ClampedArray(data)

        // Sharpening kernel (unsharp mask) - adjust based on strength
        const centerValue = 4 + strength
        const kernel = [
          0, -1 * strength, 0,
          -1 * strength, centerValue, -1 * strength,
          0, -1 * strength, 0
        ]
        const kernelWeight = 1

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4

            if (data[idx + 3] === 0) continue // Skip transparent pixels

            for (let c = 0; c < 3; c++) {
              let sum = 0
              let kernelIdx = 0

              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const pixelIdx = ((y + ky) * width + (x + kx)) * 4
                  sum += data[pixelIdx + c] * kernel[kernelIdx]
                  kernelIdx++
                }
              }

              output[idx + c] = Math.max(0, Math.min(255, sum / kernelWeight))
            }
          }
        }

        // Put the sharpened image back
        const newImageData = new ImageData(output, width, height)
        ctx.putImageData(newImageData, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, file.type || 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  private static async adjustBrightnessWithLevel(file: File, brighten: boolean, adjustment: number = 30): Promise<Blob> {
    return this.adjustBrightness(file, brighten, adjustment)
  }

  private static async adjustBrightness(file: File, brighten: boolean, adjustment: number = 30): Promise<Blob> {
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

        // Adjust brightness using passed parameter
        const finalAdjustment = brighten ? adjustment : -adjustment

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue // Skip transparent pixels

          for (let j = 0; j < 3; j++) {
            data[i + j] = Math.max(0, Math.min(255, data[i + j] + finalAdjustment))
          }
        }

        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, file.type || 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }

  static async quickEnhance(file: File): Promise<Blob> {
    // A quick one-click enhancement that applies moderate improvements
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

        // Apply subtle improvements
        const contrastFactor = 1.1
        const saturationBoost = 1.2
        const brightnessAdjust = 5

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue

          // Slight brightness adjustment
          for (let j = 0; j < 3; j++) {
            let value = data[i + j]
            
            // Brightness
            value += brightnessAdjust
            
            // Contrast
            value = 128 + (value - 128) * contrastFactor
            
            data[i + j] = Math.max(0, Math.min(255, value))
          }

          // Slight saturation boost
          const r = data[i] / 255
          const g = data[i + 1] / 255
          const b = data[i + 2] / 255
          const gray = 0.299 * r + 0.587 * g + 0.114 * b

          data[i] = Math.round(Math.min(255, gray + (r - gray) * saturationBoost) * 255)
          data[i + 1] = Math.round(Math.min(255, gray + (g - gray) * saturationBoost) * 255)
          data[i + 2] = Math.round(Math.min(255, gray + (b - gray) * saturationBoost) * 255)
        }

        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob'))
          }
        }, file.type || 'image/png')
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = URL.createObjectURL(file)
    })
  }
}