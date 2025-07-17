"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, Loader2, AlertCircle, Sparkles, FileImage, Wand2, Download, Pencil, Check, X } from "lucide-react"
import { ProcessedEmoji } from "@/lib/utils/emoji-processor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBytes } from "@/lib/utils"

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
  onUpdateName
}: EmojiProcessingModalProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [steps, setSteps] = useState<ProcessingStep[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")

  useEffect(() => {
    setMounted(true)
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

  const modalContent = (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isOpen ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
      }`}
      onClick={isProcessingComplete ? onClose : undefined}
    >
      <Card 
        className={`w-full max-w-md mx-4 border-border/50 shadow-2xl transition-all duration-300 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
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

        <CardContent className="space-y-4">
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
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                {processedEmojis.map((emoji, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="relative w-12 h-12 bg-checkered rounded overflow-hidden flex-shrink-0">
                      <img 
                        src={emoji.preview} 
                        alt={emoji.name}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
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
                          <div className="flex items-center gap-1 group">
                            <p className="text-sm font-medium truncate">{emoji.name}</p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleStartEdit(index, emoji.name)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {emoji.format} • {formatBytes(emoji.processedSize)}
                          </p>
                        </>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDownload(emoji)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                {processedEmojis.length > 1 && (
                  <Button 
                    className="flex-1" 
                    onClick={onDownloadAll}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download All ({processedEmojis.length})
                  </Button>
                )}
                <Button 
                  variant={processedEmojis.length > 1 ? "outline" : "default"}
                  className={processedEmojis.length === 1 ? "flex-1" : ""}
                  onClick={onClose}
                >
                  Done
                </Button>
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