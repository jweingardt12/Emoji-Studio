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

  // Advanced HDR-like enhancement function
  const applyHDREnhancement = (data: Uint8ClampedArray, intensity: number) => {
    const factor = intensity / 100
    
    // First pass: analyze the image
    let totalLuminance = 0
    let pixelCount = 0
    const histogram = new Array(256).fill(0)
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      
      if (a > 0) {
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        totalLuminance += luminance
        pixelCount++
        histogram[Math.floor(luminance)]++
      }
    }
    
    const avgLuminance = totalLuminance / pixelCount
    
    // Calculate dynamic range expansion parameters
    const shadowBoost = factor * 0.3
    const highlightBoost = factor * 0.2
    const midtoneEnhance = factor * 0.5
    
    // Second pass: apply HDR-like enhancement
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]
      let g = data[i + 1]
      let b = data[i + 2]
      const a = data[i + 3]
      
      if (a > 0) {
        // Calculate luminance
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b
        const normalizedLum = luminance / 255
        
        // Apply tone mapping curve (S-curve for contrast)
        const toneMapped = Math.pow(normalizedLum, 1 - factor * 0.3) * 
                          (1 + factor * Math.sin(normalizedLum * Math.PI))
        
        // Calculate adjustment factor based on luminance zone
        let adjustmentFactor = 1
        
        if (normalizedLum < 0.3) {
          // Shadows - lift them up
          adjustmentFactor = 1 + shadowBoost * (1 - normalizedLum / 0.3)
        } else if (normalizedLum > 0.7) {
          // Highlights - enhance detail
          adjustmentFactor = 1 + highlightBoost * ((normalizedLum - 0.7) / 0.3)
        } else {
          // Midtones - enhance vibrance
          adjustmentFactor = 1 + midtoneEnhance * Math.sin((normalizedLum - 0.3) * Math.PI / 0.4)
        }
        
        // Apply vibrance-like enhancement (preserves skin tones)
        const maxColor = Math.max(r, g, b)
        const avgColor = (r + g + b) / 3
        const colorfulness = (maxColor - avgColor) / 255
        const vibranceFactor = 1 + factor * 0.5 * (1 - colorfulness)
        
        // Apply adjustments
        r = Math.min(255, r * adjustmentFactor * vibranceFactor)
        g = Math.min(255, g * adjustmentFactor * vibranceFactor)
        b = Math.min(255, b * adjustmentFactor * vibranceFactor)
        
        // Local contrast enhancement
        const localContrast = 1 + factor * 0.2
        const mid = 128
        r = Math.min(255, Math.max(0, mid + (r - mid) * localContrast))
        g = Math.min(255, Math.max(0, mid + (g - mid) * localContrast))
        b = Math.min(255, Math.max(0, mid + (b - mid) * localContrast))
        
        // Update pixel data
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
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
        const dataUrl = canvas.toDataURL(makeHDR ? "image/png" : "image/png", makeHDR ? 1.0 : 0.95)
        setPreviewUrl(dataUrl)
      }
    }, makeHDR ? "image/png" : "image/png", makeHDR ? 1.0 : 0.95)
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
      // Create a new File from the edited blob
      const editedFile = new File([editedBlob], emoji.originalFile.name, {
        type: makeHDR ? "image/png" : editedBlob.type,
      })

      // Mark as HDR if makeHDR is enabled
      if (makeHDR) {
        (editedFile as any).isHDR = true
      }

      // Import and use EmojiProcessor to process the edited file
      const { EmojiProcessor } = await import("@/lib/utils/emoji-processor")
      const processedEmoji = await EmojiProcessor.processFile(editedFile, {
        preserveHDR: makeHDR
      })

      // Update the name to match the original
      processedEmoji.name = emoji.name

      onSave(processedEmoji)
      toast.success("Emoji edited successfully!")
      onClose()
    } catch (error) {
      console.error("Failed to save edited emoji:", error)
      toast.error("Failed to save edited emoji")
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
                        Make your image pop with HDR-like effects
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
                        {hdrIntensity}% - {hdrIntensity < 30 ? 'Subtle' : hdrIntensity < 70 ? 'Moderate' : 'Intense'}
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