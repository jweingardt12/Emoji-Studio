"use client"

/**
 * Upload Review Component
 * Pre-upload validation and conflict resolution
 * Based on iOS review step patterns
 */

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, AlertCircle, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { isEmojiNameAvailable } from "@/lib/services/emoji-service"
import type { PackEmoji, ReviewItem } from "@/lib/types/emoji-pack"
import { cn } from "@/lib/utils"

interface UploadReviewProps {
  emojis: PackEmoji[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reviewed: ReviewItem[]) => void
}

export function UploadReview({
  emojis,
  open,
  onOpenChange,
  onConfirm,
}: UploadReviewProps) {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (open && emojis.length > 0) {
      initializeReview()
    }
  }, [open, emojis])

  const initializeReview = async () => {
    // Initialize review items
    const items: ReviewItem[] = emojis.map((emoji) => ({
      id: emoji.id,
      emoji,
      proposedName: emoji.name,
      status: "checking",
    }))

    setReviewItems(items)

    // Check all names concurrently
    await Promise.all(
      items.map(async (item, index) => {
        try {
          const available = await isEmojiNameAvailable(item.proposedName)
          setReviewItems((prev) => {
            const next = [...prev]
            next[index] = {
              ...next[index],
              status: available ? "available" : "taken",
            }
            return next
          })
        } catch (error) {
          setReviewItems((prev) => {
            const next = [...prev]
            next[index] = {
              ...next[index],
              status: "error",
            }
            return next
          })
        }
      })
    )
  }

  const updateName = async (id: string, newName: string) => {
    // Sanitize name (like iOS)
    const sanitized = newName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/_/g, "-")
      .replace(/[^a-z0-9-]/g, "")

    setReviewItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, proposedName: sanitized, status: "checking" }
          : item
      )
    )

    // Check availability
    try {
      const available = await isEmojiNameAvailable(sanitized)
      setReviewItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status: available ? "available" : "taken" }
            : item
        )
      )
    } catch (error) {
      setReviewItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "error" } : item
        )
      )
    }

    setEditingId(null)
  }

  const handleConfirm = () => {
    const availableItems = reviewItems.filter((item) => item.status === "available")
    onConfirm(availableItems)
    onOpenChange(false)
  }

  const availableCount = reviewItems.filter((item) => item.status === "available").length
  const takenCount = reviewItems.filter((item) => item.status === "taken").length
  const errorCount = reviewItems.filter((item) => item.status === "error").length
  const checkingCount = reviewItems.filter((item) => item.status === "checking").length
  const canProceed = availableCount > 0 && checkingCount === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review {emojis.length} emojis before upload</DialogTitle>
          <DialogDescription>
            Checking name availability. Edit names if needed to resolve conflicts.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {reviewItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  item.status === "available" && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                  item.status === "taken" && "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
                  item.status === "error" && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
                  item.status === "checking" && "bg-muted"
                )}
              >
                {/* Emoji preview */}
                <img
                  src={item.emoji.imageURL}
                  alt={item.emoji.name}
                  className="w-12 h-12 object-contain rounded"
                />

                {/* Name input */}
                <div className="flex-1">
                  {editingId === item.id ? (
                    <Input
                      autoFocus
                      value={item.proposedName}
                      onChange={(e) => {
                        const sanitized = e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "-")
                          .replace(/_/g, "-")
                          .replace(/[^a-z0-9-]/g, "")
                        setReviewItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id
                              ? { ...i, proposedName: sanitized }
                              : i
                          )
                        )
                      }}
                      onBlur={() => updateName(item.id, item.proposedName)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateName(item.id, item.proposedName)
                        }
                      }}
                      className="h-8"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="flex items-center gap-2 text-left group"
                    >
                      <span className="font-mono font-medium">
                        :{item.proposedName}:
                      </span>
                      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                  )}
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  {item.status === "checking" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Checking...
                      </span>
                    </>
                  )}
                  {item.status === "available" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-600 dark:text-green-400">
                        Available
                      </span>
                    </>
                  )}
                  {item.status === "taken" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm text-amber-600 dark:text-amber-400">
                        Taken
                      </span>
                    </>
                  )}
                  {item.status === "error" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm text-red-600 dark:text-red-400">
                        Error
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-muted-foreground">
            {checkingCount > 0 && `Checking ${checkingCount}... `}
            {availableCount > 0 && `${availableCount} available`}
            {takenCount > 0 && `, ${takenCount} conflict${takenCount > 1 ? 's' : ''}`}
            {errorCount > 0 && `, ${errorCount} error${errorCount > 1 ? 's' : ''}`}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canProceed}>
            Upload {availableCount} emoji{availableCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}