"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, Loader2, AlertCircle, Sparkles, FileImage, Download, Check, X, Send, XCircle, Pencil, Sliders } from "lucide-react"
import { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBytes, formatSlackEmojiDisplay } from "@/lib/utils"
import { uploadEmojiToSlack, hasSlackConnection } from "@/lib/utils/slack-upload"
import { toast } from "sonner"
import Link from "next/link"
import { openpanel } from "@/lib/safe-openpanel"
import { ChromeIcon } from "@/components/icons/chrome-icon"

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
  onEditGifFrames
}: EmojiProcessingModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [steps, setSteps] = useState<ProcessingStep[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadingAll, setUploadingAll] = useState(false)
  const [hasSlack, setHasSlack] = useState(false)
  const [uploadStatuses, setUploadStatuses] = useState<Record<number, 'success' | 'failed' | 'pending'>>({})

  useEffect(() => {
    setMounted(true)
    setHasSlack(hasSlackConnection())
    return () => setMounted(false)
  }, [])

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

  if (!mounted || !visible) return null

  const currentFile = files[currentFileIndex]
  const isProcessingComplete = currentStep === 'completed'
  const progress = isProcessingComplete ? 100 : Math.min(99, ((currentFileIndex + 0.5) / files.length) * 100)

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index)
    setEditingName(currentName)
  }

  const handleSaveEdit = (index: number) => {
    if (editingName.trim() && onUpdateName) {
      onUpdateName(index, editingName.trim())
    }
    setEditingIndex(null)
    setEditingName("")
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditingName("")
  }

  const handleSlackUpload = async (emoji: ProcessedEmoji, index: number, customName?: string) => {
    setUploadingIndex(index)
    
    openpanel.track("Slack Upload: Started", {
      emojiName: customName || emoji.name,
      format: emoji.format,
      size: emoji.processedSize,
      wasVideo: emoji.wasVideo || false,
      isBulkUpload: uploadingAll
    })
    
    try {
      const result = await uploadEmojiToSlack(emoji, customName)
      
      if (result.success) {
        toast.success(`Emoji ":${result.emojiName}:" uploaded to Slack`)
        setUploadStatuses(prev => ({ ...prev, [index]: 'success' }))
        
        openpanel.track("Slack Upload: Success", {
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
          
          openpanel.track("Slack Upload: Failed - Name Taken", {
            emojiName: customName || emoji.name,
            format: emoji.format,
            isBulkUpload: uploadingAll
          })
        } else {
          toast.error(result.error || "Failed to upload emoji to Slack")
          
          openpanel.track("Slack Upload: Failed", {
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
      
      openpanel.track("Slack Upload: Error", {
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
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isOpen ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
      onClick={isProcessingComplete ? onClose : undefined}
    >
      <Card 
        className={`relative w-full max-w-lg mx-4 border-border/50 shadow-2xl transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        } ${processedEmojis.length > 3 ? 'max-h-[90vh] overflow-hidden flex flex-col' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {isProcessingComplete && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-2 h-8 w-8 z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isProcessingComplete ? 'Processing Complete!' : 'Creating Slack Emojis'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isProcessingComplete 
                  ? `Successfully processed ${processedEmojis.length} emoji${processedEmojis.length > 1 ? 's' : ''}`
                  : files.length > 0 ? `Processing ${currentFileIndex + 1} of ${files.length} file${files.length > 1 ? 's' : ''}`
                  : 'Preparing to process files...'
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`space-y-4 ${processedEmojis.length > 3 ? 'overflow-y-auto flex-1' : ''}`}>
          {!isProcessingComplete && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
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
            <div className="space-y-3">
              <div className="space-y-2">
                {processedEmojis.map((emoji, index) => (
                  <div key={index} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    uploadingAll && uploadingIndex === index ? 'bg-primary/10 ring-2 ring-primary/20' : 'bg-muted/50'
                  }`}>
                    <div className="relative w-12 h-12 bg-checkered rounded overflow-hidden flex-shrink-0">
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
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="text-left flex items-center gap-1 group"
                            onClick={() => handleStartEdit(index, emoji.name)}
                          >
                            <p className="text-sm font-medium truncate font-mono hover:text-primary cursor-pointer">{formatSlackEmojiDisplay(emoji.name)}</p>
                            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {emoji.format} • {formatBytes(emoji.processedSize)}
                            {uploadStatuses[index] === 'failed' && (
                              <span className="text-red-500 ml-2">• Failed to upload</span>
                            )}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {onEdit && emoji.format !== 'GIF' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onEdit(emoji, index)}
                          title="Edit emoji"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {onEditGifFrames && emoji.format === 'GIF' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => onEditGifFrames(emoji, index)}
                          title="Edit GIF frames"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                {processedEmojis.length === 1 ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {onEdit && processedEmojis[0].format !== 'GIF' && (
                        <Button 
                          size="sm"
                          className="flex-1" 
                          onClick={() => onEdit(processedEmojis[0], 0)}
                          variant="outline"
                        >
                          <Sliders className="mr-1.5 h-4 w-4" />
                          Edit
                        </Button>
                      )}
                      {onEditGifFrames && processedEmojis[0].format === 'GIF' && (
                        <Button 
                          size="sm"
                          className="flex-1" 
                          onClick={() => onEditGifFrames(processedEmojis[0], 0)}
                          variant="outline"
                        >
                          <Sliders className="mr-1.5 h-4 w-4" />
                          Edit Frames
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        className="flex-1" 
                        onClick={() => onDownload(processedEmojis[0])}
                        variant="outline"
                      >
                        <Download className="mr-1.5 h-4 w-4" />
                        Download
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1" 
                        onClick={() => hasSlack ? handleSlackUpload(processedEmojis[0], 0) : undefined}
                        disabled={!hasSlack || uploadingIndex !== null}
                      >
                        {uploadingIndex !== null ? (
                          <>
                            <div className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Send className="mr-1.5 h-4 w-4" />
                            Send to Slack
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      className="flex-1" 
                      onClick={onDownloadAll}
                      variant="outline"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download All ({processedEmojis.length})
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1"
                      onClick={async () => {
                        if (hasSlack) {
                          setUploadingAll(true)
                          let successCount = 0
                          let failedEmojis: string[] = []
                          
                          // Track bulk upload start
                          const isRetry = Object.values(uploadStatuses).some(status => status === 'failed')
                          const remainingCount = processedEmojis.filter((_, i) => uploadStatuses[i] !== 'success').length
                          
                          openpanel.track("Slack Upload: Bulk Started", {
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
                            
                            openpanel.track("Slack Upload: Bulk Complete - Success", {
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
                            
                            openpanel.track("Slack Upload: Bulk Complete - Partial", {
                              totalEmojis: processedEmojis.length,
                              successCount: successCount,
                              failedCount: failedEmojis.length,
                              failedEmojis: failedEmojis
                            })
                          } else {
                            toast.error("Failed to upload emojis to Slack")
                            
                            openpanel.track("Slack Upload: Bulk Complete - Failed", {
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
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          {uploadingIndex !== null ? `Uploading ${uploadingIndex + 1}/${processedEmojis.length}...` : 'Uploading...'}
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          {Object.values(uploadStatuses).some(status => status === 'failed') ? 'Retry Failed Uploads' : 
                           Object.values(uploadStatuses).some(status => status === 'success') ? 'Send Remaining to Slack' : 
                           'Send All to Slack'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {!hasSlack && (
                  <div className="space-y-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Want to send emojis directly to Slack? Install our Chrome extension to easily import emojis from any website!
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa', '_blank')}
                      className="inline-flex items-center gap-2"
                    >
                      <ChromeIcon className="h-4 w-4 text-blue-500" />
                      Get Chrome Extension
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