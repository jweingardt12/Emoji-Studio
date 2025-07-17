"use client"

import { ProcessedEmoji } from "@/lib/utils/emoji-processor"

interface GifTestPreviewProps {
  emoji: ProcessedEmoji
}

export function GifTestPreview({ emoji }: GifTestPreviewProps) {
  return (
    <div className="space-y-4 p-4 border rounded">
      <h3 className="font-semibold">GIF Test Preview</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Using blob URL (preview):</p>
          <div className="w-32 h-32 bg-checkered">
            <img 
              src={emoji.preview} 
              alt="Blob URL preview"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-2">Using data URL:</p>
          <div className="w-32 h-32 bg-checkered">
            <img 
              src={emoji.blob} 
              alt="Data URL preview"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
      
      <div className="text-sm space-y-1">
        <p>Format: {emoji.format}</p>
        <p>Size: {emoji.processedSize} bytes</p>
        <p>Blob type: {emoji.processedBlob.type}</p>
        <p>Dimensions: {emoji.dimensions.width}x{emoji.dimensions.height}</p>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground mb-2">Download and check:</p>
        <button 
          onClick={() => {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(emoji.processedBlob)
            a.download = `test-${emoji.name}.${emoji.format.toLowerCase()}`
            a.click()
          }}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
        >
          Download processed GIF
        </button>
      </div>
    </div>
  )
}