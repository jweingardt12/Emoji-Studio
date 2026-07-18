"use client"

import { celebrateUpload } from "@/lib/utils/celebrate"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Upload, 
  Camera, 
  Video, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Download,
  Check,
  Loader2,
  Edit3,
  Send,
  Sun,
  Contrast,
  Palette,
  Scissors,
  RotateCcw,
  Gauge,
  Maximize2,
  Film
} from "lucide-react"
import { EmojiProcessor, ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { formatBytes } from "@/lib/utils"
import { toast } from "sonner"
import { useTrack } from "@/lib/hooks/use-track"
import { uploadEmojiToSlack, hasSlackConnection } from "@/lib/utils/slack-upload"

type CreationStep = 'select' | 'processing' | 'preview' | 'edit' | 'complete'

interface MobileEmojiCreatorProps {
  initialFile?: File
  onCancel?: () => void
}

export function MobileEmojiCreator({
  initialFile,
  onCancel
}: MobileEmojiCreatorProps) {
  const track = useTrack();
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<CreationStep>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile || null)
  const [processedEmoji, setProcessedEmoji] = useState<ProcessedEmoji | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [emojiName, setEmojiName] = useState('')
  const [isUploadingToSlack, setIsUploadingToSlack] = useState(false)
  const [hasSlack, setHasSlack] = useState(false)
  const [editAdjustments, setEditAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  })
  const [shouldRemoveBackground, setShouldRemoveBackground] = useState(false)
  const [isApplyingEdits, setIsApplyingEdits] = useState(false)
  
  // Video/GIF editing states
  const [videoAdjustments, setVideoAdjustments] = useState({
    speed: 1.0, // 1.0 = normal, 0.5 = slow, 2.0 = fast
    scaleMode: 'cover' as 'cover' | 'contain' | 'stretch' // Match desktop options
  })

  // Auto-start processing if we have an initial file
  useEffect(() => {
    if (initialFile && currentStep === 'select') {
      setCurrentStep('processing')
      processFile(initialFile)
    }
  }, [initialFile])

  // Check for Slack connection
  useEffect(() => {
    setHasSlack(hasSlackConnection())
  }, [])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setCurrentStep('processing')
    processFile(file)
  }

  const processFile = async (file: File): Promise<ProcessedEmoji | null> => {
    setProcessingProgress(0)
    setProcessingStatus('Analyzing file...')
    
    try {
      // Check if it's a video file
      const isVideo = file.type.startsWith('video/')
      
      // Simulate progress updates with appropriate messages
      const progressSteps = isVideo ? [
        { progress: 20, status: 'Loading video...' },
        { progress: 40, status: 'Extracting frames...' },
        { progress: 60, status: 'Creating animated GIF...' },
        { progress: 80, status: 'Optimizing for Slack...' },
        { progress: 100, status: 'Complete!' }
      ] : [
        { progress: 20, status: 'Reading file properties...' },
        { progress: 40, status: 'Optimizing dimensions...' },
        { progress: 60, status: 'Compressing for Slack...' },
        { progress: 80, status: 'Finalizing emoji...' },
        { progress: 100, status: 'Complete!' }
      ]

      for (const step of progressSteps) {
        setProcessingProgress(step.progress)
        setProcessingStatus(step.status)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Process the actual file
      const processed = await EmojiProcessor.processFile(file)
      
      // Generate default name from filename
      const defaultName = file.name
        .replace(/\.[^/.]+$/, '') // Remove extension
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with underscore
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .substring(0, 22) // Slack emoji name limit

      setEmojiName(defaultName)
      setProcessedEmoji(processed)
      setCurrentStep('preview')
      
      // If the emoji has a stored speed multiplier, update the video adjustments
      if ((processed as any).speedMultiplier) {
        setVideoAdjustments(prev => ({
          ...prev,
          speed: (processed as any).speedMultiplier
        }))
      }
      
      track("Mobile Emoji Creator: File Processed", {
        fileName: file.name,
        fileType: file.type,
        originalSize: file.size,
        processedSize: processed.processedSize
      })
      
      return processed
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to process file: ${errorMessage}`)
      setProcessingStatus('Processing failed')
      setCurrentStep('select')
      return null
    } finally {
      // Processing complete
    }
  }

  const handleDownload = async () => {
    if (!processedEmoji) return
    
    try {
      await EmojiProcessor.downloadEmoji({
        ...processedEmoji,
        name: emojiName || processedEmoji.name
      })
      
      toast.success('Emoji downloaded!')
      setCurrentStep('complete')
      
      track("Mobile Emoji Creator: Downloaded", {
        emojiName: emojiName,
        format: processedEmoji.format
      })
      
    } catch (error) {
      toast.error('Download failed')
    }
  }

  const handleSlackUpload = async () => {
    if (!processedEmoji) return
    
    setIsUploadingToSlack(true)
    
    track("Mobile Emoji Creator: Slack Upload Started", {
      emojiName: emojiName || processedEmoji.name,
      format: processedEmoji.format,
      size: processedEmoji.processedSize
    })
    
    try {
      const result = await uploadEmojiToSlack(processedEmoji, emojiName || processedEmoji.name)
      
      if (result.success) {
        toast.success(`Emoji ":${result.emojiName}:" uploaded to Slack!`)
        celebrateUpload()
        
        track("Mobile Emoji Creator: Slack Upload Success", {
          emojiName: result.emojiName,
          format: processedEmoji.format
        })
        
        // Show complete screen after successful upload
        setCurrentStep('complete')
      } else {
        toast.error(result.error || 'Failed to upload to Slack')
        
        track("Mobile Emoji Creator: Slack Upload Failed", {
          error: result.error,
          emojiName: emojiName || processedEmoji.name
        })
      }
    } catch (error) {
      toast.error('Failed to upload to Slack')
    } finally {
      setIsUploadingToSlack(false)
    }
  }

  const handleStartOver = () => {
    setSelectedFile(null)
    setProcessedEmoji(null)
    setEmojiName('')
    setCurrentStep('select')
    setEditAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100
    })
    setShouldRemoveBackground(false)
    setVideoAdjustments({
      speed: 1.0,
      scaleMode: 'cover'
    })
  }

  const applyVideoEdits = async () => {
    if (!processedEmoji || !selectedFile) return
    
    setIsApplyingEdits(true)
    
    try {
      toast.loading('Applying video edits...', { id: 'video-edit' })
      
      // Pass the video adjustments to the processor
      const options = {
        speed: videoAdjustments.speed,
        scaleMode: videoAdjustments.scaleMode
      }
      
      // Store options in the file metadata for processing
      const fileWithOptions = new File([selectedFile], selectedFile.name, {
        type: selectedFile.type
      }) as any
      fileWithOptions.processingOptions = options
      
      // Re-process with new options
      setCurrentStep('processing')
      const result = await processFile(fileWithOptions)
      
      // Store the speed multiplier in the processed emoji for reference
      if (result) {
        (result as any).speedMultiplier = videoAdjustments.speed
      }
      
      toast.dismiss('video-edit')
      toast.success(`Video edits applied! Speed: ${videoAdjustments.speed}x`)
      
    } catch (error) {
      toast.error('Failed to apply video edits')
    } finally {
      setIsApplyingEdits(false)
    }
  }
  
  const applyImageEdits = async () => {
    if (!processedEmoji) return
    
    setIsApplyingEdits(true)
    
    try {
      let processedBlob: Blob
      
      // If background removal is enabled, use the library
      if (shouldRemoveBackground) {
        toast.info('Removing background... This may take a moment')
        
        // Create a blob from the current preview
        const response = await fetch(processedEmoji.preview)
        const originalBlob = await response.blob()
        
        try {
          // Use our local background removal utility
          toast.loading('Removing background...', { id: 'bg-removal' })
          
          const { removeBackgroundEnhanced } = await import('@/lib/utils/background-removal')
          processedBlob = await removeBackgroundEnhanced(originalBlob)
          
          // Dismiss the loading toast
          toast.dismiss('bg-removal')
          toast.success('Background removed!')
        } catch (bgError) {
          toast.error('Background removal failed, applying other edits only')
          // Continue without background removal
          processedBlob = originalBlob
        }
      } else {
        // Just get the original blob
        const response = await fetch(processedEmoji.preview)
        processedBlob = await response.blob()
      }
      
      // Now apply the brightness/contrast/saturation adjustments
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = URL.createObjectURL(processedBlob)
      })
      
      canvas.width = img.width
      canvas.height = img.height
      
      // Apply CSS filters for adjustments
      ctx.filter = `
        brightness(${editAdjustments.brightness}%) 
        contrast(${editAdjustments.contrast}%) 
        saturate(${editAdjustments.saturation}%)
      `
      
      ctx.drawImage(img, 0, 0)
      
      // Convert canvas to blob
      const finalBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png', 0.95)
      })
      
      // Create a new file with the edited image
      const editedFile = new File(
        [finalBlob], 
        processedEmoji.name || 'edited-emoji.png', 
        { type: 'image/png' }
      )
      
      // Re-process with the edited file to ensure Slack compliance
      setCurrentStep('processing')
      await processFile(editedFile)
      
      toast.success(shouldRemoveBackground ? 'Edits applied with background removed!' : 'Edits applied!')
      
    } catch (error) {
      toast.error('Failed to apply edits')
    } finally {
      setIsApplyingEdits(false)
    }
  }

  const renderFileSelector = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">Create Emoji</h2>
        <p className="text-muted-foreground text-sm">
          Choose how you'd like to add your image
        </p>
      </div>

      <div className="space-y-3">
        {/* Upload from Device */}
        <label className="block">
          <input
            type="file"
            accept="image/*,video/*,.gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Upload from Device</h3>
                <p className="text-sm text-muted-foreground">
                  Choose from photos, videos, or GIFs
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </label>

        {/* Take Photo */}
        <label className="block">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Camera className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Take Photo</h3>
                <p className="text-sm text-muted-foreground">
                  Use your camera to capture an image
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </label>

        {/* Record Video */}
        <label className="block">
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Video className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Record Video</h3>
                <p className="text-sm text-muted-foreground">
                  Create an animated emoji from video
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </label>
      </div>

      {onCancel && (
        <Button variant="ghost" onClick={onCancel} className="w-full mt-6">
          Cancel
        </Button>
      )}
    </div>
  )

  const renderProcessing = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Processing Your Emoji</h2>
        <p className="text-muted-foreground text-sm mb-4">
          {processingStatus}
        </p>
        <Progress value={processingProgress} className="w-full" />
      </div>

      {selectedFile && (
        <div className="text-sm text-muted-foreground">
          Processing: {selectedFile.name}
        </div>
      )}
    </div>
  )

  const renderPreview = () => {
    if (!processedEmoji) return null

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Your Emoji is Ready!</h2>
          <p className="text-muted-foreground text-sm">
            Preview and customize before downloading
          </p>
        </div>

        {/* Emoji Preview */}
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-2xl border-2 border-border bg-muted/50 flex items-center justify-center overflow-hidden">
            <img
              src={processedEmoji.preview}
              alt="Emoji preview"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Emoji Name Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Emoji Name</label>
          <Input
            value={emojiName}
            onChange={(e) => setEmojiName(e.target.value)}
            placeholder="Enter emoji name"
            maxLength={22}
            className="text-center"
          />
          <p className="text-xs text-muted-foreground text-center">
            This will be the name used in Slack (:{emojiName}:)
          </p>
        </div>

        {/* File Info */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Format:</span>
              <span className="font-medium">{processedEmoji.format}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{formatBytes(processedEmoji.processedSize)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Dimensions:</span>
              <span className="font-medium">
                {processedEmoji.dimensions.width}×{processedEmoji.dimensions.height}px
              </span>
            </div>
            {processedEmoji.processedSize <= 128 * 1024 && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                <span>Perfect for Slack!</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {hasSlack ? (
            <Button 
              onClick={handleSlackUpload} 
              className="w-full" 
              size="lg"
              disabled={isUploadingToSlack || !emojiName.trim()}
            >
              {isUploadingToSlack ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Uploading to Slack...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Send to Slack
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => router.push('/settings')} 
              className="w-full" 
              size="lg"
            >
              <Send className="mr-2 h-5 w-5" />
              Connect Slack to Upload
            </Button>
          )}
          
          <Button 
            onClick={handleDownload} 
            variant="outline"
            className="w-full" 
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Download Emoji
          </Button>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleStartOver} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Start Over
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('edit')}
              className="flex-1"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderEdit = () => {
    if (!processedEmoji) return null

    // Check if it's an image (not a GIF or video)
    // Check both the original file type and the processed format
    const fileType = selectedFile?.type || processedEmoji.originalFile?.type || ''
    const isGif = processedEmoji.format === 'GIF' || fileType.includes('gif')
    const isVideo = fileType.startsWith('video/') || processedEmoji.wasVideo
    const isImage = !isGif && !isVideo
    
    // For videos and GIFs, show video editing options
    if (!isImage) {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Edit {isGif ? 'GIF' : 'Video'}</h2>
            <p className="text-muted-foreground text-sm">
              Adjust speed, scale, and trim
            </p>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            <div className="w-40 h-40 rounded-2xl border-2 border-border bg-muted/50 flex items-center justify-center overflow-hidden relative">
              {videoAdjustments.speed !== 1.0 && (
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full z-10">
                  {videoAdjustments.speed}x
                </div>
              )}
              {videoAdjustments.scaleMode !== 'cover' && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full z-10 capitalize">
                  {videoAdjustments.scaleMode === 'contain' ? 'Fit' : 'Stretch'}
                </div>
              )}
              <img
                src={processedEmoji.preview}
                alt="Emoji preview"
                className="w-full h-full"
                style={{
                  objectFit: videoAdjustments.scaleMode === 'cover' ? 'cover' : 
                            videoAdjustments.scaleMode === 'contain' ? 'contain' : 
                            'fill'
                }}
              />
            </div>
          </div>

          {/* Video/GIF Controls */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Speed Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Speed
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {videoAdjustments.speed === 1 ? 'Normal' : 
                     videoAdjustments.speed < 1 ? `${videoAdjustments.speed}x Slower` : 
                     `${videoAdjustments.speed}x Faster`}
                  </span>
                </div>
                <Slider
                  value={[videoAdjustments.speed * 100]}
                  onValueChange={([value]) => setVideoAdjustments(prev => ({ 
                    ...prev, 
                    speed: value / 100 
                  }))}
                  min={25}
                  max={200}
                  step={25}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.25x</span>
                  <span>1x</span>
                  <span>2x</span>
                </div>
              </div>

              {/* Scale Mode Control */}
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Maximize2 className="h-4 w-4" />
                  Scale Mode
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cover', 'contain', 'stretch'] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={videoAdjustments.scaleMode === mode ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setVideoAdjustments(prev => ({ 
                        ...prev, 
                        scaleMode: mode 
                      }))}
                      className="capitalize"
                    >
                      {mode === 'cover' ? 'Fill' : mode === 'contain' ? 'Fit' : 'Stretch'}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {videoAdjustments.scaleMode === 'cover' ? 'Fills the frame, may crop edges' :
                   videoAdjustments.scaleMode === 'contain' ? 'Fits entire image, may add padding' :
                   'Stretches to fill exactly'}
                </p>
              </div>

              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVideoAdjustments({
                    speed: 1.0,
                    scaleMode: 'cover'
                  })
                }}
                className="w-full"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset All
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={applyVideoEdits}
              className="w-full"
              size="lg"
              disabled={isApplyingEdits || (
                videoAdjustments.speed === 1.0 && 
                videoAdjustments.scaleMode === 'cover'
              )}
            >
              {isApplyingEdits ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Applying Edits...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Apply Changes
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => setCurrentStep('preview')} 
              className="w-full" 
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Cancel
            </Button>
          </div>
        </div>
      )
    }

    // Image editing interface
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Edit Image</h2>
          <p className="text-muted-foreground text-sm">
            Adjust your emoji appearance
          </p>
        </div>

        {/* Live Preview with filters applied */}
        <div className="flex justify-center">
          <div className="w-40 h-40 rounded-2xl border-2 border-border bg-muted/50 flex items-center justify-center overflow-hidden">
            <img
              src={processedEmoji.preview}
              alt="Emoji preview"
              className="w-full h-full object-contain"
              style={{
                filter: `
                  brightness(${editAdjustments.brightness}%) 
                  contrast(${editAdjustments.contrast}%) 
                  saturate(${editAdjustments.saturation}%)
                `
              }}
            />
          </div>
        </div>

        {/* Adjustment Controls */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Brightness
                </Label>
                <span className="text-xs text-muted-foreground">{editAdjustments.brightness}%</span>
              </div>
              <Slider
                value={[editAdjustments.brightness]}
                onValueChange={([value]) => setEditAdjustments(prev => ({ ...prev, brightness: value }))}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Contrast className="h-4 w-4" />
                  Contrast
                </Label>
                <span className="text-xs text-muted-foreground">{editAdjustments.contrast}%</span>
              </div>
              <Slider
                value={[editAdjustments.contrast]}
                onValueChange={([value]) => setEditAdjustments(prev => ({ ...prev, contrast: value }))}
                min={50}
                max={150}
                step={5}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Saturation
                </Label>
                <span className="text-xs text-muted-foreground">{editAdjustments.saturation}%</span>
              </div>
              <Slider
                value={[editAdjustments.saturation]}
                onValueChange={([value]) => setEditAdjustments(prev => ({ ...prev, saturation: value }))}
                min={0}
                max={200}
                step={5}
                className="w-full"
              />
            </div>

            {/* Background Removal */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Label className="text-sm flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Remove Background
              </Label>
              <Switch
                checked={shouldRemoveBackground}
                onCheckedChange={setShouldRemoveBackground}
              />
            </div>
            {shouldRemoveBackground && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Uses AI to remove backgrounds automatically
                </p>
                <p className="text-xs text-muted-foreground">
                  Processing may take a few seconds
                </p>
              </div>
            )}

            {/* Reset Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditAdjustments({
                  brightness: 100,
                  contrast: 100,
                  saturation: 100
                })
                setShouldRemoveBackground(false)
              }}
              className="w-full"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset All
            </Button>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={applyImageEdits}
            className="w-full" 
            size="lg"
            disabled={isApplyingEdits}
          >
            {isApplyingEdits ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Applying Edits...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Apply Changes
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => setCurrentStep('preview')} 
            className="w-full" 
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const renderComplete = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
        <Check className="h-8 w-8 text-green-500" />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-2">Success!</h2>
        <p className="text-muted-foreground text-sm">
          {hasSlack ? 
            `Your emoji ":${emojiName || processedEmoji?.name}:" is now live in Slack!` : 
            'Your emoji has been downloaded successfully'
          }
        </p>
      </div>

      {processedEmoji && (
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-xl border-2 border-border bg-muted/50 flex items-center justify-center overflow-hidden">
            <img
              src={processedEmoji.preview}
              alt="Emoji preview"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button onClick={handleStartOver} className="w-full" size="lg">
          <Sparkles className="mr-2 h-5 w-5" />
          Create Another
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => router.push('/my-emojis')}
          className="w-full"
        >
          View My Emojis
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="min-h-[60vh] flex flex-col justify-center">
        {currentStep === 'select' && renderFileSelector()}
        {currentStep === 'processing' && renderProcessing()}
        {currentStep === 'preview' && renderPreview()}
        {currentStep === 'edit' && renderEdit()}
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  )
}