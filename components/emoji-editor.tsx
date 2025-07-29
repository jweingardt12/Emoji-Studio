"use client"

import { useState, useEffect, useRef } from "react"
import { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { 
  Sliders, 
  Palette, 
  Sparkles, 
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Download,
  Check
} from "lucide-react"
import { toast } from "sonner"
import { HDRProcessor } from "@/lib/utils/hdr-processor"

interface EmojiEditorProps {
  emoji: ProcessedEmoji | null
  isOpen: boolean
  onClose: () => void
  onSave: (editedEmoji: ProcessedEmoji) => void
}

interface ImageAdjustments {
  brightness: number
  contrast: number
  saturation: number
  hue: number
  blur: number
  sharpen: number
}

const defaultAdjustments: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  sharpen: 0,
}

export function EmojiEditor({ emoji, isOpen, onClose, onSave }: EmojiEditorProps) {
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [makeHDR, setMakeHDR] = useState(false)
  const [hdrIntensity, setHdrIntensity] = useState(50)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [editedBlob, setEditedBlob] = useState<Blob | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null)
  
  const isGif = emoji?.format === "GIF" || emoji?.originalFile.type === "image/gif"
  const isVideo = emoji?.wasVideo === true

  useEffect(() => {
    if (emoji && isOpen) {
      setPreviewUrl(emoji.preview)
      setAdjustments(defaultAdjustments)
      setRemoveBackground(false)
      setMakeHDR(false)
      // Small delay to ensure canvas elements are mounted
      setTimeout(() => {
        loadOriginalImage()
      }, 100)
    }
  }, [emoji, isOpen])

  const loadOriginalImage = async () => {
    if (!emoji || !canvasRef.current || !previewCanvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const previewCanvas = previewCanvasRef.current
    const previewCtx = previewCanvas.getContext("2d")
    if (!previewCtx) return

    const img = new Image()
    img.onload = () => {
      console.log('Image loaded:', img.width, 'x', img.height)
      
      // Set up main canvas
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      // Set up preview canvas immediately
      previewCanvas.width = 128
      previewCanvas.height = 128
      const scale = Math.min(128 / img.width, 128 / img.height)
      const scaledWidth = img.width * scale
      const scaledHeight = img.height * scale
      const offsetX = (128 - scaledWidth) / 2
      const offsetY = (128 - scaledHeight) / 2
      
      previewCtx.clearRect(0, 0, 128, 128)
      previewCtx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
      
      // Store original image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setOriginalImageData(imageData)
    }
    
    img.onerror = (error) => {
      console.error('Failed to load image:', error)
    }
    
    // Try to use processedBlob first, fall back to originalFile
    const blobToUse = emoji.processedBlob || emoji.originalFile
    img.src = URL.createObjectURL(blobToUse)
  }

  // Modern HDR enhancement based on Greg Benz's natural HDR approach
  const applyHDREnhancement = (data: Uint8ClampedArray, intensity: number) => {
    const factor = intensity / 100
    const width = originalImageData?.width || 128
    const height = originalImageData?.height || 128
    
    // First pass: analyze image statistics
    let minLum = 255, maxLum = 0
    let totalLuminance = 0
    let pixelCount = 0
    const histogram = new Array(256).fill(0)
    const luminanceMap = new Float32Array(width * height)
    
    // Build luminance map and find highlight/shadow regions
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      
      if (a > 0) {
        // Accurate luminance calculation (Rec. 709)
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const pixelIndex = Math.floor(i / 4)
        luminanceMap[pixelIndex] = luminance
        
        totalLuminance += luminance
        pixelCount++
        histogram[Math.floor(luminance)]++
        
        minLum = Math.min(minLum, luminance)
        maxLum = Math.max(maxLum, luminance)
      }
    }
    
    const avgLuminance = totalLuminance / pixelCount
    const dynamicRange = maxLum - minLum
    
    // Find the 1% and 99% percentile for better highlight/shadow detection
    let cumulative = 0
    let lowPercentile = 0, highPercentile = 255
    const onePercent = pixelCount * 0.01
    const ninetyNinePercent = pixelCount * 0.99
    
    for (let i = 0; i < 256; i++) {
      cumulative += histogram[i]
      if (cumulative >= onePercent && lowPercentile === 0) {
        lowPercentile = i
      }
      if (cumulative >= ninetyNinePercent) {
        highPercentile = i
        break
      }
    }
    
    // Second pass: apply natural HDR enhancement
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      const a = data[i + 3]
      
      if (a > 0) {
        const pixelIndex = Math.floor(i / 4)
        const luminance = luminanceMap[pixelIndex]
        
        // Determine if pixel is in shadow, midtone, or highlight region
        const isDeepShadow = luminance < lowPercentile
        const isShadow = luminance < avgLuminance * 0.5
        const isHighlight = luminance > avgLuminance * 1.8
        const isBrightHighlight = luminance > highPercentile
        
        // Natural tone curve - lift shadows, protect highlights
        let adjustment = 1.0
        
        if (isDeepShadow) {
          // Darken deep shadows for more contrast
          const shadowDarken = 1 - (factor * 0.3 * (1 - luminance / lowPercentile))
          adjustment = shadowDarken
        } else if (isShadow) {
          // Moderate shadow darkening with some detail preservation
          const shadowFactor = (avgLuminance * 0.5 - luminance) / (avgLuminance * 0.5)
          // Balance between darkening and detail preservation
          adjustment = 1 - (factor * 0.1 * shadowFactor) + (factor * 0.2 * shadowFactor * (luminance / (avgLuminance * 0.5)))
        } else if (isBrightHighlight) {
          // Extremely boost bright highlights to near white
          const highlightFactor = (luminance - highPercentile) / (255 - highPercentile)
          adjustment = 1 + (factor * 1.0 * highlightFactor)
        } else if (isHighlight) {
          // Very strong highlight enhancement
          const highlightFactor = (luminance - avgLuminance * 1.8) / (maxLum - avgLuminance * 1.8)
          adjustment = 1 + (factor * 0.7 * highlightFactor)
        } else if (luminance > avgLuminance * 1.2) {
          // Strong boost for upper midtones
          const upperMidFactor = (luminance - avgLuminance * 1.2) / (avgLuminance * 0.6)
          adjustment = 1 + (factor * 0.4 * upperMidFactor)
        } else if (luminance < avgLuminance * 0.8) {
          // Darken lower midtones for more contrast
          const lowerMidFactor = (avgLuminance * 0.8 - luminance) / (avgLuminance * 0.8)
          adjustment = 1 - (factor * 0.15 * lowerMidFactor)
        } else {
          // Regular midtones - slight enhancement
          adjustment = 1 + (factor * 0.05)
        }
        
        // Apply adjustment while preserving color relationships
        r = Math.min(255, Math.max(0, r * adjustment))
        g = Math.min(255, Math.max(0, g * adjustment))
        b = Math.min(255, Math.max(0, b * adjustment))
        
        // Natural vibrance enhancement (protect skin tones)
        const maxChannel = Math.max(r, g, b)
        const minChannel = Math.min(r, g, b)
        const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0
        
        // Check for skin tone range (avoid oversaturating skin)
        const hue = Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI
        const isSkinTone = (hue > 15 && hue < 45) && saturation < 0.6
        
        if (!isSkinTone && saturation < 0.8) {
          // Stronger color enhancement
          const vibranceAmount = factor * 0.35 * (1 - saturation)
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
          
          r = Math.min(255, Math.max(0, gray + (r - gray) * (1 + vibranceAmount)))
          g = Math.min(255, Math.max(0, gray + (g - gray) * (1 + vibranceAmount)))
          b = Math.min(255, Math.max(0, gray + (b - gray) * (1 + vibranceAmount)))
        }
        
        // More aggressive local contrast enhancement (clarity)
        if (factor > 0.2) {
          const clarityAmount = factor * 0.15
          const localAvg = 128 // Simplified for performance
          
          r = Math.min(255, Math.max(0, r + (r - localAvg) * clarityAmount))
          g = Math.min(255, Math.max(0, g + (g - localAvg) * clarityAmount))
          b = Math.min(255, Math.max(0, b + (b - localAvg) * clarityAmount))
        }
        
        // Add intense glow to highlights
        if (isHighlight && factor > 0.2) {
          const glowAmount = factor * 0.4 * ((luminance - avgLuminance * 1.5) / (maxLum - avgLuminance * 1.5))
          r = Math.min(255, r * (1 + glowAmount))
          g = Math.min(255, g * (1 + glowAmount))
          b = Math.min(255, b * (1 + glowAmount))
        }
        
        // Strong bloom effect for bright areas
        if (isBrightHighlight && factor > 0.3) {
          const bloomAmount = factor * 0.3
          r = Math.min(255, r + (255 - r) * bloomAmount)
          g = Math.min(255, g + (255 - g) * bloomAmount)
          b = Math.min(255, b + (255 - b) * bloomAmount)
        }
        
        // Aggressively push bright pixels to pure white
        if (luminance > highPercentile && factor > 0.3) {
          const whitePush = factor * 0.8 * ((luminance - highPercentile) / (255 - highPercentile))
          r = Math.min(255, r + (255 - r) * whitePush)
          g = Math.min(255, g + (255 - g) * whitePush)
          b = Math.min(255, b + (255 - b) * whitePush)
        }
        
        // Crush blacks for more contrast
        if (luminance < lowPercentile && factor > 0.3) {
          const blackCrush = factor * 0.5 * (1 - luminance / lowPercentile)
          r = Math.max(0, r * (1 - blackCrush))
          g = Math.max(0, g * (1 - blackCrush))
          b = Math.max(0, b * (1 - blackCrush))
        }
        
        // Smart highlight clipping - allow some areas to go pure white for brilliance
        if (r > 245 || g > 245 || b > 245) {
          const maxValue = Math.max(r, g, b)
          if (maxValue > 255) {
            // Instead of scaling down, clip to 255 for maximum brightness
            r = Math.min(255, r)
            g = Math.min(255, g)
            b = Math.min(255, b)
          }
        }
        
        // Update pixel data
        data[i] = Math.round(r)
        data[i + 1] = Math.round(g)
        data[i + 2] = Math.round(b)
      }
    }
  }

  const applyAdjustments = async () => {
    if (!originalImageData || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Create a copy of the original image data
    const imageData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    )

    const data = imageData.data

    // Apply HDR enhancement first if enabled
    if (makeHDR && hdrIntensity > 0) {
      applyHDREnhancement(data, hdrIntensity)
    }

    // Apply adjustments pixel by pixel
    for (let i = 0; i < data.length; i += 4) {
      // Get RGB values
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      const a = data[i + 3]

      // Apply brightness
      r = Math.min(255, r * (adjustments.brightness / 100))
      g = Math.min(255, g * (adjustments.brightness / 100))
      b = Math.min(255, b * (adjustments.brightness / 100))

      // Apply contrast
      const contrastFactor = (adjustments.contrast - 100) * 2.55
      const factor = (259 * (contrastFactor + 255)) / (255 * (259 - contrastFactor))
      r = Math.min(255, Math.max(0, factor * (r - 128) + 128))
      g = Math.min(255, Math.max(0, factor * (g - 128) + 128))
      b = Math.min(255, Math.max(0, factor * (b - 128) + 128))

      // Apply saturation
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b
      const saturationFactor = adjustments.saturation / 100
      r = Math.min(255, Math.max(0, gray + saturationFactor * (r - gray)))
      g = Math.min(255, Math.max(0, gray + saturationFactor * (g - gray)))
      b = Math.min(255, Math.max(0, gray + saturationFactor * (b - gray)))

      // Apply hue rotation (simplified)
      if (adjustments.hue !== 0) {
        const hueRad = (adjustments.hue * Math.PI) / 180
        const cos = Math.cos(hueRad)
        const sin = Math.sin(hueRad)
        const newR = r * cos - g * sin
        const newG = r * sin + g * cos
        r = Math.min(255, Math.max(0, newR))
        g = Math.min(255, Math.max(0, newG))
      }

      // Update pixel data
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
    }

    // Apply background removal if enabled
    if (removeBackground) {
      // Simple background removal based on color similarity
      // This is a basic implementation - for production, use a proper ML model
      const threshold = 30
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Check if pixel is close to white or very light
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0 // Make transparent
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Apply filters if needed
    const filters = []
    if (adjustments.blur > 0) {
      filters.push(`blur(${adjustments.blur}px)`)
    }
    if (adjustments.sharpen > 0) {
      filters.push(`contrast(${100 + adjustments.sharpen}%)`)
    }
    
    if (filters.length > 0) {
      ctx.filter = filters.join(' ')
      ctx.drawImage(canvas, 0, 0)
      ctx.filter = 'none' // Reset filter
    }

    // Update preview canvas to show at 128x128
    if (previewCanvasRef.current) {
      const previewCtx = previewCanvasRef.current.getContext("2d")
      if (previewCtx) {
        previewCanvasRef.current.width = 128
        previewCanvasRef.current.height = 128
        
        // Calculate scaling to fit within 128x128 while maintaining aspect ratio
        const scale = Math.min(128 / canvas.width, 128 / canvas.height)
        const scaledWidth = canvas.width * scale
        const scaledHeight = canvas.height * scale
        const offsetX = (128 - scaledWidth) / 2
        const offsetY = (128 - scaledHeight) / 2
        
        previewCtx.clearRect(0, 0, 128, 128)
        previewCtx.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight)
      }
    }

    // Convert to blob and update preview
    canvas.toBlob((blob) => {
      if (blob) {
        setEditedBlob(blob)
        // Update preview URL from canvas data
        const dataUrl = canvas.toDataURL("image/png")
        setPreviewUrl(dataUrl)
      }
    }, "image/png")
  }

  useEffect(() => {
    if (originalImageData) {
      applyAdjustments()
    }
  }, [adjustments, removeBackground, makeHDR, hdrIntensity, originalImageData])

  const handleReset = () => {
    setAdjustments(defaultAdjustments)
    setRemoveBackground(false)
    setMakeHDR(false)
    setHdrIntensity(50)
  }

  const handleSave = async () => {
    if (!emoji || !editedBlob) return

    setIsProcessing(true)
    try {
      console.log('Starting save process...')
      let finalBlob = editedBlob
      let isAppleHDR = false

      // If HDR is enabled, create Apple HDR format
      // Note: The preview already shows the HDR enhancement, but we need to create
      // the proper Apple HDR format with P3 color space for saving
      if (makeHDR && hdrIntensity > 0) {
        console.log('HDR enabled, creating Apple HDR format...')
        
        toast("Saving with HDR enhancement...", {
          description: "Creating Apple-compatible HDR image"
        })
        
        try {
          // Since we already applied HDR in the preview, we'll use a lighter touch
          // for the final Apple HDR to avoid over-processing
          const hdrBlob = await HDRProcessor.createAppleHDR(editedBlob, {
            intensity: hdrIntensity * 0.7, // Reduce intensity since preview already has HDR
            toneMapping: 'aces',
            maxContentBoost: 1 + (hdrIntensity / 150)
          })

          if (hdrBlob) {
            finalBlob = hdrBlob
            isAppleHDR = true
            console.log('Successfully created Apple HDR image')
          } else {
            toast("HDR format conversion failed", {
              description: "Using enhanced standard format",
              action: {
                label: "OK",
                onClick: () => {}
              }
            })
          }
        } catch (hdrError) {
          console.error('HDR processing error:', hdrError)
          toast("HDR processing error", {
            description: "Using enhanced standard format"
          })
        }
      }

      // Create a new File from the final blob
      const editedFile = new File([finalBlob], emoji.originalFile.name, {
        type: isAppleHDR ? "image/jpeg" : editedBlob.type,
      })

      // Mark as HDR if it's Apple HDR
      if (isAppleHDR) {
        const fileWithMeta = editedFile as any
        fileWithMeta.isHDR = true
        fileWithMeta.isAppleHDR = true
      }

      // Import and use EmojiProcessor to process the edited file
      const { EmojiProcessor } = await import("@/lib/utils/emoji-processor")
      const processedEmoji = await EmojiProcessor.processFile(editedFile, {
        preserveHDR: isAppleHDR
      })

      // Update the name to match the original
      processedEmoji.name = emoji.name
      
      // Add note about HDR
      if (isAppleHDR) {
        processedEmoji.processingNote = `HDR Enhanced (${hdrIntensity}% intensity)`
      }

      onSave(processedEmoji)
      toast(isAppleHDR ? "Emoji saved with HDR enhancement!" : "Emoji edited successfully!", {
        description: isAppleHDR ? `${hdrIntensity}% HDR intensity applied` : undefined
      })
      onClose()
    } catch (error) {
      console.error("Failed to save edited emoji:", error)
      toast("Failed to save edited emoji", {
        description: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!emoji) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Emoji: {emoji.name}</DialogTitle>
          <DialogDescription>
            Adjust the image properties and apply effects to your emoji.
            {isGif && " Note: GIF editing support is limited in this version."}
            {isVideo && " Note: This emoji was converted from a video."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          {/* Preview Section */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="text-sm font-semibold mb-2">Preview</h3>
              <div className="relative aspect-square bg-checkered rounded overflow-hidden flex items-center justify-center">
                {isGif ? (
                  <img
                    src={previewUrl}
                    alt="Emoji preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <canvas
                    ref={previewCanvasRef}
                    width={128}
                    height={128}
                    className="w-full h-full"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                )}
                {makeHDR && hdrIntensity > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                    HDR: {hdrIntensity}%
                  </div>
                )}
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isProcessing}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>

          {/* Controls Section */}
          <div className="space-y-4">
            <Tabs defaultValue="adjustments" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="adjustments">
                  <Sliders className="h-4 w-4 mr-1" />
                  Adjust
                </TabsTrigger>
                <TabsTrigger value="effects">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Effects
                </TabsTrigger>
                <TabsTrigger value="advanced">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="adjustments" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Brightness</Label>
                    <Slider
                      value={[adjustments.brightness]}
                      onValueChange={([value]) =>
                        setAdjustments({ ...adjustments, brightness: value })
                      }
                      min={0}
                      max={200}
                      step={1}
                      className="mt-2"
                      disabled={isGif || isProcessing}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Contrast</Label>
                    <Slider
                      value={[adjustments.contrast]}
                      onValueChange={([value]) =>
                        setAdjustments({ ...adjustments, contrast: value })
                      }
                      min={0}
                      max={200}
                      step={1}
                      className="mt-2"
                      disabled={isGif || isProcessing}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Saturation</Label>
                    <Slider
                      value={[adjustments.saturation]}
                      onValueChange={([value]) =>
                        setAdjustments({ ...adjustments, saturation: value })
                      }
                      min={0}
                      max={200}
                      step={1}
                      className="mt-2"
                      disabled={isGif || isProcessing}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Hue</Label>
                    <Slider
                      value={[adjustments.hue]}
                      onValueChange={([value]) =>
                        setAdjustments({ ...adjustments, hue: value })
                      }
                      min={-180}
                      max={180}
                      step={1}
                      className="mt-2"
                      disabled={isGif || isProcessing}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="effects" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Blur</Label>
                    <Slider
                      value={[adjustments.blur]}
                      onValueChange={([value]) =>
                        setAdjustments({ ...adjustments, blur: value })
                      }
                      min={0}
                      max={10}
                      step={0.5}
                      className="mt-2"
                      disabled={isGif || isProcessing}
                    />
                  </div>

                  <div>
                    <Label className="text-sm">Sharpen</Label>
                    <Slider
                      value={[adjustments.sharpen]}
                      onValueChange={([value]) =>
                        setAdjustments({ ...adjustments, sharpen: value })
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="mt-2"
                      disabled={isGif || isProcessing}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="remove-bg" className="text-sm">
                        Remove Background
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Remove light backgrounds (experimental)
                      </p>
                    </div>
                    <Switch
                      id="remove-bg"
                      checked={removeBackground}
                      onCheckedChange={setRemoveBackground}
                      disabled={isGif || isProcessing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="make-hdr" className="text-sm">
                        HDR Enhancement
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Enhanced dynamic range & vibrant colors
                      </p>
                    </div>
                    <Switch
                      id="make-hdr"
                      checked={makeHDR}
                      onCheckedChange={setMakeHDR}
                      disabled={isGif || isProcessing}
                    />
                  </div>

                  {makeHDR && (
                    <div>
                      <Label className="text-sm">HDR Intensity</Label>
                      <Slider
                        value={[hdrIntensity]}
                        onValueChange={([value]) => setHdrIntensity(value)}
                        min={0}
                        max={100}
                        step={5}
                        className="mt-2"
                        disabled={isGif || isProcessing}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {hdrIntensity}% - {hdrIntensity < 30 ? 'Subtle' : hdrIntensity < 70 ? 'Vibrant' : 'Dramatic'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Live preview • P3 color space on save
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {(isGif || isVideo) && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {isGif
                    ? "GIF editing is limited to preserve animation. Only basic adjustments are available."
                    : "This emoji was converted from a video. Editing options are limited."}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing || !editedBlob}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Add CSS for checkered background
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .bg-checkered {
      background-image: 
        linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
        linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
        linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
      background-size: 16px 16px;
      background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
    }
  `
  if (!document.head.querySelector('style[data-emoji-editor]')) {
    style.setAttribute('data-emoji-editor', 'true')
    document.head.appendChild(style)
  }
}