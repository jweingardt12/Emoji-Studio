"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShineBorder } from "@/src/components/magicui/shine-border"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, Loader2, AlertCircle, Sparkles, FileImage, Download, Check, X, Send, XCircle, Pencil, Sliders, ListChecks, Save } from "lucide-react"
import { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBytes, formatSlackEmojiDisplay } from "@/lib/utils"
import { uploadEmojiToSlack, hasSlackConnection } from "@/lib/utils/slack-upload"
import { toast } from "sonner"
import Link from "next/link"
import { useTrack } from "@/lib/hooks/use-track"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { SparklesText } from "@/src/components/magicui/sparkles-text"
import { isEmojiNameAvailable, type Emoji } from "@/lib/services/emoji-service"

interface ProcessingStep {
  id: string
  label: string
  description?: string
  status: 'pending' | 'active' | 'completed' | 'error'
  error?: string
}

interface EmojiProcessingModalProps {
  isOpen: boolean
  files: File[]
  processedEmojis: ProcessedEmoji[]
  currentFileIndex: number
  currentStep: string
  error?: string
  onClose: () => void
  onDownload: (emoji: ProcessedEmoji) => void
  onDownloadAll: () => void
  onUpdateName?: (index: number, newName: string) => void
  onEdit?: (emoji: ProcessedEmoji, index: number) => void
  onEditGifFrames?: (emoji: ProcessedEmoji, index: number) => void
  onUpdateProcessedEmojis?: (emojis: ProcessedEmoji[]) => void
  emojiData?: Emoji[] // Optional workspace emoji data for name checking
}

export function EmojiProcessingModal({
  isOpen,
  files,
  processedEmojis,
  currentFileIndex,
  currentStep,
  error,
  onClose,
  onDownload,
  onDownloadAll,
  onUpdateName,
  onEdit,
  onEditGifFrames,
  onUpdateProcessedEmojis,
  emojiData
}: EmojiProcessingModalProps) {
  const track = useTrack();
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [steps, setSteps] = useState<ProcessingStep[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadingAll, setUploadingAll] = useState(false)
  const [hasSlack, setHasSlack] = useState(false)
  const [uploadStatuses, setUploadStatuses] = useState<Record<number, 'success' | 'failed' | 'pending'>>({})
  const [showEIModal, setShowEIModal] = useState(false)
  const [eiAnalyses, setEiAnalyses] = useState<any[] | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [nameStatuses, setNameStatuses] = useState<Record<number, 'checking' | 'available' | 'taken'>>({})

  useEffect(() => {
    setMounted(true)
    setHasSlack(hasSlackConnection())
    return () => setMounted(false)
  }, [])

  // Check name availability when processing completes
  useEffect(() => {
    const isComplete = currentStep === 'completed'
    if (!isComplete || processedEmojis.length === 0 || !hasSlack || !emojiData) return

    const checkNames = async () => {
      for (let i = 0; i < processedEmojis.length; i++) {
        setNameStatuses(prev => ({ ...prev, [i]: 'checking' }))

        const isAvailable = await isEmojiNameAvailable(processedEmojis[i].name, emojiData)

        setNameStatuses(prev => ({
          ...prev,
          [i]: isAvailable ? 'available' : 'taken'
        }))
      }
    }

    checkNames()
  }, [currentStep, processedEmojis, hasSlack, emojiData])

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
    } else {
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || files.length === 0) return

    const currentFile = files[currentFileIndex]
    if (!currentFile) return

    const isVideo = currentFile.type.startsWith('video/')
    
    const newSteps: ProcessingStep[] = [
      {
        id: 'loading',
        label: 'Loading file',
        description: currentFile.name,
        status: 'completed'
      },
      {
        id: 'analyzing',
        label: 'Analyzing content',
        description: isVideo ? 'Detecting video properties' : 'Reading image dimensions',
        status: currentStep === 'analyzing' ? 'active' : 
                currentStep === 'loading' ? 'pending' : 'completed'
      },
      {
        id: 'processing',
        label: isVideo ? 'Converting to GIF' : 'Optimizing image',
        description: isVideo ? 'Adjusting quality to fit 128KB' : 'Resizing and compressing',
        status: currentStep === 'processing' ? 'active' : 
                ['loading', 'analyzing'].includes(currentStep) ? 'pending' : 'completed'
      },
      {
        id: 'finalizing',
        label: 'Finalizing emoji',
        description: 'Preparing for Slack',
        status: currentStep === 'finalizing' ? 'active' : 
                ['loading', 'analyzing', 'processing'].includes(currentStep) ? 'pending' : 'completed'
      }
    ]

    if (error) {
      const errorStepIndex = newSteps.findIndex(s => s.id === currentStep)
      if (errorStepIndex !== -1) {
        newSteps[errorStepIndex].status = 'error'
        newSteps[errorStepIndex].error = error
      }
    }

    setSteps(newSteps)
  }, [files, currentFileIndex, currentStep, error, isOpen])

  const openEIModalThenEdit = () => {
    setShowEIModal(true)
    track("Emoji Intelligence: Modal Opened (Pre-Edit)", {
      emojiCount: processedEmojis.length,
    })
  }

  if (!mounted || !visible) return null

  const currentFile = files[currentFileIndex]
  const isProcessingComplete = currentStep === 'completed'
  const progress = isProcessingComplete ? 100 : Math.min(99, ((currentFileIndex + 0.5) / files.length) * 100)

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index)
    setEditingName(currentName)
  }

  const handleSaveEdit = async (index: number) => {
    if (editingName.trim() && onUpdateName) {
      onUpdateName(index, editingName.trim())

      // Re-check name availability after edit
      if (hasSlack && emojiData) {
        setNameStatuses(prev => ({ ...prev, [index]: 'checking' }))
        const isAvailable = await isEmojiNameAvailable(editingName.trim(), emojiData)
        setNameStatuses(prev => ({
          ...prev,
          [index]: isAvailable ? 'available' : 'taken'
        }))
      }
    }
    setEditingIndex(null)
    setEditingName("")
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditingName("")
  }

  const handleSlackUpload = async (emoji: ProcessedEmoji, index: number, customName?: string) => {
    console.log("[handleSlackUpload] Starting upload for emoji at index:", index, "name:", customName || emoji.name)
    setUploadingIndex(index)

    track("Slack Upload: Started", {
      emojiName: customName || emoji.name,
      format: emoji.format,
      size: emoji.processedSize,
      wasVideo: emoji.wasVideo || false,
      isBulkUpload: uploadingAll
    })

    try {
      console.log("[handleSlackUpload] Calling uploadEmojiToSlack...")
      const result = await uploadEmojiToSlack(emoji, customName)
      console.log("[handleSlackUpload] Upload result:", result)
      
      if (result.success) {
        toast.success(`Emoji ":${result.emojiName}:" uploaded to Slack`)
        setUploadStatuses(prev => ({ ...prev, [index]: 'success' }))
        
        track("Slack Upload: Success", {
          emojiName: result.emojiName,
          originalName: emoji.name,
          format: emoji.format,
          size: emoji.processedSize,
          wasVideo: emoji.wasVideo || false,
          isBulkUpload: uploadingAll
        })
        
        // If this is a single emoji upload (not part of bulk upload)
        if (!uploadingAll) {
          // If this was the last emoji, close the modal
          if (processedEmojis.length === 1) {
            setTimeout(() => {
              onClose()
            }, 1000) // Give user time to see the success message
          } else if (index < processedEmojis.length - 1) {
            // Find the next emoji that hasn't been uploaded yet
            let nextIndex = index + 1
            while (nextIndex < processedEmojis.length && uploadStatuses[nextIndex] === 'success') {
              nextIndex++
            }
            if (nextIndex < processedEmojis.length) {
              setTimeout(() => {
                handleSlackUpload(processedEmojis[nextIndex], nextIndex)
              }, 500)
            } else {
              // All emojis uploaded, close modal
              setTimeout(() => {
                onClose()
              }, 1000)
            }
          } else {
            // Check if all emojis have been uploaded
            const allUploaded = processedEmojis.every((_, i) => uploadStatuses[i] === 'success')
            if (allUploaded) {
              setTimeout(() => {
                onClose()
              }, 1000)
            }
          }
        }
      } else {
        setUploadStatuses(prev => ({ ...prev, [index]: 'failed' }))
        // Check if it's a name taken error
        if (result.error?.includes("already taken")) {
          toast.error(result.error, {
            action: {
              label: "Rename",
              onClick: () => handleStartEdit(index, emoji.name)
            }
          })
          
          track("Slack Upload: Failed - Name Taken", {
            emojiName: customName || emoji.name,
            format: emoji.format,
            isBulkUpload: uploadingAll
          })
        } else {
          toast.error(result.error || "Failed to upload emoji to Slack")
          
          track("Slack Upload: Failed", {
            emojiName: customName || emoji.name,
            format: emoji.format,
            error: result.error || "Unknown error",
            isBulkUpload: uploadingAll
          })
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      setUploadStatuses(prev => ({ ...prev, [index]: 'failed' }))
      
      track("Slack Upload: Error", {
        emojiName: customName || emoji.name,
        format: emoji.format,
        error: error instanceof Error ? error.message : "Unknown error",
        isBulkUpload: uploadingAll
      })
    } finally {
      if (!uploadingAll || index === processedEmojis.length - 1) {
        setUploadingIndex(null)
      }
    }
  }

  const modalContent = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ease-out ${
        isOpen ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
      onClick={isProcessingComplete ? onClose : undefined}
    >
      <div
        className={`relative w-full max-w-2xl mx-2 sm:mx-4 transition-all duration-300 ease-out ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        } ${isProcessingComplete ? 'bg-blue-500/30 p-[2px] rounded-xl' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isProcessingComplete && (
          <div 
            className="absolute inset-0 rounded-xl"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(147, 197, 253, 0.5) 20%, rgba(147, 197, 253, 0.8) 50%, rgba(147, 197, 253, 0.5) 80%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'shine-border 4s linear infinite',
              maskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMaskImage: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              padding: '2px'
            }}
          />
        )}
        <Card className={`relative ${isProcessingComplete ? 'border-0' : 'border-border/50'} shadow-2xl rounded-xl max-h-[85vh] sm:max-h-[90vh] flex flex-col bg-card overflow-hidden`}>
          {isProcessingComplete && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1 h-7 w-7 z-10"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </Button>
        )}
        <CardHeader className="space-y-1 p-3 sm:p-4 pb-2 sm:pb-3 border-b bg-background/80 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-full flex-shrink-0 bg-gradient-to-br from-sky-500/15 to-emerald-500/15">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-sky-400" />
            </div>
            <div className="min-w-0 pr-6">
              <CardTitle className="text-base sm:text-lg truncate">
                {isProcessingComplete ? 'Complete!' : 'Creating Emojis'}
              </CardTitle>
              <CardDescription className="text-xs truncate">
                {isProcessingComplete 
                  ? `${processedEmojis.length} emoji${processedEmojis.length > 1 ? 's' : ''} ready`
                  : files.length > 0 ? `${currentFileIndex + 1} of ${files.length}`
                  : 'Preparing...'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`p-3 sm:p-4 pt-2 sm:pt-3 space-y-3 ${processedEmojis.length > 2 ? 'overflow-y-auto flex-1' : ''}`}>
          {!isProcessingComplete && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                  <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] bg-[length:200%_100%]" />
                  <div className="relative h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {currentFile && (
                <div className="rounded-lg bg-muted/50 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{currentFile.name}</span>
                  </div>

                  <div className="space-y-2">
                    {steps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {step.status === 'completed' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {step.status === 'active' && (
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          )}
                          {step.status === 'pending' && (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          {step.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <p className={`text-sm leading-none ${
                            step.status === 'active' ? 'text-foreground font-medium' : 
                            step.status === 'completed' ? 'text-muted-foreground' :
                            step.status === 'error' ? 'text-red-500' :
                            'text-muted-foreground/60'
                          }`}>
                            {step.label}
                          </p>
                          {step.description && step.status === 'active' && (
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          )}
                          {step.error && (
                            <p className="text-xs text-red-500">{step.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isProcessingComplete && processedEmojis.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              <div className="space-y-1.5 sm:space-y-2">
                {processedEmojis.map((emoji, index) => {
                  const isSelected = selectedIndices.has(index)
                  return (
                  <div key={index} className={`flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg transition-colors ${
                    uploadingAll && uploadingIndex === index ? 'bg-sky-500/10 ring-1 sm:ring-2 ring-sky-400/20' :
                    isSelected ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-muted/50'
                  }`}>
                    {selectionMode && (
                      <button
                        onClick={() => {
                          setSelectedIndices(prev => {
                            const next = new Set(prev)
                            if (next.has(index)) {
                              next.delete(index)
                            } else {
                              next.add(index)
                            }
                            return next
                          })
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </button>
                    )}
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-checkered rounded overflow-hidden flex-shrink-0">
                      <img 
                        src={emoji.blob || emoji.preview} 
                        alt={emoji.name}
                        className="absolute inset-0 w-full h-full object-contain"
                        loading="eager"
                        decoding="async"
                        style={{ imageRendering: 'auto' }}
                        key={`${emoji.name}-${index}-modal`}
                      />
                      {uploadingIndex === index && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      )}
                      {uploadStatuses[index] === 'success' && (
                        <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      {uploadStatuses[index] === 'failed' && (
                        <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
                          <XCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingIndex === index ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(index)
                              if (e.key === 'Escape') handleCancelEdit()
                            }}
                            className="h-6 text-xs"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={() => handleSaveEdit(index)}
                          >
                            <Check className="h-3 w-3" />
                            <span className="sr-only">Save name</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Cancel editing</span>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="text-left flex items-center gap-0.5 group"
                            onClick={() => handleStartEdit(index, emoji.name)}
                          >
                            <p className="text-xs sm:text-sm font-medium truncate font-mono hover:text-primary cursor-pointer">{formatSlackEmojiDisplay(emoji.name)}</p>
                            <Pencil className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </button>
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {emoji.format} • {formatBytes(emoji.processedSize)}
                              {uploadStatuses[index] === 'failed' && (
                                <span className="text-red-500 ml-1">• Failed</span>
                              )}
                            </p>
                            {hasSlack && nameStatuses[index] === 'checking' && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                • <Loader2 className="h-2.5 w-2.5 animate-spin" /> Checking name
                              </span>
                            )}
                            {hasSlack && nameStatuses[index] === 'taken' && (
                              <span className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                                • <AlertCircle className="h-2.5 w-2.5" /> Name already taken
                              </span>
                            )}
                            {hasSlack && nameStatuses[index] === 'available' && (
                              <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                                • <CheckCircle2 className="h-2.5 w-2.5" /> Available
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {onEdit && emoji.format !== 'GIF' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => onEdit(emoji, index)}
                          title="Edit emoji"
                        >
                          <Sliders className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="sr-only">Edit emoji</span>
                        </Button>
                      )}
                      {onEditGifFrames && emoji.format === 'GIF' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 sm:h-7 sm:w-7"
                          onClick={() => onEditGifFrames(emoji, index)}
                          title="Edit GIF frames"
                        >
                          <Sliders className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="sr-only">Edit GIF frames</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )})}

              </div>

              <div className="space-y-2 pt-1 sm:pt-2">
                {/* Selection controls for multiple emojis */}
                {processedEmojis.length > 1 && (
                  <div className="flex items-center justify-between px-1 pb-1 border-b">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectionMode(!selectionMode)}
                        className="h-8"
                      >
                        <ListChecks className={`h-4 w-4 mr-1.5 ${selectionMode ? 'text-primary' : ''}`} />
                        <span className="text-xs">Select</span>
                      </Button>
                      {selectionMode && selectedIndices.size > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">
                            {selectedIndices.size} selected
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedIndices(new Set())}
                            className="h-7 text-xs"
                          >
                            Clear
                          </Button>
                        </>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        // Save as pack functionality (placeholder)
                        toast.success("Pack feature coming soon!")
                      }}
                      className="h-8"
                    >
                      <Save className="h-4 w-4 mr-1.5" />
                      <span className="text-xs">Save as Pack</span>
                    </Button>
                  </div>
                )}
                {processedEmojis.length === 1 ? (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex gap-2">
                        {onEdit && processedEmojis[0].format !== 'GIF' && (
                          <Button 
                            size="sm"
                            className="flex-1 h-9" 
                            onClick={() => onEdit(processedEmojis[0], 0)}
                            variant="outline"
                          >
                            <Sliders className="mr-1 h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        )}
                        {onEditGifFrames && processedEmojis[0].format === 'GIF' && (
                          <Button 
                            size="sm"
                            className="flex-1 h-9" 
                            onClick={() => onEditGifFrames(processedEmojis[0], 0)}
                            variant="outline"
                          >
                            <Sliders className="mr-1 h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit Frames</span>
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          className="flex-1 h-9" 
                          onClick={() => onDownload(processedEmojis[0])}
                          variant="outline"
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Download</span>
                          <span className="sm:hidden">Save</span>
                        </Button>
                      </div>
                      <Button 
                        size="sm"
                        className="flex-1 h-9" 
                        onClick={() => hasSlack ? handleSlackUpload(processedEmojis[0], 0) : undefined}
                        disabled={!hasSlack || uploadingIndex !== null}
                      >
                        {uploadingIndex !== null ? (
                          <>
                            <div className="mr-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="text-sm">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Send className="mr-1 h-3.5 w-3.5" />
                            <span className="text-sm">Send to Slack</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      size="sm"
                      className="flex-1 h-9" 
                      onClick={onDownloadAll}
                      variant="outline"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      <span className="text-sm">Download All ({processedEmojis.length})</span>
                    </Button>
                    {/* EI consolidated into the editor; no separate optimize button */}
                    <Button 
                      size="sm"
                      className="flex-1 h-9"
                      onClick={async () => {
                        if (hasSlack) {
                          setUploadingAll(true)
                          let successCount = 0
                          let failedEmojis: string[] = []
                          
                          // Track bulk upload start
                          const isRetry = Object.values(uploadStatuses).some(status => status === 'failed')
                          const remainingCount = processedEmojis.filter((_, i) => uploadStatuses[i] !== 'success').length
                          
                          track("Slack Upload: Bulk Started", {
                            totalEmojis: processedEmojis.length,
                            remainingEmojis: remainingCount,
                            isRetry: isRetry,
                            totalSize: processedEmojis.reduce((sum, e) => sum + e.processedSize, 0),
                            formats: [...new Set(processedEmojis.map(e => e.format))]
                          })
                          
                          for (let i = 0; i < processedEmojis.length; i++) {
                            // Skip emojis that have already been successfully uploaded
                            if (uploadStatuses[i] === 'success') {
                              successCount++
                              continue
                            }
                            
                            setUploadingIndex(i)
                            try {
                              const result = await uploadEmojiToSlack(processedEmojis[i])
                              if (result.success) {
                                successCount++
                                setUploadStatuses(prev => ({ ...prev, [i]: 'success' }))
                              } else {
                                failedEmojis.push(processedEmojis[i].name)
                                setUploadStatuses(prev => ({ ...prev, [i]: 'failed' }))
                              }
                            } catch (error) {
                              failedEmojis.push(processedEmojis[i].name)
                              setUploadStatuses(prev => ({ ...prev, [i]: 'failed' }))
                            }
                          }
                          
                          setUploadingIndex(null)
                          setUploadingAll(false)
                          
                          if (successCount === processedEmojis.length) {
                            toast.success(`Successfully uploaded ${successCount} emojis to Slack`)
                            
                            track("Slack Upload: Bulk Complete - Success", {
                              totalEmojis: processedEmojis.length,
                              successCount: successCount,
                              totalSize: processedEmojis.reduce((sum, e) => sum + e.processedSize, 0),
                              formats: [...new Set(processedEmojis.map(e => e.format))]
                            })
                            
                            // Close modal after successful bulk upload
                            setTimeout(() => {
                              onClose()
                            }, 1500)
                          } else if (successCount > 0) {
                            toast.warning(`Uploaded ${successCount} of ${processedEmojis.length} emojis. Failed: ${failedEmojis.join(", ")}`)
                            
                            track("Slack Upload: Bulk Complete - Partial", {
                              totalEmojis: processedEmojis.length,
                              successCount: successCount,
                              failedCount: failedEmojis.length,
                              failedEmojis: failedEmojis
                            })
                          } else {
                            toast.error("Failed to upload emojis to Slack")
                            
                            track("Slack Upload: Bulk Complete - Failed", {
                              totalEmojis: processedEmojis.length,
                              failedEmojis: failedEmojis
                            })
                          }
                        }
                      }}
                      disabled={!hasSlack || uploadingAll}
                    >
                      {uploadingAll ? (
                        <>
                          <div className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span className="text-sm">
                            {uploadingIndex !== null ? `${uploadingIndex + 1}/${processedEmojis.length}` : 'Uploading...'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Send className="mr-1.5 h-3.5 w-3.5" />
                          <span className="text-sm">
                            {Object.values(uploadStatuses).some(status => status === 'failed') ? 'Retry Failed' : 
                             Object.values(uploadStatuses).some(status => status === 'success') ? 'Send Rest' : 
                             'Send All'}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {!hasSlack && (
                  <div className="space-y-2 text-center px-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Want to send directly to Slack? Get our Chrome extension!
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa', '_blank')}
                      className="inline-flex items-center gap-2 h-8 text-xs sm:text-sm"
                    >
                      <ChromeIcon className="h-3.5 w-3.5 text-blue-500" />
                      Get Extension
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : isProcessingComplete && processedEmojis.length === 0 ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No emojis were processed successfully</p>
              <Button 
                variant="outline"
                className="mt-4"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      </div>
      
      {/* EI modal removed; handled inside editor */}
    </div>
  )

  return createPortal(modalContent, document.body)
}

// Add CSS for checkered background and animations
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('emoji-processing-modal-styles')
  if (!existingStyle) {
    const style = document.createElement('style')
    style.id = 'emoji-processing-modal-styles'
    style.textContent = `
      .bg-checkered {
        background-image: 
          linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
          linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
          linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
        background-size: 8px 8px;
        background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
      }
      .dark .bg-checkered {
        background-image: 
          linear-gradient(45deg, #2a2a2a 25%, transparent 25%),
          linear-gradient(-45deg, #2a2a2a 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #2a2a2a 75%),
          linear-gradient(-45deg, transparent 75%, #2a2a2a 75%);
      }
    `
    document.head.appendChild(style)
  }
}