"use client"

import { Suspense, lazy, memo, useCallback } from "react"
import { Loader2 } from "lucide-react"
import type { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { useCreatePageContext } from "./CreatePageContext"
import { blobToDataURL } from "./useFileProcessing"
import { useTrack } from "@/lib/hooks/use-track"

// Dynamic imports for heavy processing components
const EmojiProcessingModal = lazy(() => import("@/components/emoji-processing-modal").then(module => ({ default: module.EmojiProcessingModal })))
const EmojiEditor = lazy(() => import("@/components/emoji-editor").then(module => ({ default: module.EmojiEditor })))
const GifFrameEditorCSS = lazy(() => import("@/components/gif-frame-editor-css").then(module => ({ default: module.GifFrameEditorCSS })))

// Loading component for heavy operations
const ProcessingLoader = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-2 min-h-[200px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
)

interface CreatePageModalsProps {
  emojiData: any[]
  onProcessFiles: (files: File[]) => void
}

export const CreatePageModals = memo(function CreatePageModals({
  emojiData,
  onProcessFiles,
}: CreatePageModalsProps) {
  const {
    // Processing modal state
    isProcessing,
    setIsProcessing,
    processingFiles,
    setProcessingFiles,
    processedEmojis,
    setProcessedEmojis,
    currentFileIndex,
    currentStep,
    setCurrentStep,
    processingError,
    setProcessingError,
    selectedFiles,
    setSelectedFiles,

    // Editor state
    editingEmoji,
    setEditingEmoji,
    editingEmojiIndex,
    setEditingEmojiIndex,

    // GIF editor state
    gifToEdit,
    setGifToEdit,
    showGifEditor,
    setShowGifEditor,
    isReEditingFromModal,
    setIsReEditingFromModal,

    // Failed frame extraction tracking
    failedFrameExtraction,
    setFailedFrameExtraction,
  } = useCreatePageContext()
  const track = useTrack()

  // Handler: Modal close
  const handleModalClose = useCallback(() => {
    setIsProcessing(false)
    setCurrentStep('')
    setProcessingError('')
    setProcessingFiles([])
    setSelectedFiles([])
    setProcessedEmojis([])
    setIsReEditingFromModal(false)
  }, [setIsProcessing, setCurrentStep, setProcessingError, setProcessingFiles, setSelectedFiles, setProcessedEmojis, setIsReEditingFromModal])

  // Handler: Download single emoji
  const handleDownloadEmoji = useCallback(async (emoji: ProcessedEmoji) => {
    const { EmojiProcessor } = await import("@/lib/utils/emoji-processor")
    await EmojiProcessor.downloadEmoji(emoji)
    track("Emoji Creator: Single Emoji Downloaded", {
      emojiName: emoji.name,
      format: emoji.format,
      size: emoji.processedSize
    })
  }, [track])

  // Handler: Download all emojis
  const handleDownloadAll = useCallback(async () => {
    const { EmojiProcessor } = await import("@/lib/utils/emoji-processor")
    await EmojiProcessor.downloadAllEmojis(processedEmojis)
    track("Emoji Creator: All Emojis Downloaded", {
      emojiCount: processedEmojis.length,
      totalSize: processedEmojis.reduce((sum, e) => sum + e.processedSize, 0),
      formats: [...new Set(processedEmojis.map(e => e.format))]
    })
  }, [processedEmojis, track])

  // Handler: Update emoji name
  const handleUpdateEmojiName = useCallback((index: number, newName: string) => {
    setProcessedEmojis(prev => {
      const emoji = prev[index]
      if (emoji && emoji.name !== newName) {
        track("Emoji Creator: Emoji Name Updated", {
          oldName: emoji.name,
          newName: newName,
          format: emoji.format
        })
        return prev.map((e, i) =>
          i === index ? { ...e, name: newName } : e
        )
      }
      return prev
    })
  }, [setProcessedEmojis, track])

  // Handler: Remove processed emoji
  const handleRemoveProcessed = useCallback((index: number) => {
    setProcessedEmojis(prev => prev.filter((_, i) => i !== index))
  }, [setProcessedEmojis])

  // Handler: Edit emoji
  const handleEditEmoji = useCallback((emoji: ProcessedEmoji, index: number) => {
    setEditingEmoji(emoji)
    setEditingEmojiIndex(index)
    track("Emoji Creator: Edit Started", {
      emojiName: emoji.name,
      format: emoji.format,
      isGif: emoji.format === "GIF",
      wasVideo: emoji.wasVideo || false
    })
  }, [setEditingEmoji, setEditingEmojiIndex, track])

  // Handler: Edit GIF frames
  const handleEditGifFrames = useCallback((emoji: ProcessedEmoji, _index: number) => {
    setGifToEdit(emoji.originalFile)
    setShowGifEditor(true)
    setIsReEditingFromModal(true)
    setIsProcessing(false)

    track("Emoji Creator: GIF Frame Edit Started", {
      emojiName: emoji.name,
      originalSize: emoji.originalSize,
      processedSize: emoji.processedSize,
      isVideo: emoji.wasVideo || false
    })
  }, [setGifToEdit, setShowGifEditor, setIsReEditingFromModal, setIsProcessing, track])

  // Handler: Save edited emoji
  const handleSaveEditedEmoji = useCallback((editedEmoji: ProcessedEmoji) => {
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
  }, [editingEmojiIndex, setProcessedEmojis, setEditingEmoji, setEditingEmojiIndex, track])

  // Handler: Close editor
  const handleCloseEditor = useCallback(() => {
    setEditingEmoji(null)
    setEditingEmojiIndex(-1)
  }, [setEditingEmoji, setEditingEmojiIndex])

  // Handler: GIF export
  const handleGifExport = useCallback(async (blob: Blob, selectedFrames: number[], speedMultiplier: number) => {
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
        const newEmojis = [...prev]
        const existingIndex = newEmojis.findIndex(e => e.originalFile === originalFile)
        if (existingIndex >= 0) {
          newEmojis[existingIndex] = processedEmoji
        } else {
          newEmojis.push(processedEmoji)
        }
        return newEmojis
      })

      setIsProcessing(true)
      setIsReEditingFromModal(false)
    } else {
      // Normal flow - new file being processed
      setProcessedEmojis([processedEmoji])
      setProcessingFiles([originalFile])
      setCurrentStep('completed')
      setIsProcessing(true)
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
  }, [
    gifToEdit,
    isReEditingFromModal,
    setFailedFrameExtraction,
    setGifToEdit,
    setSelectedFiles,
    setProcessedEmojis,
    setProcessingFiles,
    setCurrentStep,
    setIsProcessing,
    setShowGifEditor,
    setIsReEditingFromModal,
    track
  ])

  // Handler: GIF editor close
  const handleGifEditorClose = useCallback(() => {
    setShowGifEditor(false)

    // If gifToEdit is null, it means we already handled the export
    if (!gifToEdit) {
      return
    }

    const wasReEditing = isReEditingFromModal
    const hadProcessedEmojis = processedEmojis.length > 0
    const fileToProcess = gifToEdit
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
      onProcessFiles([fileToProcess])
    }
  }, [
    gifToEdit,
    isReEditingFromModal,
    processedEmojis.length,
    setShowGifEditor,
    setGifToEdit,
    setIsProcessing,
    setIsReEditingFromModal,
    setFailedFrameExtraction,
    onProcessFiles
  ])

  return (
    <>
      {/* Processing Modal */}
      <Suspense fallback={<ProcessingLoader message="Loading processor..." />}>
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
      </Suspense>

      {/* Emoji Editor Modal */}
      <Suspense fallback={<ProcessingLoader message="Loading editor..." />}>
        <EmojiEditor
          emoji={editingEmoji}
          isOpen={editingEmoji !== null}
          onClose={handleCloseEditor}
          onSave={handleSaveEditedEmoji}
        />
      </Suspense>

      {/* GIF Frame Editor Modal */}
      {gifToEdit && (
        <Suspense fallback={<ProcessingLoader message="Loading frame editor..." />}>
          <GifFrameEditorCSS
            file={gifToEdit}
            isOpen={showGifEditor}
            onClose={handleGifEditorClose}
            onExport={handleGifExport}
          />
        </Suspense>
      )}
    </>
  )
})
