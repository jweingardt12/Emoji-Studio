"use client"

import { useState, useEffect } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Sparkles, Download, X, FileVideo, FileImage, File as FileIcon } from "lucide-react"
import { EmojiProcessor, ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { EmojiProcessorPreview } from "@/components/emoji-processor-preview"
import { EmojiProcessingModal } from "@/components/emoji-processing-modal"
import { EmojiCelebration } from "@/components/emoji-celebration"
import { EmojiEditor } from "@/components/emoji-editor"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { openpanel } from "@/lib/safe-openpanel"

function EmojiCreatorPage() {
  const { hasRealData, loading } = useEmojiData()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [processedEmojis, setProcessedEmojis] = useState<ProcessedEmoji[]>([])
  const [processingFiles, setProcessingFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [processingError, setProcessingError] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [editingEmoji, setEditingEmoji] = useState<ProcessedEmoji | null>(null)
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number>(-1)
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
    
    console.log('[Create Page] Component mounted, URL:', window.location.href)
    console.log('[Create Page] Search params:', new URLSearchParams(window.location.search).toString())
    
    // Check if we have pending emoji data from Slackmojis
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from') === 'extension') {
      const pendingData = window.sessionStorage.getItem('pendingEmojiFromSlackmojis');
      if (pendingData) {
        try {
          const emojiData = JSON.parse(pendingData);
          console.log('[Create Page] Found pending emoji from Slackmojis:', emojiData);
          
          // Clear the session storage
          window.sessionStorage.removeItem('pendingEmojiFromSlackmojis');
          
          // Process the emoji data
          setTimeout(() => {
            handleExtensionMessage({
              data: {
                type: 'EMOJI_STUDIO_CREATE_EMOJI',
                imageUrl: emojiData.imageUrl,
                originalUrl: emojiData.originalUrl,
                emojiName: emojiData.name
              }
            } as MessageEvent);
          }, 500);
        } catch (error) {
          console.error('[Create Page] Failed to parse pending emoji data:', error);
        }
      }
    }
    
    // Listen for Chrome extension messages
    const handleExtensionMessage = async (event: MessageEvent) => {
      if (event.data.type === 'EMOJI_STUDIO_CREATE_EMOJI') {
        console.log('[Create Page] Received extension message:', event.data)
        
        // Handle both new format (imageUrl directly) and old format (data object)
        const imageUrl = event.data.imageUrl || event.data.data?.imageUrl
        const originalUrl = event.data.originalUrl || event.data.data?.originalUrl
        const emojiName = event.data.emojiName || event.data.data?.name
        const isHDR = event.data.isHDR || event.data.data?.isHDR
        
        if (!imageUrl) {
          console.error('[Create Page] No image URL found in extension message')
          return
        }
        
        console.log('[Create Page] Processing image URL:', imageUrl)
        console.log('[Create Page] Emoji name:', emojiName)
        
        // Track the event
        openpanel.track("Emoji Creator: Extension Image Received", { 
          imageUrl: imageUrl,
          source: 'chrome-extension'
        })
        
        try {
          // Show loading toast
          toast({
            title: "Loading image from extension...",
            description: "Please wait while we process the image.",
          })
          
          let file: File;
          
          if (imageUrl.startsWith('data:')) {
            // Handle data URL
            console.log('[Create Page] Processing data URL, length:', imageUrl.length)
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            // Use emoji name if provided, otherwise extract from URL
            let extension = 'png'
            if (blob.type.includes('gif')) extension = 'gif'
            else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) extension = 'jpg'
            else if (blob.type.includes('webp')) extension = 'webp'
            
            const fileName = emojiName ? 
              `${emojiName}.${extension}` : 
              (originalUrl ? originalUrl.split('/').pop() || 'extension-image' : 'extension-image')
            file = new File([blob], fileName, { type: blob.type })
          } else if (isHDR) {
            // HDR image - special handling to preserve quality
            console.log('[Create Page] Processing HDR image, preserving original:', imageUrl)
            const response = await fetch(imageUrl)
            const blob = await response.blob()
            
            // Preserve original file extension and type for HDR
            const urlParts = imageUrl.split('/')
            const urlFileName = urlParts[urlParts.length - 1] || 'hdr-emoji'
            const fileName = emojiName ? 
              `${emojiName}.${urlFileName.split('.').pop() || 'heic'}` : 
              urlFileName
            
            // Create file with HDR metadata preserved
            file = new File([blob], fileName, { 
              type: blob.type || 'image/heic' 
            })
            
            // Mark as HDR for any special processing downstream
            ;(file as any).isHDR = true
            ;(file as any).originalUrl = imageUrl
            
            console.log('[Create Page] Created HDR file:', file.name, file.type, file.size)
          } else {
            // Try to fetch regular URL
            console.log('[Create Page] Attempting to fetch URL:', imageUrl)
            const response = await fetch(imageUrl)
            if (!response.ok) {
              console.error('[Create Page] Fetch failed with status:', response.status)
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
            }
            
            const blob = await response.blob()
            // Use emoji name if provided, otherwise extract from URL
            const defaultName = imageUrl.split('/').pop() || 'extension-image'
            
            // Determine the correct MIME type
            let mimeType = blob.type
            
            // If no MIME type or generic type, try to infer from filename or content
            if (!mimeType || mimeType === 'application/octet-stream') {
              if (defaultName.toLowerCase().endsWith('.gif')) {
                mimeType = 'image/gif'
              } else if (defaultName.toLowerCase().endsWith('.png')) {
                mimeType = 'image/png'
              } else if (defaultName.toLowerCase().endsWith('.jpg') || defaultName.toLowerCase().endsWith('.jpeg')) {
                mimeType = 'image/jpeg'
              } else if (defaultName.toLowerCase().endsWith('.webp')) {
                mimeType = 'image/webp'
              } else {
                // Try to detect GIF by checking magic bytes
                const arrayBuffer = await blob.slice(0, 6).arrayBuffer()
                const bytes = new Uint8Array(arrayBuffer)
                if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) { // GIF
                  mimeType = 'image/gif'
                  console.log('Detected GIF format from magic bytes')
                } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) { // PNG
                  mimeType = 'image/png'
                } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) { // JPEG
                  mimeType = 'image/jpeg'
                }
              }
            }
            
            // Determine extension from MIME type or filename
            let extension = 'png'
            if (mimeType.includes('gif') || defaultName.toLowerCase().endsWith('.gif')) extension = 'gif'
            else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg'
            else if (mimeType.includes('webp')) extension = 'webp'
            
            const fileName = emojiName ? 
              `${emojiName}.${extension}` : 
              defaultName
            
            console.log(`File: ${fileName}, detected MIME type: ${mimeType}`)
            file = new File([blob], fileName, { type: mimeType })
          }
          
          // Add to selected files and process
          setSelectedFiles([file])
          
          // Auto-process after a short delay
          setTimeout(() => {
            processFiles([file])
          }, 500)
          
        } catch (error) {
          console.error('Failed to load image from extension:', error)
          toast({
            title: "Failed to load image",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive",
          })
          
          openpanel.track("Emoji Creator: Extension Image Load Failed", { 
            imageUrl: imageUrl,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }
    
    window.addEventListener('message', handleExtensionMessage)
    return () => window.removeEventListener('message', handleExtensionMessage)
  }, [])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    )
    
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      openpanel.track("Emoji Creator: Files Dropped", { 
        fileCount: files.length,
        fileTypes: files.map(f => f.type)
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      openpanel.track("Emoji Creator: Files Selected", { 
        fileCount: files.length,
        fileTypes: files.map(f => f.type)
      })
    }
  }

  const processFiles = async (filesToProcess?: File[]) => {
    const files = filesToProcess || selectedFiles
    if (files.length === 0) return

    openpanel.track("Emoji Creator: Processing Started", { 
      fileCount: files.length,
      fileTypes: files.map(f => f.type),
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    })

    setProcessingFiles(files)
    setIsProcessing(true)
    setCurrentFileIndex(0)
    setCurrentStep('loading')
    setProcessingError('')
    setProcessedEmojis([])
    const newProcessedEmojis: ProcessedEmoji[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        setCurrentFileIndex(i)
        setCurrentStep('loading')
        await new Promise(resolve => setTimeout(resolve, 300))
        
        setCurrentStep('analyzing')
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setCurrentStep('processing')
        // Check if we should preserve HDR (based on filename or file properties)
        const preserveHDR = file.name.toLowerCase().includes('hdr') || 
                           (file as any).isHDR ||
                           file.name.toLowerCase().includes('emoji')
        
        const processed = await EmojiProcessor.processFile(file, { preserveHDR })
        
        setCurrentStep('finalizing')
        await new Promise(resolve => setTimeout(resolve, 300))
        
        newProcessedEmojis.push(processed)
        setCurrentStep('completed')
        
        openpanel.track("Emoji Creator: File Processed Successfully", { 
          fileName: file.name,
          fileType: file.type,
          originalSize: file.size,
          processedSize: processed.processedSize,
          format: processed.format,
          isVideo: file.type.startsWith('video/')
        })
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error)
        setProcessingError(error instanceof Error ? error.message : 'Unknown error')
        setCurrentStep('error')
        
        openpanel.track("Emoji Creator: Processing Error", { 
          fileName: file.name,
          fileType: file.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        // Wait a bit to show the error
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // Update state but keep modal open to show results
    setProcessedEmojis(newProcessedEmojis)
    
    // Mark as complete but keep modal open
    setCurrentStep('completed')
    
    // Trigger celebration if emojis were processed successfully
    if (newProcessedEmojis.length > 0) {
      setShowCelebration(true)
      openpanel.track("Emoji Creator: Batch Processing Completed", { 
        totalFiles: files.length,
        successfulFiles: newProcessedEmojis.length,
        failedFiles: files.length - newProcessedEmojis.length,
        totalProcessedSize: newProcessedEmojis.reduce((sum, e) => sum + e.processedSize, 0)
      })
    }
  }

  const handleRemoveProcessed = (index: number) => {
    setProcessedEmojis(prev => prev.filter((_, i) => i !== index))
  }

  const handleDownloadEmoji = async (emoji: ProcessedEmoji) => {
    await EmojiProcessor.downloadEmoji(emoji)
    openpanel.track("Emoji Creator: Single Emoji Downloaded", { 
      emojiName: emoji.name,
      format: emoji.format,
      size: emoji.processedSize
    })
  }

  const handleDownloadAll = async () => {
    await EmojiProcessor.downloadAllEmojis(processedEmojis)
    openpanel.track("Emoji Creator: All Emojis Downloaded", { 
      emojiCount: processedEmojis.length,
      totalSize: processedEmojis.reduce((sum, e) => sum + e.processedSize, 0),
      formats: [...new Set(processedEmojis.map(e => e.format))]
    })
  }

  const handleUpdateEmojiName = (index: number, newName: string) => {
    const emoji = processedEmojis[index]
    if (emoji && emoji.name !== newName) {
      setProcessedEmojis(prev => prev.map((emoji, i) => 
        i === index ? { ...emoji, name: newName } : emoji
      ))
      openpanel.track("Emoji Creator: Emoji Name Updated", { 
        oldName: emoji.name,
        newName: newName,
        format: emoji.format
      })
    }
  }

  const handleEditEmoji = (emoji: ProcessedEmoji, index: number) => {
    setEditingEmoji(emoji)
    setEditingEmojiIndex(index)
    openpanel.track("Emoji Creator: Edit Started", { 
      emojiName: emoji.name,
      format: emoji.format,
      isGif: emoji.format === "GIF",
      wasVideo: emoji.wasVideo || false
    })
  }

  const handleSaveEditedEmoji = (editedEmoji: ProcessedEmoji) => {
    if (editingEmojiIndex >= 0) {
      setProcessedEmojis(prev => prev.map((emoji, i) => 
        i === editingEmojiIndex ? editedEmoji : emoji
      ))
      openpanel.track("Emoji Creator: Edit Saved", { 
        emojiName: editedEmoji.name,
        format: editedEmoji.format,
        originalSize: editedEmoji.originalSize,
        processedSize: editedEmoji.processedSize
      })
    }
    setEditingEmoji(null)
    setEditingEmojiIndex(-1)
  }

  const handleCloseEditor = () => {
    setEditingEmoji(null)
    setEditingEmojiIndex(-1)
  }

  const handleModalClose = () => {
    setIsProcessing(false)
    setCurrentStep('')
    setProcessingError('')
    setProcessingFiles([])
    setSelectedFiles([])
    setShowCelebration(false) // Stop celebration when modal closes
  }

  const handleRemoveFile = (index: number) => {
    const file = selectedFiles[index]
    if (file) {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
      openpanel.track("Emoji Creator: File Removed", { 
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return FileVideo
    if (file.type.startsWith('image/')) return FileImage
    return FileIcon
  }

  // Only render when client-side to avoid hydration mismatches
  if (!isClient) return null;

  return (
    <>
      <div 
        className="flex flex-col gap-2 py-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6 min-h-screen"
        onDragEnter={handleDragEnter}
        onDragLeave={(e) => {
          // Only handle drag leave if we're leaving the entire container
          if (e.currentTarget === e.target) {
            handleDragLeave(e)
          }
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="px-2 sm:px-4 lg:px-6">
          <div className="rounded-xl bg-card border border-border shadow p-2 sm:p-4">
            <div className="mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span>Create Slack Emojis</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Upload images, videos, or GIFs to create perfectly formatted Slack emojis.
              </p>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {/* Upload Files Card */}
              {loading ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Skeleton className="mx-auto h-12 w-12 mb-4" />
                      <Skeleton className="h-4 w-48 mx-auto mb-2" />
                      <Skeleton className="h-8 w-28 mx-auto" />
                      <Skeleton className="h-3 w-40 mx-auto mt-4" />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Upload Files</CardTitle>
                    <CardDescription>
                      Drag and drop or click to upload images, videos, or GIFs
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag and drop your files here, or click to select
                      </p>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        multiple
                        accept="image/*,video/*,.gif"
                        onChange={handleFileSelect}
                      />
                      <Button asChild variant="outline">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Choose Files
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-4">
                        Supports: JPG, PNG, GIF, MP4, MOV, WebM
                      </p>
                    </div>

                    {selectedFiles.length > 0 && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-sm">Selected Files ({selectedFiles.length})</h4>
                            <Button 
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const fileCount = selectedFiles.length
                                const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
                                setSelectedFiles([])
                                openpanel.track("Emoji Creator: All Files Cleared", { 
                                  fileCount: fileCount,
                                  totalSize: totalSize
                                })
                              }}
                              disabled={isProcessing}
                            >
                              Clear All
                            </Button>
                          </div>
                          {selectedFiles.map((file, index) => {
                            const Icon = getFileIcon(file)
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium text-sm">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveFile(index)}
                                  className="h-8 w-8"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                        <Button 
                          onClick={() => processFiles()} 
                          className="w-full"
                          disabled={isProcessing}
                          size="lg"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Process {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Processed Emojis */}
              {processedEmojis.length > 0 && (
                <EmojiProcessorPreview
                  emojis={processedEmojis}
                  onRemove={handleRemoveProcessed}
                  onDownload={handleDownloadEmoji}
                  onDownloadAll={handleDownloadAll}
                  onUpdateName={handleUpdateEmojiName}
                  onEdit={handleEditEmoji}
                />
              )}

              {/* How It Works Card */}
              {loading ? (
                <Card>
                  <CardHeader>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3 mb-6">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-4/5" />
                        </div>
                      ))}
                    </div>
                    <div className="pt-6 border-t">
                      <Skeleton className="h-5 w-40 mb-4" />
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i}>
                            <Skeleton className="h-3 w-24 mb-1" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">How It Works</CardTitle>
                    <CardDescription>
                      Understanding the magic behind perfect Slack emojis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-2">
                        <div className="p-2 bg-primary/10 rounded-full w-fit">
                          <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-medium">1. Upload Your File(s)</h3>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop or click to upload images, videos, or GIFs. Nothing is sent to any server, and everything is processed locally on your device.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="p-2 bg-primary/10 rounded-full w-fit">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <h3 className="font-medium">2. Automatic Processing</h3>
                        <p className="text-sm text-muted-foreground">
                          Files are automatically resized to 128×128px and optimized to stay under Slack's 128KB limit. Videos are converted to animated GIFs with smart quality adjustments.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="p-2 bg-primary/10 rounded-full w-fit">
                          <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                          </svg>
                        </div>
                        <h3 className="font-medium">3. Add to Slack</h3>
                        <p className="text-sm text-muted-foreground">
                          Download your emojis or send them directly to Slack! Connect your workspace in Settings to upload emojis with one click. Your emojis are ready to use in any Slack message!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <EmojiProcessingModal
        isOpen={isProcessing}
        files={processingFiles}
        processedEmojis={processedEmojis}
        currentFileIndex={currentFileIndex}
        currentStep={currentStep}
        error={processingError}
        onClose={handleModalClose}
        onDownload={handleDownloadEmoji}
        onDownloadAll={handleDownloadAll}
        onUpdateName={handleUpdateEmojiName}
        onEdit={handleEditEmoji}
      />
      
      {isClient && showCelebration && <EmojiCelebration isActive={showCelebration} />}
      
      {/* Full page drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm" />
          <div className="flex items-center justify-center h-full">
            <div className="bg-card border-2 border-primary border-dashed rounded-lg p-8 shadow-lg">
              <Upload className="mx-auto h-12 w-12 text-primary mb-4" />
              <p className="text-lg font-medium text-center">Drop files here to create emojis</p>
            </div>
          </div>
        </div>
      )}

      {/* Emoji Editor Modal */}
      <EmojiEditor
        emoji={editingEmoji}
        isOpen={editingEmoji !== null}
        onClose={handleCloseEditor}
        onSave={handleSaveEditedEmoji}
      />
    </>
  )
}

export default function EmojiCreatorPageWrapper() {
  return <EmojiCreatorPage />;
}