"use client"

import { useCallback } from "react"
import { EmojiProcessor, type ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { VideoFrameExtractor } from "@/lib/utils/video-frame-extractor"
import { useTrack } from "@/lib/hooks/use-track"

// Helper function to check if a file is an animated WebP
async function isAnimatedWebP(file: File): Promise<boolean> {
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
      if (bytes[i] === 0x41 && bytes[i + 1] === 0x4E && bytes[i + 2] === 0x49 && bytes[i + 3] === 0x4D) {
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
async function isGifFile(file: File): Promise<boolean> {
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

interface UseFileProcessingOptions {
  selectedFiles: File[]
  failedFrameExtraction: Set<string>
  setProcessingFiles: React.Dispatch<React.SetStateAction<File[]>>
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>
  setCurrentFileIndex: React.Dispatch<React.SetStateAction<number>>
  setCurrentStep: React.Dispatch<React.SetStateAction<string>>
  setProcessingError: React.Dispatch<React.SetStateAction<string>>
  setProcessedEmojis: React.Dispatch<React.SetStateAction<ProcessedEmoji[]>>
  setGifToEdit: React.Dispatch<React.SetStateAction<File | null>>
  setShowGifEditor: React.Dispatch<React.SetStateAction<boolean>>
  setFailedFrameExtraction: React.Dispatch<React.SetStateAction<Set<string>>>
}

export function useFileProcessing({
  selectedFiles,
  failedFrameExtraction,
  setProcessingFiles,
  setIsProcessing,
  setCurrentFileIndex,
  setCurrentStep,
  setProcessingError,
  setProcessedEmojis,
  setGifToEdit,
  setShowGifEditor,
  setFailedFrameExtraction,
}: UseFileProcessingOptions) {
  const track = useTrack()

  const processFiles = useCallback(async (filesToProcess?: File[]) => {
    const files = filesToProcess || selectedFiles
    if (files.length === 0) return

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
        // Minimal delay for UI state to render
        await new Promise(resolve => setTimeout(resolve, 50))

        setCurrentStep('analyzing')
        await new Promise(resolve => setTimeout(resolve, 50))

        setCurrentStep('processing')

        // Check if this is a video file that needs frame selection
        const isVideo = file.type.startsWith('video/')
        if (isVideo) {
          try {
            const videoInfo = await VideoFrameExtractor.getVideoInfo(file)

            // If video would produce more than 50 frames, show frame editor
            if (videoInfo.frameCount > 50) {
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
            if (!frameEditorDisabled && !meetsRequirements && file.size > 50 * 1024 && file.size < 100 * 1024 * 1024) {
              // Additional check for extremely large dimensions
              if (img.width > 10000 || img.height > 10000) {
                // Process normally without frame editor
              } else {
                // Check if we've already failed to extract frames for this file
                const fileKey = `${file.name}-${file.size}-${file.lastModified}`
                if (failedFrameExtraction.has(fileKey)) {
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
        await new Promise(resolve => setTimeout(resolve, 50))

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
        await new Promise(resolve => setTimeout(resolve, 1000))
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
  }, [
    selectedFiles,
    failedFrameExtraction,
    setProcessingFiles,
    setIsProcessing,
    setCurrentFileIndex,
    setCurrentStep,
    setProcessingError,
    setProcessedEmojis,
    setGifToEdit,
    setShowGifEditor,
    track
  ])

  return { processFiles }
}

// Helper for blobToDataURL
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
