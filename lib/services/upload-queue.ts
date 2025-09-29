/**
 * Upload Queue Manager
 * Handles bulk emoji uploads with retry logic and rate limiting
 * Based on iOS implementation patterns
 */

import type {
  PackEmoji,
  UploadQueueItem,
  UploadProgress,
  UploadResult,
} from "@/lib/types/emoji-pack"
import { uploadEmojiToSlack } from "@/lib/utils/slack-upload"
import { isEmojiNameAvailable } from "@/lib/services/emoji-service"

type ProgressCallback = (progress: UploadProgress) => void

class UploadQueueManager {
  private queue: UploadQueueItem[] = []
  private ratelimitedQueue: UploadQueueItem[] = []
  private listeners = new Set<ProgressCallback>()
  private isProcessing = false
  private cancelRequested = false

  // Progress state
  private progress: UploadProgress = {
    active: false,
    total: 0,
    completed: 0,
    failed: 0,
    ratelimited: 0,
    progress: 0,
  }

  async addToQueue(emojis: PackEmoji[], packId: string = "default"): Promise<void> {
    const items: UploadQueueItem[] = emojis.map((emoji) => ({
      id: `${packId}-${emoji.id}`,
      packId,
      emoji,
      status: "pending",
      attempts: 0,
    }))

    this.queue.push(...items)
  }

  async processQueue(): Promise<UploadResult> {
    if (this.isProcessing) {
      throw new Error("Queue is already being processed")
    }

    this.isProcessing = true
    this.cancelRequested = false

    // Initialize progress
    this.progress = {
      active: true,
      total: this.queue.length,
      completed: 0,
      failed: 0,
      ratelimited: 0,
      progress: 0,
    }
    this.notifyProgress()

    const errors: Array<{ emoji: string; error: string }> = []

    // Process queue sequentially (like iOS)
    for (const item of this.queue) {
      if (this.cancelRequested) break

      try {
        await this.uploadWithRetry(item)

        if (item.status === "success") {
          this.progress.completed++
        } else if (item.status === "failed") {
          this.progress.failed++
          errors.push({
            emoji: item.emoji.name,
            error: item.error || "Unknown error",
          })
        } else if (item.status === "ratelimited") {
          this.progress.ratelimited++
        }
      } catch (error) {
        this.progress.failed++
        errors.push({
          emoji: item.emoji.name,
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      // Update progress
      this.progress.progress =
        (this.progress.completed + this.progress.failed + this.progress.ratelimited) /
        this.progress.total
      this.progress.current = item.emoji.name
      this.notifyProgress()

      // Throttle between uploads (150-300ms like iOS)
      await this.randomDelay(150, 300)
    }

    // Process rate-limited queue with backoff
    if (this.ratelimitedQueue.length > 0) {
      await this.processRatelimitedQueue(errors)
    }

    // Clean up
    this.progress.active = false
    this.progress.current = undefined
    this.notifyProgress()

    this.isProcessing = false
    this.queue = []

    return {
      success: this.progress.completed,
      failed: this.progress.failed,
      ratelimited: this.progress.ratelimited,
      errors,
    }
  }

  private async uploadWithRetry(item: UploadQueueItem): Promise<void> {
    const maxAttempts = 5

    while (item.attempts < maxAttempts) {
      try {
        item.status = "checking"
        this.notifyProgress()

        // Final name availability check
        const available = await isEmojiNameAvailable(item.emoji.name)
        if (!available) {
          item.status = "failed"
          item.nameConflict = true
          item.error = "Name already taken"
          return
        }

        item.status = "uploading"
        this.notifyProgress()

        // Convert emoji to upload format
        const blob = await this.getEmojiBlob(item.emoji)
        const file = new File([blob], `${item.emoji.name}.${this.getExtension(item.emoji)}`, {
          type: blob.type,
        })

        const processedEmoji = {
          name: item.emoji.name,
          originalFile: file,
          processedBlob: blob,
          originalSize: blob.size,
          processedSize: blob.size,
          dimensions: {
            width: item.emoji.metadata?.width || 128,
            height: item.emoji.metadata?.height || 128,
          },
          format: item.emoji.metadata?.format || "PNG",
          preview: item.emoji.imageURL,
          blob: item.emoji.imageURL,
        }

        await uploadEmojiToSlack(processedEmoji)

        item.status = "success"
        return
      } catch (error) {
        item.attempts++

        // Check if rate limited
        if (this.isRateLimitError(error)) {
          item.status = "ratelimited"
          this.ratelimitedQueue.push(item)
          return
        }

        // Check if retryable
        if (item.attempts >= maxAttempts) {
          item.status = "failed"
          item.error = error instanceof Error ? error.message : "Unknown error"
          return
        }

        // Exponential backoff
        await this.delay(Math.pow(2, item.attempts) * 1000)
      }
    }
  }

  private async processRatelimitedQueue(
    errors: Array<{ emoji: string; error: string }>
  ): Promise<void> {
    if (this.ratelimitedQueue.length === 0) return

    // Wait 1200-2400ms like iOS
    await this.randomDelay(1200, 2400)

    for (const item of this.ratelimitedQueue) {
      if (this.cancelRequested) break

      item.status = "pending"
      item.attempts = 0
      await this.uploadWithRetry(item)

      if (item.status === "success") {
        this.progress.completed++
        this.progress.ratelimited--
      } else if (item.status === "failed") {
        this.progress.failed++
        this.progress.ratelimited--
        errors.push({
          emoji: item.emoji.name,
          error: item.error || "Unknown error",
        })
      }

      this.notifyProgress()
      await this.randomDelay(150, 300)
    }

    this.ratelimitedQueue = []
  }

  private async getEmojiBlob(emoji: PackEmoji): Promise<Blob> {
    if (emoji.processedBlob) {
      return emoji.processedBlob
    }

    // Fetch from URL
    const response = await fetch(emoji.imageURL)
    if (!response.ok) throw new Error("Failed to fetch emoji image")
    return response.blob()
  }

  private getExtension(emoji: PackEmoji): string {
    if (emoji.isAnimated) return "gif"
    return emoji.metadata?.format.toLowerCase() || "png"
  }

  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      return (
        error.message.includes("ratelimited") ||
        error.message.includes("rate limit") ||
        error.message.includes("too many requests")
      )
    }
    return false
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private randomDelay(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min
    return this.delay(ms)
  }

  onProgress(callback: ProgressCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  private notifyProgress(): void {
    this.listeners.forEach((callback) => callback(this.progress))
  }

  cancel(): void {
    this.cancelRequested = true
  }

  getProgress(): UploadProgress {
    return { ...this.progress }
  }
}

export const uploadQueue = new UploadQueueManager()