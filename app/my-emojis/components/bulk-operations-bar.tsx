"use client"

import { Button } from "@/components/ui/button"
import { Download, Trash2, Copy, Link2, X, CheckSquare, Square } from "lucide-react"

interface BulkOperationsBarProps {
  selectedEmojiNames: Set<string>
  sortedEmojisCount: number
  handleBulkDownload: () => void
  handleBulkCopyNames: () => void
  handleBulkCopyUrls: () => void
  handleBulkDelete: () => void
  clearSelection: () => void
  selectAllEmojis: () => void
}

export function BulkOperationsBar({
  selectedEmojiNames,
  sortedEmojisCount,
  handleBulkDownload,
  handleBulkCopyNames,
  handleBulkCopyUrls,
  handleBulkDelete,
  clearSelection,
  selectAllEmojis,
}: BulkOperationsBarProps) {
  return (
    <>
      {selectedEmojiNames.size > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {selectedEmojiNames.size} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCopyNames}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Names
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCopyUrls}
              className="gap-2"
            >
              <Link2 className="h-4 w-4" />
              Copy URLs
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </>
      )}

      {sortedEmojisCount > 0 && (
        <>
          <div className="h-6 w-px bg-border ml-auto" />
          <Button
            variant="outline"
            size="sm"
            onClick={selectedEmojiNames.size === sortedEmojisCount ? clearSelection : selectAllEmojis}
            className="gap-2"
          >
            {selectedEmojiNames.size === sortedEmojisCount ? (
              <>
                <Square className="h-4 w-4" />
                Deselect All
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4" />
                Select All
              </>
            )}
          </Button>
        </>
      )}
    </>
  )
}
