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
import { GifFrameEditorV2 } from "@/components/gif-frame-editor-v2"
import { VideoFrameExtractor } from "@/lib/utils/video-frame-extractor"
import { ChromeExtensionModal } from "@/components/chrome-extension-modal"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { openpanel } from "@/lib/safe-openpanel"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import Marquee from "@/components/ui/marquee"
import { cn } from "@/lib/utils"
import Image from "next/image"

// Sample emoji tiles for the background
const emojiTiles = [
  { name: "party", src: "🎉" },
  { name: "fire", src: "🔥" },
  { name: "rocket", src: "🚀" },
  { name: "heart", src: "❤️" },
  { name: "star", src: "⭐" },
  { name: "smile", src: "😊" },
  { name: "laugh", src: "😂" },
  { name: "cool", src: "😎" },
  { name: "thinking", src: "🤔" },
  { name: "celebrate", src: "🎊" },
  { name: "rainbow", src: "🌈" },
  { name: "pizza", src: "🍕" },
  { name: "coffee", src: "☕" },
  { name: "thumbsup", src: "👍" },
  { name: "clap", src: "👏" },
  { name: "muscle", src: "💪" },
  { name: "sparkles", src: "✨" },
  { name: "money", src: "💰" },
  { name: "gift", src: "🎁" },
  { name: "trophy", src: "🏆" },
];

const EmojiCard = ({ emoji }: { emoji: { name: string; src: string } }) => {
  return (
    <div
      className={cn(
        "relative size-16 cursor-pointer overflow-hidden rounded-xl border p-3",
        "bg-white/40 backdrop-blur-[1px] [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-white/10 dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <span className="text-2xl">{emoji.src}</span>
    </div>
  );
};

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
  const [dragCounter, setDragCounter] = useState(0)
  const [showCelebration, setShowCelebration] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [editingEmoji, setEditingEmoji] = useState<ProcessedEmoji | null>(null)
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number>(-1)
  const [hasSlack, setHasSlack] = useState(false)
  const [showChromeExtensionModal, setShowChromeExtensionModal] = useState(false)
  const [gifToEdit, setGifToEdit] = useState<File | null>(null)
  const [showGifEditor, setShowGifEditor] = useState(false)
  const [isReEditingFromModal, setIsReEditingFromModal] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setIsClient(true)
    setHasSlack(hasSlackConnection())
    
    console.log('[Create Page] Component mounted, URL:', window.location.href)
    console.log('[Create Page] Search params:', new URLSearchParams(window.location.search).toString())
    
    // Check if we have pending emoji data from Slackmojis or cart
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
    } else if (urlParams.get('from') === 'extension-cart') {
      // Handle cart data from extension
      const getCartData = async () => {
        try {
          // Try to get cart data from Chrome storage
          if (typeof window !== 'undefined' && typeof (window as any).chrome !== 'undefined' && (window as any).chrome.storage && (window as any).chrome.storage.local) {
            (window as any).chrome.storage.local.get(['pendingEmojiStudioCart'], (result: any) => {
              if (result.pendingEmojiStudioCart) {
                console.log('[Create Page] Found cart data from extension:', result.pendingEmojiStudioCart);
                
                const cartData = result.pendingEmojiStudioCart;
                const emojis = cartData.emojis || [];
                
                // Clear the data after retrieving
                (window as any).chrome.storage.local.remove(['pendingEmojiStudioCart']);
                
                // Process each emoji in the cart
                if (emojis.length > 0) {
                  toast({
                    title: `Processing ${emojis.length} emojis from cart`,
                    description: "Please wait while we load your emojis...",
                  });
                  
                  // Convert emojis to files
                  const processEmojis = async () => {
                    const files: File[] = [];
                    
                    for (const emoji of emojis) {
                      try {
                        const response = await fetch(emoji.url);
                        const blob = await response.blob();
                        
                        // Determine file extension
                        let extension = 'png';
                        if (blob.type.includes('gif') || emoji.url.toLowerCase().includes('.gif')) extension = 'gif';
                        else if (blob.type.includes('jpeg') || blob.type.includes('jpg')) extension = 'jpg';
                        else if (blob.type.includes('webp')) extension = 'webp';
                        
                        const fileName = `${emoji.name}.${extension}`;
                        const file = new File([blob], fileName, { type: blob.type });
                        
                        // Add HDR metadata if applicable
                        if (emoji.isHDR) {
                          (file as any).isHDR = true;
                          (file as any).originalUrl = emoji.originalUrl || emoji.url;
                        }
                        
                        files.push(file);
                      } catch (error) {
                        console.error(`[Create Page] Failed to process emoji ${emoji.name}:`, error);
                      }
                    }
                    
                    if (files.length > 0) {
                      console.log(`[Create Page] Successfully loaded ${files.length} emojis from cart`);
                      setSelectedFiles(files);
                      setProcessingFiles(files);
                      
                      // Auto-start processing
                      setTimeout(() => {
                        processFiles(files);
                      }, 500);
                    }
                  };
                  
                  processEmojis();
                }
              }
            });
          }
        } catch (error) {
          console.error('[Create Page] Failed to get cart data:', error);
        }
      };
      
      getCartData();
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
    
    // Check if the drag contains files
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragCounter(prev => {
        const newCounter = prev + 1
        if (newCounter === 1) {
          setIsDragging(true)
        }
        return newCounter
      })
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDragCounter(prev => {
      const newCounter = prev - 1
      if (newCounter === 0) {
        setIsDragging(false)
      }
      return newCounter
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Reset drag state
    setDragCounter(0)
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
        
        // Check if this is a video file that needs frame selection
        const isVideo = file.type.startsWith('video/')
        if (isVideo) {
          try {
            const videoInfo = await VideoFrameExtractor.getVideoInfo(file)
            console.log(`Video info: ${videoInfo.duration}ms, ${videoInfo.frameCount} frames at 10fps`)
            
            // If video would produce more than 50 frames, show frame editor
            if (videoInfo.frameCount > 50) {
              console.log('Video has more than 50 frames, showing frame editor')
              setGifToEdit(file)
              setShowGifEditor(true)
              setIsProcessing(false)
              
              // Wait for user to complete frame selection
              return
            }
          } catch (error) {
            console.error('Error checking video info:', error)
            // Continue with normal processing if we can't check
          }
        }
        
        // Check if this is a GIF or animated WebP file that needs frame selection
        const isGif = await isGifFile(file)
        const isAnimWebP = await isAnimatedWebP(file)
        const isAnimated = isGif || isAnimWebP
        
        // Check if animated image already meets Slack requirements (128x128 and under 128KB)
        if (isAnimated) {
          try {
            const img = document.createElement('img') as HTMLImageElement
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = URL.createObjectURL(file)
            })
            
            const meetsRequirements = file.size <= 128 * 1024 && 
                                     img.width <= 128 && 
                                     img.height <= 128
            
            URL.revokeObjectURL(img.src)
            
            // Check if frame editor is disabled (can be set via localStorage)
            const frameEditorDisabled = typeof window !== 'undefined' && 
                                       localStorage.getItem('disableGifFrameEditor') === 'true'
            
            // Only show editor for GIFs that don't meet requirements and are reasonable size
            if (!frameEditorDisabled && !meetsRequirements && file.size > 50 * 1024 && file.size < 100 * 1024 * 1024) { // Between 50KB and 100MB
              console.log(`${isGif ? 'GIF' : 'Animated WebP'} needs optimization: ${img.width}x${img.height}, ${file.size} bytes`)
              
              // Additional check for extremely large dimensions
              if (img.width > 10000 || img.height > 10000) {
                console.warn(`GIF dimensions too large for frame editor: ${img.width}x${img.height}`)
                // Process normally without frame editor
              } else {
                // Show GIF frame editor
                setGifToEdit(file)
                setShowGifEditor(true)
                setIsProcessing(false)
                
                // Wait for user to complete frame selection
                return
              }
            } else if (file.size >= 100 * 1024 * 1024) {
              console.log(`${isGif ? 'GIF' : 'Animated WebP'} too large for frame editor (${(file.size / 1024 / 1024).toFixed(2)}MB), processing normally`)
            } else {
              console.log(`${isGif ? 'GIF' : 'Animated WebP'} already optimized or too small for frame editor: ${img.width}x${img.height}, ${file.size} bytes`)
            }
          } catch (error) {
            console.error('Error checking GIF dimensions:', error)
            // Continue with normal processing if we can't check dimensions
          }
        }
        
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
  
  const handleEditGifFrames = (emoji: ProcessedEmoji, index: number) => {
    // Set the original file for frame editing
    setGifToEdit(emoji.originalFile)
    setShowGifEditor(true)
    setIsReEditingFromModal(true)
    
    // Close the processing modal temporarily
    setIsProcessing(false)
    
    openpanel.track("Emoji Creator: GIF Frame Edit Started", { 
      emojiName: emoji.name,
      originalSize: emoji.originalSize,
      processedSize: emoji.processedSize,
      isVideo: emoji.wasVideo || false
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
    setProcessedEmojis([]) // Clear processed emojis when closing
    setShowCelebration(false) // Stop celebration when modal closes
    setIsReEditingFromModal(false) // Reset re-editing flag
  }

  // Helper function to check if a file is an animated WebP
  const isAnimatedWebP = async (file: File): Promise<boolean> => {
    try {
      if (!file.name.toLowerCase().endsWith('.webp') && file.type !== 'image/webp') {
        return false
      }
      
      const arrayBuffer = await file.slice(0, 100).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
      // Check for RIFF header and WEBP signature
      if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return false
      if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) return false
      
      // Look for ANIM chunk
      for (let i = 12; i < bytes.length - 4; i++) {
        if (bytes[i] === 0x41 && bytes[i+1] === 0x4E && bytes[i+2] === 0x49 && bytes[i+3] === 0x4D) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('Error checking if WebP is animated:', error)
      return false
    }
  }

  // Helper function to check if a file is a GIF
  const isGifFile = async (file: File): Promise<boolean> => {
    try {
      // Check file extension first
      if (file.name.toLowerCase().endsWith('.gif')) {
        return true
      }
      
      // Check MIME type
      if (file.type === 'image/gif') {
        return true
      }
      
      // Check file content for GIF signature
      const arrayBuffer = await file.slice(0, 6).arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
      // GIF files start with either GIF87a or GIF89a
      return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
             bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
    } catch (error) {
      console.error('Error checking if file is GIF:', error)
      return false
    }
  }
  
  const handleGifExport = async (blob: Blob, selectedFrames: number[]) => {
    if (!gifToEdit) return
    
    // Create a processed emoji from the exported GIF
    const fileName = gifToEdit.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/\s+/g, '-')
    const processedEmoji: ProcessedEmoji = {
      name: fileName,
      originalFile: gifToEdit,
      processedBlob: blob,
      originalSize: gifToEdit.size,
      processedSize: blob.size,
      dimensions: { width: 128, height: 128 },
      format: 'GIF',
      preview: URL.createObjectURL(blob),
      blob: await blobToDataURL(blob),
      processingNote: `Selected ${selectedFrames.length} frames`,
      wasVideo: gifToEdit.type.startsWith('video/')
    }
    
    // Close the frame editor
    setShowGifEditor(false)
    
    if (isReEditingFromModal) {
      // If we're re-editing from the modal, update the existing processed emoji
      setProcessedEmojis(prev => {
        // Replace the existing emoji with the new one
        const newEmojis = [...prev]
        const existingIndex = newEmojis.findIndex(e => e.originalFile === gifToEdit)
        if (existingIndex >= 0) {
          newEmojis[existingIndex] = processedEmoji
        } else {
          newEmojis.push(processedEmoji)
        }
        return newEmojis
      })
      
      // Show the processing modal again
      setIsProcessing(true)
      setIsReEditingFromModal(false)
    } else {
      // Normal flow - new file being processed
      setProcessedEmojis([processedEmoji])
      setProcessingFiles([gifToEdit])
      setCurrentFileIndex(0)
      setCurrentStep('completed')
      setIsProcessing(true) // This shows the processing modal
    }
    
    setGifToEdit(null)
    setSelectedFiles([])
    
    // Show celebration
    setShowCelebration(true)
    
    openpanel.track("Emoji Creator: GIF Frame Editor Export", {
      originalSize: gifToEdit.size,
      processedSize: blob.size,
      selectedFrames: selectedFrames.length,
      fileName: fileName,
      isVideo: gifToEdit.type.startsWith('video/')
    })
  }
  
  const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
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
        onDragLeave={handleDragLeave}
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
                        accept="image/*,video/*,.gif,.webp"
                        onChange={handleFileSelect}
                      />
                      <Button asChild variant="outline">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Choose Files
                        </label>
                      </Button>
                      <p className="text-xs text-muted-foreground mt-4">
                        Supports: JPG, PNG, GIF, WebP, MP4, MOV, WebM
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

              {/* Chrome Extension Hero Section */}
              {!hasSlack && !loading && (
                <div className="relative overflow-hidden rounded-xl">
                  {/* Scrolling emoji background */}
                  <div className="absolute inset-0 flex w-full flex-col items-center justify-center overflow-hidden">
                    <Marquee
                      pauseOnHover
                      className="[--duration:20s]"
                      repeat={3}
                    >
                      {emojiTiles.slice(0, 10).map((emoji, idx) => (
                        <EmojiCard key={idx} emoji={emoji} />
                      ))}
                    </Marquee>
                    <Marquee
                      reverse
                      pauseOnHover
                      className="[--duration:30s]"
                      repeat={3}
                    >
                      {emojiTiles.slice(10, 20).map((emoji, idx) => (
                        <EmojiCard key={idx} emoji={emoji} />
                      ))}
                    </Marquee>
                    <Marquee
                      pauseOnHover
                      className="[--duration:25s]"
                      repeat={3}
                    >
                      {emojiTiles.slice(0, 10).map((emoji, idx) => (
                        <EmojiCard key={idx} emoji={emoji} />
                      ))}
                    </Marquee>
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="relative px-6 py-16 sm:px-10 sm:py-24 lg:py-32 backdrop-blur-[2px]">
                    <div className="mx-auto max-w-2xl text-center">
                      <div className="mb-6 inline-flex items-center rounded-full bg-blue-500/10 backdrop-blur-sm px-3 py-1 text-sm">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium text-blue-600 dark:text-blue-400">New!</span>
                      </div>
                      
                      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Import Emojis from Any Website
                      </h2>
                      
                      <p className="mx-auto max-w-xl text-lg text-muted-foreground mb-8">
                        Connect to your Slack in one click. Add any image, GIF, or video as a perfectly formatted emoji. 
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                          size="lg"
                          className="min-w-[200px] shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
                          onClick={() => setShowChromeExtensionModal(true)}
                        >
                          <ChromeIcon className="h-5 w-5 text-blue-500" />
                          Get Chrome Extension
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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
                  onShowChromeExtension={() => setShowChromeExtensionModal(true)}
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
                          Download your emojis or send them directly to Slack! Install our Chrome extension to easily import emojis from any website. Your emojis are ready to use in any Slack message!
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
        onEditGifFrames={handleEditGifFrames}
        onShowChromeExtension={() => setShowChromeExtensionModal(true)}
      />
      
      {isClient && showCelebration && <EmojiCelebration isActive={showCelebration} />}

      {/* Emoji Editor Modal */}
      <EmojiEditor
        emoji={editingEmoji}
        isOpen={editingEmoji !== null}
        onClose={handleCloseEditor}
        onSave={handleSaveEditedEmoji}
      />

      {/* Chrome Extension Installation Modal */}
      <ChromeExtensionModal
        isOpen={showChromeExtensionModal}
        onClose={() => setShowChromeExtensionModal(false)}
      />

      {/* GIF Frame Editor Modal */}
      {gifToEdit && (
        <GifFrameEditorV2
          file={gifToEdit}
          isOpen={showGifEditor}
          onClose={() => {
            setShowGifEditor(false)
            const wasReEditing = isReEditingFromModal
            const hadProcessedEmojis = processedEmojis.length > 0
            setGifToEdit(null)
            
            // If we were re-editing, show the processing modal again
            if (wasReEditing && hadProcessedEmojis) {
              setIsProcessing(true)
              setIsReEditingFromModal(false)
            } else {
              // User canceled - clear everything and exit the flow
              setSelectedFiles([])
              setIsProcessing(false)
              setProcessedEmojis([])
              setIsReEditingFromModal(false)
              console.log('Frame editor canceled - exiting emoji creation flow')
            }
          }}
          onExport={handleGifExport}
        />
      )}
    </>
  )
}

export default function EmojiCreatorPageWrapper() {
  return <EmojiCreatorPage />;
}

// Add CSS for grid pattern
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    .bg-grid-white\\/5 {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e");
    }
  `
  document.head.appendChild(style)
}