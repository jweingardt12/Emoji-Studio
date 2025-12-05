"use client"

import { useState } from "react"
import { ProcessedEmoji, EmojiProcessor } from "@/lib/utils/emoji-processor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, X, CheckCircle, AlertCircle, Check, Send, Pencil, Sliders } from "lucide-react"
import { formatBytes, formatSlackEmojiDisplay } from "@/lib/utils"
import { uploadEmojiToSlack, hasSlackConnection } from "@/lib/utils/slack-upload"
import { toast } from "sonner"
import { openpanel } from "@/lib/safe-openpanel"
import Link from "next/link"
import { ChromeIcon } from "@/components/icons/chrome-icon"

interface EmojiProcessorPreviewProps {
  emojis: ProcessedEmoji[]
  onRemove: (index: number) => void
  onDownload: (emoji: ProcessedEmoji) => void
  onDownloadAll: () => void
  onUpdateName: (index: number, newName: string) => void
  onEdit?: (emoji: ProcessedEmoji, index: number) => void
}

export function EmojiProcessorPreview({ 
  emojis, 
  onRemove, 
  onDownload,
  onDownloadAll,
  onUpdateName,
  onEdit
}: EmojiProcessorPreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [hasSlack, setHasSlack] = useState(hasSlackConnection())
  const [uploadedEmojis, setUploadedEmojis] = useState<Set<number>>(new Set())

  if (emojis.length === 0) return null

  const handleStartEdit = (index: number, currentName: string) => {
    setEditingIndex(index)
    setEditingName(currentName)
  }

  const handleSaveEdit = (index: number) => {
    if (editingName.trim()) {
      onUpdateName(index, editingName.trim())
    }
    setEditingIndex(null)
    setEditingName("")
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setEditingName("")
  }

  const handleSlackUpload = async (emoji: ProcessedEmoji, index: number) => {
    setUploadingIndex(index)
    
    openpanel.track("Slack Upload: Started", {
      emojiName: emoji.name,
      format: emoji.format,
      size: emoji.processedSize,
      wasVideo: emoji.wasVideo || false
    })
    
    try {
      const result = await uploadEmojiToSlack(emoji)
      
      if (result.success) {
        toast.success(`Emoji ":${result.emojiName}:" uploaded to Slack`)
        
        // Mark this emoji as uploaded
        setUploadedEmojis(prev => new Set(prev).add(index))
        
        openpanel.track("Slack Upload: Success", {
          emojiName: result.emojiName,
          originalName: emoji.name,
          format: emoji.format,
          size: emoji.processedSize,
          wasVideo: emoji.wasVideo || false
        })
      } else {
        // Check if it's a name taken error
        if (result.error?.includes("already taken")) {
          toast.error(result.error, {
            action: {
              label: "Rename",
              onClick: () => handleStartEdit(index, emoji.name)
            }
          })
          
          openpanel.track("Slack Upload: Failed - Name Taken", {
            emojiName: emoji.name,
            format: emoji.format
          })
        } else {
          toast.error(result.error || "Failed to upload emoji to Slack")
          
          openpanel.track("Slack Upload: Failed", {
            emojiName: emoji.name,
            format: emoji.format,
            error: result.error || "Unknown error"
          })
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      
      openpanel.track("Slack Upload: Error", {
        emojiName: emoji.name,
        format: emoji.format,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setUploadingIndex(null)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle>Processed Emojis ({emojis.length})</CardTitle>
        {emojis.length > 1 && (
          <Button size="sm" onClick={onDownloadAll}>
            <Download className="w-4 h-4 mr-1.5" />
            Download All
          </Button>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden">
          {emojis.map((emoji, index) => (
            <div 
              key={index} 
              className="relative group border rounded-lg p-4 hover:bg-accent/50 transition-colors overflow-hidden"
            >
              <button
                onClick={() => onRemove(index)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove emoji"
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="relative w-16 h-16 bg-checkered rounded overflow-hidden">
                    <img 
                      src={emoji.blob || emoji.preview} // Use data URL if available, fallback to object URL
                      alt={emoji.name}
                      className="absolute inset-0 w-full h-full object-contain"
                      loading="eager"
                      decoding="async"
                      style={{ imageRendering: 'auto' }}
                      key={`${emoji.name}-${index}-${emoji.blob?.substring(0, 50)}`} // Force re-render with unique key
                    />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(index)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="h-7 text-sm"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => handleSaveEdit(index)}
                      >
                        <Check className="h-3 w-3" />
                        <span className="sr-only">Save name</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Cancel editing</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        className="text-left flex-1 min-w-0 overflow-hidden"
                        onClick={() => handleStartEdit(index, emoji.name)}
                      >
                        <h4 className="font-medium truncate font-mono hover:text-primary cursor-pointer">{formatSlackEmojiDisplay(emoji.name)}</h4>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => handleStartEdit(index, emoji.name)}
                        title="Edit name"
                      >
                        <Pencil className="h-3 w-3" />
                        <span className="sr-only">Edit name</span>
                      </Button>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground space-y-1 mt-1">
                    <div className="flex items-center gap-1">
                      {emoji.processedSize <= EmojiProcessor['MAX_FILE_SIZE'] ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-yellow-500" />
                      )}
                      <span>
                        {formatBytes(emoji.processedSize)} 
                        <span className="text-muted-foreground/70">
                          {" "}(was {formatBytes(emoji.originalSize)})
                        </span>
                      </span>
                    </div>
                    <div>{emoji.format} • {emoji.dimensions.width}×{emoji.dimensions.height}</div>
                    {emoji.processingNote && (
                      <div className="text-xs italic text-muted-foreground/80">
                        {emoji.processingNote}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                {hasSlack ? (
                  <>
                    {/* First row: Edit and Download */}
                    <div className="flex gap-2">
                      {onEdit && emoji.format !== 'GIF' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => onEdit(emoji, index)}
                        >
                          <Sliders className="w-4 h-4 mr-1.5" />
                          <span>Edit</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className={onEdit && emoji.format !== 'GIF' ? "flex-1" : "w-full"}
                        onClick={() => onDownload(emoji)}
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        <span>Download</span>
                      </Button>
                    </div>
                    {/* Second row: Send to Slack (primary CTA) */}
                    <Button
                      size="sm"
                      variant={uploadedEmojis.has(index) ? "secondary" : "default"}
                      className="w-full"
                      onClick={() => handleSlackUpload(emoji, index)}
                      disabled={uploadingIndex === index || uploadedEmojis.has(index)}
                    >
                      {uploadingIndex === index ? (
                        <>
                          <div className="mr-1.5 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          <span>Uploading...</span>
                        </>
                      ) : uploadedEmojis.has(index) ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1.5" />
                          <span>Sent to Slack</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-1.5" />
                          <span>Send to Slack</span>
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  /* No Slack: single row */
                  <div className="flex gap-2">
                    {onEdit && emoji.format !== 'GIF' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => onEdit(emoji, index)}
                      >
                        <Sliders className="w-4 h-4 mr-1.5" />
                        <span>Edit</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={onEdit && emoji.format !== 'GIF' ? "flex-1" : "w-full"}
                      onClick={() => onDownload(emoji)}
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      <span>Download</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {!hasSlack && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center space-y-3">
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
      </CardContent>
    </Card>
  )
}

// Add CSS for checkered background
const style = document.createElement('style')
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
`
document.head.appendChild(style)