"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Sparkles, X, FileVideo, FileImage, File as FileIcon, Grid3x3, List, Search, SmilePlus } from "lucide-react"
import { EmojiProcessor, ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { EmojiProcessorPreview } from "@/components/emoji-processor-preview"
import { EmojiProcessingModal } from "@/components/emoji-processing-modal"
import { EmojiEditor } from "@/components/emoji-editor"
import { GifFrameEditorCSS } from "@/components/gif-frame-editor-css"
import { MobileEmojiCreator } from "@/components/mobile-emoji-creator"
import { usePackBrowser, PackBrowserTabs, PackEmojiGrid, PackSelectionSidebar } from "@/components/pack-browser"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { VideoFrameExtractor } from "@/lib/utils/video-frame-extractor"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { useToast } from "@/components/ui/use-toast"
import { useTrack } from "@/lib/hooks/use-track"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import Marquee from "@/components/ui/marquee"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

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
  const { loading, emojiData } = useEmojiData()
  const isMobile = useIsMobile()
  const track = useTrack()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [processedEmojis, setProcessedEmojis] = useState<ProcessedEmoji[]>([])
  const [processingFiles, setProcessingFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState<string>("")
  const [processingError, setProcessingError] = useState<string>("")
  const [isDragging, setIsDragging] = useState(false)
  const [editingEmoji, setEditingEmoji] = useState<ProcessedEmoji | null>(null)
  const [editingEmojiIndex, setEditingEmojiIndex] = useState<number>(-1)
  const [hasSlack, setHasSlack] = useState(false)
  const [gifToEdit, setGifToEdit] = useState<File | null>(null)
  const [showGifEditor, setShowGifEditor] = useState(false)
  const [isReEditingFromModal, setIsReEditingFromModal] = useState(false)
  const [failedFrameExtraction, setFailedFrameExtraction] = useState<Set<string>>(new Set())
  const [pendingMobileFile, setPendingMobileFile] = useState<File | null>(null)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{
    stage: "downloading" | "finalizing"
    completed: number
    total: number
  } | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    completed: number
    failed: number
    total: number
    stage: "uploading" | "complete"
  } | null>(null)
  const [showUploadOverlay, setShowUploadOverlay] = useState(false)
  const { toast } = useToast()

  const desktopLayoutRef = useRef<HTMLDivElement | null>(null)
  const [availableLayoutHeight, setAvailableLayoutHeight] = useState<number | null>(null)
  const lastTrackedSearchQuery = useRef<string>("")

  const updateLayoutHeight = useCallback(() => {
    if (typeof window === "undefined") return
    const container = desktopLayoutRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const parent = container.parentElement
    const parentStyles = parent ? window.getComputedStyle(parent) : null
    const parentPaddingBottom = parentStyles ? parseFloat(parentStyles.paddingBottom || "0") : 0
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const calculatedHeight = viewportHeight - rect.top - parentPaddingBottom

    if (!Number.isFinite(calculatedHeight)) return

    const nextHeight = Math.max(0, calculatedHeight)

    setAvailableLayoutHeight((prev) => {
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) {
        return prev ?? null
      }
      if (prev === null || Math.abs(prev - nextHeight) > 1) {
        return nextHeight
      }
      return prev
    })
  }, [])

  // Pack browser state
  const packBrowser = usePackBrowser(20, emojiData)

  const updateCartOpen = useCallback(
    (open: boolean, source: 'toolbar' | 'sheet' | 'sheet-action') => {
      setIsCartOpen(open)
      track(
        open ? 'Emoji Creator: Selection Drawer Opened' : 'Emoji Creator: Selection Drawer Closed',
        {
          source,
          selectedCount: packBrowser.selectedEmojis.length,
        }
      )
    },
    [packBrowser.selectedEmojis.length]
  )

  useEffect(() => {
    setHasSlack(hasSlackConnection())
    
    console.log('[Create Page] Component mounted, URL:', window.location.href)
    console.log('[Create Page] Search params:', new URLSearchParams(window.location.search).toString())
    
    // Check for pending file from mobile drawer
    const pendingFile = sessionStorage.getItem('pendingEmojiFile')
    if (pendingFile) {
      try {
        const fileData = JSON.parse(pendingFile)
        console.log('[Create Page] Found pending file:', {
          fileName: fileData.fileName,
          fileType: fileData.fileType,
          source: fileData.source,
          dataUrlLength: fileData.dataUrl?.length
        })
        sessionStorage.removeItem('pendingEmojiFile')
        
        // Convert data URL to File
        fetch(fileData.dataUrl)
          .then(res => {
            console.log('[Create Page] Fetch response:', {
              ok: res.ok,
              status: res.status,
              type: res.type
            })
            return res.blob()
          })
          .then(blob => {
            console.log('[Create Page] Created blob:', {
              size: blob.size,
              type: blob.type
            })
            
            const file = new File([blob], fileData.fileName, { type: fileData.fileType })
            
            // Check if mobile at this moment (window width < 768px)
            const isCurrentlyMobile = window.innerWidth < 768
            
            console.log('[Create Page] Created file:', {
              name: file.name,
              size: file.size,
              type: file.type,
              isMobile,
              isCurrentlyMobile,
              windowWidth: window.innerWidth
            })
            
            if (isCurrentlyMobile) {
              // Use mobile-optimized flow
              console.log('[Create Page] Setting pending mobile file (mobile detected)')
              setPendingMobileFile(file)
            } else {
              // Use desktop flow
              setSelectedFiles([file])
              setProcessingFiles([file])
              
              toast({
                title: `Processing ${fileData.source === 'camera' ? 'captured photo' : fileData.source === 'video' ? 'recorded video' : 'uploaded file'}`,
                description: "Converting to emoji format...",
              })
              
              // Auto-start processing
              setTimeout(() => {
                processFiles([file])
              }, 500)
            }
          })
          .catch(error => {
            console.error('[Create Page] Error converting data URL to file:', error)
          })
      } catch (error) {
        console.error('[Create Page] Failed to process pending file:', error)
      }
    }
    
    // Listen for Chrome extension messages
    const handleExtensionMessage = async (event: MessageEvent) => {
      if (event.data.type === 'EMOJI_STUDIO_CART_DATA') {
        console.log('[Create Page] Received cart data from extension:', event.data)
        
        const cartData = event.data.data;
        const emojis = cartData?.emojis || [];
        
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
                // Use image proxy to avoid CORS issues
                const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.url)}`;
                const response = await fetch(proxyUrl);
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
              
              // Track the cart sync event
              track('chrome_extension_cart_synced', {
                emojiCount: files.length,
                workspace: cartData.workspace || 'unknown',
                source: 'extension-cart'
              });
              
              // Auto-start processing
              setTimeout(() => {
                processFiles(files);
              }, 500);
            }
          };
          
          processEmojis();
        }
      } else if (event.data.type === 'EMOJI_STUDIO_CREATE_EMOJI') {
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
        track("chrome_extension_emoji_received", { 
          emojiName: emojiName || 'unnamed',
          isHDR: isHDR || false,
          source: 'chrome-extension-direct'
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
            // Use proxy for external URLs to avoid CORS
            const fetchUrl = imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname) 
              ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
              : imageUrl;
            const response = await fetch(fetchUrl)
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
            // Use proxy for external URLs to avoid CORS
            const fetchUrl = imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname) 
              ? `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`
              : imageUrl;
            const response = await fetch(fetchUrl)
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
          
          track("Emoji Creator: Extension Image Load Failed", { 
            imageUrl: imageUrl,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
  }
    
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
      console.log('[Create Page] Waiting for cart data from extension...');
      // Cart data will be sent via postMessage from the extension's inject.js script
    }
    
    window.addEventListener('message', handleExtensionMessage)
    return () => window.removeEventListener('message', handleExtensionMessage)
  }, [])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Check if the drag contains files
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Only hide overlay if we're leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Reset drag state
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/')
    )

    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      setShowUploadOverlay(true) // Open overlay when files are dropped
      track("Emoji Creator: Files Dropped", {
        fileCount: files.length,
        fileTypes: files.map(f => f.type)
      })
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files])
      track("Emoji Creator: Files Selected", { 
        fileCount: files.length,
        fileTypes: files.map(f => f.type)
      })
    }
  }

  const processFiles = useCallback(async (filesToProcess?: File[]) => {
    const files = filesToProcess || selectedFiles
    if (files.length === 0) return

    // Check if any files are from URLs that might need special handling
    for (const file of files) {
      if (file.name.includes('tenor') || file.name.includes('giphy')) {
        console.log('[processFiles] Detected URL-based GIF that may need special handling:', file.name)
      }
    }

    track("Emoji Creator: Processing Started", { 
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
                // Check if we've already failed to extract frames for this file
                const fileKey = `${file.name}-${file.size}-${file.lastModified}`
                if (failedFrameExtraction.has(fileKey)) {
                  console.log('Skipping frame editor for file that already failed frame extraction:', file.name)
                  // Process normally without frame editor
                } else {
                  // Show GIF frame editor
                  setGifToEdit(file)
                  setShowGifEditor(true)
                  setIsProcessing(false)
                  
                  // Wait for user to complete frame selection
                  return
                }
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
        
        track("Emoji Creator: File Processed Successfully", { 
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
        
        track("Emoji Creator: Processing Error", { 
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
    
    // Track completion if emojis were processed successfully
    if (newProcessedEmojis.length > 0) {
      track("Emoji Creator: Batch Processing Completed", { 
        totalFiles: files.length,
        successfulFiles: newProcessedEmojis.length,
        failedFiles: files.length - newProcessedEmojis.length,
        totalProcessedSize: newProcessedEmojis.reduce((sum, e) => sum + e.processedSize, 0)
      })
    }
  }, [selectedFiles, setProcessingFiles, setIsProcessing, setCurrentFileIndex, setCurrentStep, setProcessingError, setProcessedEmojis, setGifToEdit, setShowGifEditor, failedFrameExtraction])

  const handleRemoveProcessed = (index: number) => {
    setProcessedEmojis(prev => prev.filter((_, i) => i !== index))
  }

  const handleDownloadEmoji = async (emoji: ProcessedEmoji) => {
    await EmojiProcessor.downloadEmoji(emoji)
    track("Emoji Creator: Single Emoji Downloaded", { 
      emojiName: emoji.name,
      format: emoji.format,
      size: emoji.processedSize
    })
  }

  const handleDownloadAll = async () => {
    await EmojiProcessor.downloadAllEmojis(processedEmojis)
    track("Emoji Creator: All Emojis Downloaded", { 
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
      track("Emoji Creator: Emoji Name Updated", { 
        oldName: emoji.name,
        newName: newName,
        format: emoji.format
      })
    }
  }


  const handleEditEmoji = (emoji: ProcessedEmoji, index: number) => {
    setEditingEmoji(emoji)
    setEditingEmojiIndex(index)
    track("Emoji Creator: Edit Started", { 
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
    
    track("Emoji Creator: GIF Frame Edit Started", { 
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
      track("Emoji Creator: Edit Saved", { 
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
  
  const handleGifExport = async (blob: Blob, selectedFrames: number[], speedMultiplier: number) => {
    if (!gifToEdit) return
    
    console.log('[handleGifExport] Exporting GIF:', {
      originalSize: gifToEdit.size,
      exportedSize: blob.size,
      selectedFrames: selectedFrames.length,
      speedMultiplier,
      blobType: blob.type
    })
    
    // Mark this file as having been through frame editor to prevent loops
    const fileKey = `${gifToEdit.name}-${gifToEdit.size}-${gifToEdit.lastModified}`
    setFailedFrameExtraction(prev => new Set(prev).add(fileKey))
    
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
      processingNote: `Selected ${selectedFrames.length} frames at ${speedMultiplier}x speed`,
      wasVideo: gifToEdit.type.startsWith('video/'),
      speedMultiplier: speedMultiplier
    }
    
    // Store the original file reference before clearing
    const originalFile = gifToEdit
    
    // Clear state first
    setGifToEdit(null)
    setSelectedFiles([])
    
    if (isReEditingFromModal) {
      // If we're re-editing from the modal, update the existing processed emoji
      setProcessedEmojis(prev => {
        // Replace the existing emoji with the new one
        const newEmojis = [...prev]
        const existingIndex = newEmojis.findIndex(e => e.originalFile === originalFile)
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
      setProcessingFiles([originalFile])
      setCurrentFileIndex(0)
      setCurrentStep('completed')
      setIsProcessing(true) // This shows the processing modal
    }
    
    // Close the frame editor after setting everything up
    setShowGifEditor(false)
    
    
    track("Emoji Creator: GIF Frame Editor Export", {
      originalSize: originalFile.size,
      processedSize: blob.size,
      selectedFrames: selectedFrames.length,
      fileName: fileName,
      isVideo: originalFile.type.startsWith('video/'),
      speedMultiplier: speedMultiplier
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
      // Revoke object URL to free memory
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        try {
          URL.revokeObjectURL(URL.createObjectURL(file))
        } catch (e) {
          // Ignore errors
        }
      }
      setSelectedFiles(prev => prev.filter((_, i) => i !== index))
      track("Emoji Creator: File Removed", {
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

  useEffect(() => {
    if (isMobile) return

    let rafId = 0

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        updateLayoutHeight()
      })
    }

    handleResize()

    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)
    const visualViewport = window.visualViewport
    visualViewport?.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      visualViewport?.removeEventListener("resize", handleResize)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [isMobile, updateLayoutHeight])

  useEffect(() => {
    const trimmed = packBrowser.searchQuery.trim()

    if (trimmed === "") {
      if (lastTrackedSearchQuery.current !== "") {
        track('Emoji Creator: Pack Search Cleared', {
          previousQuery: lastTrackedSearchQuery.current,
        })
        lastTrackedSearchQuery.current = ""
      }
      return
    }

    const handler = window.setTimeout(() => {
      if (trimmed !== lastTrackedSearchQuery.current) {
        track('Emoji Creator: Pack Search', {
          query: trimmed,
          length: trimmed.length,
        })
        lastTrackedSearchQuery.current = trimmed
      }
    }, 600)

    return () => {
      window.clearTimeout(handler)
    }
  }, [packBrowser.searchQuery])

  // Only render when client-side to avoid hydration mismatches

  // Show mobile-optimized flow on mobile devices
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileEmojiCreator 
          initialFile={pendingMobileFile || undefined}
          onCancel={() => setPendingMobileFile(null)}
        />
      </div>
    )
  }

  return (
    <>
      <div
        ref={desktopLayoutRef}
        className="flex flex-col overflow-hidden min-h-0"
        style={availableLayoutHeight ? { height: availableLayoutHeight, maxHeight: availableLayoutHeight } : undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="flex-1 flex flex-col min-h-0 px-3 sm:px-4 lg:px-6 py-2 sm:py-4 md:py-6">
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl bg-card border border-border shadow p-2 sm:p-4">
            <div className="flex-none pb-3 sm:pb-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Create Slack Emojis</span>
                </h1>
                {!isMobile && (
                  <p className="text-muted-foreground text-sm sm:text-base mt-1">
                    Browse emoji packs or upload your own files
                  </p>
                )}
              </div>
              {/* Upload button */}
              <Button
                onClick={() => setShowUploadOverlay(true)}
                variant="outline"
                className="gap-2 flex-shrink-0"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Upload Files</span>
              </Button>
            </div>

            {/* Pack Browser - always visible as main content */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_min(400px,30vw)] xl:auto-rows-[minmax(0,1fr)] gap-6 min-w-0 min-h-0">
                <Card className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
                  <CardHeader className="flex-none">
                    <div className="flex gap-2 items-center pb-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search emoji packs..."
                          value={packBrowser.searchQuery}
                          onChange={(e) => packBrowser.setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const nextView = packBrowser.viewMode === "grid" ? "list" : "grid"
                            packBrowser.setViewMode(nextView)
                            track('Emoji Creator: Pack View Changed', {
                              view: nextView,
                            })
                          }}
                        >
                          {packBrowser.viewMode === "grid" ? (
                            <List className="h-4 w-4" />
                          ) : (
                            <Grid3x3 className="h-4 w-4" />
                          )}
                        </Button>
                        {packBrowser.selectedEmojis.length > 0 && (
                          <Button
                            onClick={() => updateCartOpen(true, 'toolbar')}
                            className="relative h-9 w-9 rounded-xl border border-border/60 bg-card/95 shadow-sm xl:hidden"
                            size="icon"
                          >
                            <div className="relative h-full w-full overflow-hidden rounded-lg bg-background/80 flex items-center justify-center">
                              <SmilePlus className="h-5 w-5 text-primary" />
                            </div>
                            <Badge
                              variant="destructive"
                              className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
                            >
                              {packBrowser.selectedEmojis.length}
                            </Badge>
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <PackBrowserTabs
                        selectedTab={packBrowser.selectedTab}
                        onSelectTab={(tab) => {
                          packBrowser.setSelectedTab(tab)
                          track('Emoji Creator: Pack Tab Selected', {
                            tab,
                          })
                        }}
                        searchQuery={packBrowser.searchQuery}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden pt-4 min-h-0">
                    <ScrollArea className="h-full">
                      <PackEmojiGrid
                        emojis={packBrowser.currentEmojis}
                        loading={packBrowser.loading}
                        viewMode={packBrowser.viewMode}
                        selectedIds={packBrowser.selectedIds}
                        onToggleSelection={packBrowser.toggleSelection}
                      />
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Desktop sidebar - only show on xl screens */}
                <div className="hidden xl:flex xl:flex-col xl:min-h-0 xl:h-full">
                  <PackSelectionSidebar
                    selectedEmojis={packBrowser.selectedEmojis}
                    maxSelection={20}
                    nameStatuses={packBrowser.nameStatuses}
                    editingName={packBrowser.editingName}
                    editingValue={packBrowser.editingValue}
                    onSetEditingName={packBrowser.setEditingName}
                    onSetEditingValue={packBrowser.setEditingValue}
                    onSaveCustomName={packBrowser.saveCustomName}
                    customNames={packBrowser.customNames}
                    onRemove={(emoji) => {
                      const remainingCount = Math.max(packBrowser.selectedEmojis.length - 1, 0)
                      packBrowser.removeFromSelection(emoji)
                      track('Emoji Creator: Selection Item Removed', {
                        id: emoji.id,
                        name: emoji.name,
                        remainingCount,
                      })
                    }}
                    onClear={() => {
                      const previousCount = packBrowser.selectedEmojis.length
                      setDownloadProgress(null)
                      setUploadProgress(null)
                      packBrowser.clearSelection()
                      track('Emoji Creator: Selection Cleared', {
                        previousCount,
                      })
                    }}
                    hasSlackConnection={hasSlack}
                    downloadProgress={downloadProgress}
                    uploadProgress={uploadProgress}
                    onDownload={async () => {
                      const selected = packBrowser.getSelectedEmojis()
                      if (selected.length === 0) return

                      const JSZip = (await import('jszip')).default
                      const zip = new JSZip()

                      let completed = 0
                      const total = selected.length

                      setDownloadProgress({ stage: "downloading", completed: 0, total })

                      // Show initial progress toast
                      const progressToast = toast({
                        title: "Creating zip file...",
                        description: `Starting download...`,
                        duration: Infinity,
                      })

                      const updateProgressToast = (message: string) => {
                        progressToast.update({
                          id: progressToast.id,
                          title: "Creating zip file...",
                          description: message,
                          duration: Infinity,
                        })
                      }

                      // Download and add emojis to zip
                      for (const emoji of selected) {
                        try {
                          console.log(`[Download] Fetching emoji: ${emoji.name} from ${emoji.imageURL}`)

                          // Use image proxy to avoid CORS issues
                          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.imageURL)}`
                          const response = await fetch(proxyUrl)

                          if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                          }

                          const blob = await response.blob()
                          console.log(`[Download] Downloaded ${emoji.name}: ${blob.size} bytes`)

                          const ext = emoji.isAnimated ? 'gif' : 'png'
                          const fileName = `${emoji.name}.${ext}`

                          zip.file(fileName, blob)
                          completed++

                          setDownloadProgress((prev) =>
                            prev ? { ...prev, completed } : prev
                          )

                          // Update progress every 5 emojis or on last emoji
                          if (completed % 5 === 0 || completed === total) {
                            updateProgressToast(`Downloaded ${completed}/${total} emojis`)
                          }
                        } catch (error) {
                          console.error(`[Download] Failed to download emoji ${emoji.name}:`, error)
                          console.error(`[Download] URL was: ${emoji.imageURL}`)
                        }
                      }

                      if (completed === 0) {
                        progressToast.dismiss()
                        setDownloadProgress(null)
                        toast({
                          title: "Download failed",
                          description: "Could not download any emojis",
                          variant: "destructive",
                        })
                        return
                      }

                      // Generate zip file
                      setDownloadProgress((prev) =>
                        prev ? { ...prev, stage: "finalizing" } : prev
                      )
                      updateProgressToast("Finalizing download...")

                      try {
                        const zipBlob = await zip.generateAsync({ type: 'blob' })

                        // Create download link
                        const url = URL.createObjectURL(zipBlob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `emoji-pack-${Date.now()}.zip`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)

                        progressToast.dismiss()
                        setDownloadProgress(null)
                        packBrowser.clearSelectionsAndStorage()

                        toast({
                          title: "Download complete",
                          description: `Downloaded ${completed} emoji${completed > 1 ? 's' : ''} as zip file`,
                        })
                      } catch (error) {
                        console.error('Failed to create zip:', error)
                        progressToast.dismiss()
                        setDownloadProgress(null)
                        toast({
                          title: "Failed to create zip",
                          description: "Could not create zip file",
                          variant: "destructive",
                        })
                      }
                    }}
                    onSendToSlack={async () => {
                      const selected = packBrowser.getSelectedEmojis()
                      if (selected.length === 0) return

                      // Upload pack emojis directly to Slack without processing
                      const { uploadPackEmojiToSlack } = await import('@/lib/utils/slack-upload')

                      let successCount = 0
                      let failedCount = 0
                      const errors: string[] = []
                      const total = selected.length

                      setUploadProgress({ completed: 0, failed: 0, total, stage: "uploading" })

                      const uploadToast = toast({
                        title: "Uploading to Slack...",
                        description: `0/${total} (0%)`,
                        duration: Infinity,
                      })

                      const updateUploadToast = (message: string) => {
                        uploadToast.update({
                          id: uploadToast.id,
                          title: "Uploading to Slack...",
                          description: message,
                          duration: Infinity,
                        })
                      }

                      for (let i = 0; i < selected.length; i++) {
                        const emoji = selected[i]
                        try {
                          // Use custom name if available
                          const effectiveName = packBrowser.getEffectiveName(emoji)
                          const result = await uploadPackEmojiToSlack(
                            emoji.imageURL,
                            effectiveName,
                            emoji.isAnimated
                          )

                          if (result.success) {
                            successCount++
                          } else {
                            failedCount++
                            errors.push(`${effectiveName}: ${result.error || 'Unknown error'}`)
                          }

                          // Update progress - show completed count and percentage
                          const completed = successCount + failedCount
                          const percentage = Math.round((completed / total) * 100)
                          setUploadProgress((prev) =>
                            prev ? { ...prev, completed, failed: failedCount } : prev
                          )
                          updateUploadToast(`${completed}/${total} (${percentage}%) - ${successCount} succeeded${failedCount > 0 ? `, ${failedCount} failed` : ''}`)
                        } catch (error) {
                          const effectiveName = packBrowser.getEffectiveName(emoji)
                          console.error(`Failed to upload ${effectiveName}:`, error)
                          failedCount++
                          errors.push(`${effectiveName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
                        }
                      }

                      uploadToast.dismiss()
                      setUploadProgress((prev) => (prev ? { ...prev, stage: "complete" } : prev))

                      // Show final result
                      if (successCount > 0) {
                        packBrowser.clearSelectionsAndStorage()
                        toast({
                          title: "Upload complete",
                          description: `Successfully uploaded ${successCount} emoji${successCount > 1 ? 's' : ''} to Slack${failedCount > 0 ? `. ${failedCount} failed.` : ''}`,
                          duration: 8000,
                        })
                      }

                      if (failedCount > 0) {
                        console.error('Upload errors:', errors)
                        toast({
                          title: `${failedCount} upload${failedCount > 1 ? 's' : ''} failed`,
                          description: errors[0] || 'Unknown error',
                          variant: "destructive",
                        })
                      }

                      if (successCount > 0) {
                        setTimeout(() => setUploadProgress(null), 3000)
                      } else {
                        setUploadProgress(null)
                      }
                    }}
                  />
                </div>

                {/* Mobile sheet */}
                <Sheet open={isCartOpen} onOpenChange={(open) => updateCartOpen(open, 'sheet')}>
                  <SheetContent side="right" className="w-full sm:max-w-md p-0">
                    <PackSelectionSidebar
                        selectedEmojis={packBrowser.selectedEmojis}
                        maxSelection={20}
                        nameStatuses={packBrowser.nameStatuses}
                        editingName={packBrowser.editingName}
                        editingValue={packBrowser.editingValue}
                        onSetEditingName={packBrowser.setEditingName}
                        onSetEditingValue={packBrowser.setEditingValue}
                        onSaveCustomName={packBrowser.saveCustomName}
                        customNames={packBrowser.customNames}
                        onRemove={(emoji) => {
                          const remainingCount = Math.max(packBrowser.selectedEmojis.length - 1, 0)
                          packBrowser.removeFromSelection(emoji)
                          track('Emoji Creator: Selection Item Removed', {
                            id: emoji.id,
                            name: emoji.name,
                            remainingCount,
                          })
                        }}
                        onClear={() => {
                          const previousCount = packBrowser.selectedEmojis.length
                          setDownloadProgress(null)
                          setUploadProgress(null)
                          packBrowser.clearSelection()
                          track('Emoji Creator: Selection Cleared', {
                            previousCount,
                          })
                        }}
                        hasSlackConnection={hasSlack}
                        downloadProgress={downloadProgress}
                        uploadProgress={uploadProgress}
                        onDownload={async () => {
                          updateCartOpen(false, 'sheet-action')
                          // Reuse the same download logic
                          const selected = packBrowser.getSelectedEmojis()
                          if (selected.length === 0) return

                          const JSZip = (await import('jszip')).default
                          const zip = new JSZip()

                          let completed = 0
                          const total = selected.length

                          setDownloadProgress({ stage: "downloading", completed: 0, total })

                          const progressToast = toast({
                            title: "Creating zip file...",
                            description: `Starting download...`,
                            duration: Infinity,
                          })

                          const updateProgressToast = (message: string) => {
                            progressToast.update({
                              id: progressToast.id,
                              title: "Creating zip file...",
                              description: message,
                              duration: Infinity,
                            })
                          }

                          for (const emoji of selected) {
                            try {
                              const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(emoji.imageURL)}`
                              const response = await fetch(proxyUrl)

                              if (!response.ok) {
                                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                              }

                              const blob = await response.blob()
                              const ext = emoji.isAnimated ? 'gif' : 'png'
                              const fileName = `${emoji.name}.${ext}`

                              zip.file(fileName, blob)
                              completed++

                              setDownloadProgress((prev) =>
                                prev ? { ...prev, completed } : prev
                              )

                              if (completed % 5 === 0 || completed === total) {
                                updateProgressToast(`Downloaded ${completed}/${total} emojis`)
                              }
                            } catch (error) {
                              console.error(`[Download] Failed to download emoji ${emoji.name}:`, error)
                            }
                          }

                          if (completed === 0) {
                            progressToast.dismiss()
                            setDownloadProgress(null)
                            toast({
                              title: "Download failed",
                              description: "Could not download any emojis",
                              variant: "destructive",
                            })
                            return
                          }

                          setDownloadProgress((prev) =>
                            prev ? { ...prev, stage: "finalizing" } : prev
                          )
                          updateProgressToast("Finalizing download...")

                          try {
                            const zipBlob = await zip.generateAsync({ type: 'blob' })

                            const url = URL.createObjectURL(zipBlob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `emoji-pack-${Date.now()}.zip`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            URL.revokeObjectURL(url)

                            progressToast.dismiss()
                            setDownloadProgress(null)
                            packBrowser.clearSelectionsAndStorage()

                            toast({
                              title: "Download complete",
                              description: `Downloaded ${completed} emoji${completed > 1 ? 's' : ''} as zip file`,
                            })
                          } catch (error) {
                            console.error('Failed to create zip:', error)
                            progressToast.dismiss()
                            setDownloadProgress(null)
                            toast({
                              title: "Failed to create zip",
                              description: "Could not create zip file",
                              variant: "destructive",
                            })
                          }
                        }}
                        onSendToSlack={async () => {
                          updateCartOpen(false, 'sheet-action')
                          // Reuse the same upload logic
                          const selected = packBrowser.getSelectedEmojis()
                          if (selected.length === 0) return

                          const { uploadPackEmojiToSlack } = await import('@/lib/utils/slack-upload')

                          let successCount = 0
                          let failedCount = 0
                          const errors: string[] = []
                          const total = selected.length

                          setUploadProgress({ completed: 0, failed: 0, total, stage: "uploading" })

                          const uploadToast = toast({
                            title: "Uploading to Slack...",
                            description: `0/${total} (0%)`,
                            duration: Infinity,
                          })

                          const updateUploadToast = (message: string) => {
                            uploadToast.update({
                              id: uploadToast.id,
                              title: "Uploading to Slack...",
                              description: message,
                              duration: Infinity,
                            })
                          }

                          for (let i = 0; i < selected.length; i++) {
                            const emoji = selected[i]
                            try {
                              const effectiveName = packBrowser.getEffectiveName(emoji)
                              const result = await uploadPackEmojiToSlack(
                                emoji.imageURL,
                                effectiveName,
                                emoji.isAnimated
                              )

                              if (result.success) {
                                successCount++
                              } else {
                                failedCount++
                                errors.push(`${effectiveName}: ${result.error || 'Unknown error'}`)
                              }

                              const completed = successCount + failedCount
                              const percentage = Math.round((completed / total) * 100)
                              setUploadProgress((prev) =>
                                prev ? { ...prev, completed, failed: failedCount } : prev
                              )
                              updateUploadToast(`${completed}/${total} (${percentage}%) - ${successCount} succeeded${failedCount > 0 ? `, ${failedCount} failed` : ''}`)
                            } catch (error) {
                              const effectiveName = packBrowser.getEffectiveName(emoji)
                              console.error(`Failed to upload ${effectiveName}:`, error)
                              failedCount++
                              errors.push(`${effectiveName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
                            }
                          }

                          uploadToast.dismiss()
                          setUploadProgress((prev) => (prev ? { ...prev, stage: "complete" } : prev))

                          if (successCount > 0) {
                            packBrowser.clearSelectionsAndStorage()
                            toast({
                              title: "Upload complete",
                              description: `Successfully uploaded ${successCount} emoji${successCount > 1 ? 's' : ''} to Slack${failedCount > 0 ? `. ${failedCount} failed.` : ''}`,
                              duration: 8000,
                            })
                          }

                          if (failedCount > 0) {
                            console.error('Upload errors:', errors)
                            toast({
                              title: `${failedCount} upload${failedCount > 1 ? 's' : ''} failed`,
                              description: errors[0] || 'Unknown error',
                              variant: "destructive",
                            })
                          }

                          if (successCount > 0) {
                            setTimeout(() => setUploadProgress(null), 3000)
                          } else {
                            setUploadProgress(null)
                          }
                        }}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </div>

          </div>
        </div>
      </div>

      {((!hasSlack && !loading) || processedEmojis.length > 0) && (
        <div className="px-3 sm:px-4 lg:px-6 mt-4 sm:mt-6">
          <div className="rounded-xl bg-card border border-border shadow p-2 sm:p-4 space-y-4 sm:space-y-6">
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
                        asChild
                      >
                        <a 
                          href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2"
                        >
                          <ChromeIcon className="h-5 w-5 text-blue-500" />
                          Get Chrome Extension
                        </a>
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
              />
            )}
          </div>
        </div>
      )}

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
        onUpdateProcessedEmojis={setProcessedEmojis}
        emojiData={emojiData}
      />
      

      {/* Emoji Editor Modal */}
      <EmojiEditor
        emoji={editingEmoji}
        isOpen={editingEmoji !== null}
        onClose={handleCloseEditor}
        onSave={handleSaveEditedEmoji}
      />


      {/* GIF Frame Editor Modal */}
      {gifToEdit && (
        <GifFrameEditorCSS
          file={gifToEdit}
          isOpen={showGifEditor}
          onClose={() => {
            setShowGifEditor(false)
            
            // If gifToEdit is null, it means we already handled the export
            if (!gifToEdit) {
              return
            }
            
            const wasReEditing = isReEditingFromModal
            const hadProcessedEmojis = processedEmojis.length > 0
            const fileToProcess = gifToEdit // Save reference before clearing
            setGifToEdit(null)
            
            // If we were re-editing, show the processing modal again
            if (wasReEditing && hadProcessedEmojis) {
              setIsProcessing(true)
              setIsReEditingFromModal(false)
            } else if (fileToProcess) {
              // User canceled frame selection - continue processing the original file
              console.log('Frame editor canceled - processing original file without frame selection')
              setIsReEditingFromModal(false)
              
              // Mark this file as having failed frame extraction to avoid infinite loop
              const fileKey = `${fileToProcess.name}-${fileToProcess.size}-${fileToProcess.lastModified}`
              setFailedFrameExtraction(prev => new Set(prev).add(fileKey))
              
              // Use the main processFiles function to handle the complete flow
              // This will show the proper processing modal and handle large files correctly
              processFiles([fileToProcess])
            }
          }}
          onExport={handleGifExport}
        />
      )}

      {/* Upload Overlay Dialog */}
      <Dialog open={showUploadOverlay} onOpenChange={setShowUploadOverlay}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <div
            className={`flex flex-col items-center justify-center p-12 transition-all min-h-[400px] ${
              isDragging ? 'border-primary bg-primary/10 border-4' : 'border-dashed border-2'
            } m-6 rounded-xl`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => {
              handleDrop(e)
              if (selectedFiles.length > 0 || (e.dataTransfer.files && e.dataTransfer.files.length > 0)) {
                // Keep overlay open to show selected files
              }
            }}
          >
            {selectedFiles.length === 0 ? (
              <>
                <Upload className="mx-auto h-20 w-20 text-muted-foreground mb-6" />
                <h3 className="text-xl font-semibold mb-2">Drag and Drop Files Here</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                  Drop your images, videos, or GIFs to convert them to Slack emojis
                </p>
                <input
                  type="file"
                  id="file-upload-overlay"
                  className="hidden"
                  multiple
                  accept="image/*,video/*,.gif,.webp"
                  onChange={handleFileSelect}
                />
                <Button asChild size="lg">
                  <label htmlFor="file-upload-overlay" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Files
                  </label>
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Supports: JPG, PNG, GIF, WebP, MP4, MOV, WebM
                </p>
              </>
            ) : (
              <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-semibold text-lg">Selected Files ({selectedFiles.length})</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const fileCount = selectedFiles.length
                        const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
                        setSelectedFiles([])
                        track("Emoji Creator: All Files Cleared", {
                          fileCount: fileCount,
                          totalSize: totalSize
                        })
                      }}
                      disabled={isProcessing}
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={() => {
                        processFiles()
                        setShowUploadOverlay(false)
                      }}
                      disabled={isProcessing}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Process {selectedFiles.length}
                    </Button>
                  </div>
                </div>
                <ScrollArea className="max-h-[350px] -mx-2 px-2">
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => {
                      const Icon = getFileIcon(file)
                      const isImage = file.type.startsWith('image/')
                      const isVideo = file.type.startsWith('video/')
                      const previewUrl = isImage || isVideo ? URL.createObjectURL(file) : null

                      return (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          {previewUrl ? (
                            <div className="h-12 w-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                              {isImage ? (
                                <img
                                  src={previewUrl}
                                  alt={file.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <video
                                  src={previewUrl}
                                  className="h-full w-full object-cover"
                                  muted
                                />
                              )}
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFile(index)}
                            className="h-8 w-8 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
                <div className="flex justify-center pt-6 mt-6 border-t">
                  <input
                    type="file"
                    id="file-upload-overlay-more"
                    className="hidden"
                    multiple
                    accept="image/*,video/*,.gif,.webp"
                    onChange={handleFileSelect}
                  />
                  <Button asChild variant="outline" size="lg">
                    <label htmlFor="file-upload-overlay-more" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Add More Files
                    </label>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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