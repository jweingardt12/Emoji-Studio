"use client"

import { useState } from "react"
import { ProcessedEmoji, EmojiProcessor } from "@/lib/utils/emoji-processor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, X, CheckCircle, AlertCircle, Pencil, Check } from "lucide-react"
import { formatBytes } from "@/lib/utils"

interface EmojiProcessorPreviewProps {
  emojis: ProcessedEmoji[]
  onRemove: (index: number) => void
  onDownload: (emoji: ProcessedEmoji) => void
  onDownloadAll: () => void
  onUpdateName: (index: number, newName: string) => void
}

export function EmojiProcessorPreview({ 
  emojis, 
  onRemove, 
  onDownload,
  onDownloadAll,
  onUpdateName
}: EmojiProcessorPreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Processed Emojis ({emojis.length})</CardTitle>
        {emojis.length > 1 && (
          <Button size="sm" onClick={onDownloadAll}>
            <Download className="w-4 h-4 mr-2" />
            Download All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {emojis.map((emoji, index) => (
            <div 
              key={index} 
              className="relative group border rounded-lg p-4 hover:bg-accent/50 transition-colors"
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
                      src={emoji.preview} 
                      alt={emoji.name}
                      className="absolute inset-0 w-full h-full object-contain"
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
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h4 className="font-medium truncate">{emoji.name}</h4>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleStartEdit(index, emoji.name)}
                      >
                        <Pencil className="h-3 w-3" />
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

              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3"
                onClick={() => onDownload(emoji)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          ))}
        </div>
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