/**
 * Emoji Pack data models
 * Aligned with iOS app structure for feature parity
 */

export interface PackEmoji {
  id: string // Pack-scoped ID
  name: string // Emoji name (editable, without colons)
  imageURL: string // Data URL or remote URL
  isAnimated: boolean
  originalFile?: File // Only for local packs
  processedBlob?: Blob
  metadata?: {
    width: number
    height: number
    format: string
    size: number
  }
}

export interface EmojiPack {
  id: string // UUID
  name: string // User-facing name
  description?: string
  source: "local" | "slackmojis" | "bufo" | "memes" // Pack origin
  emojis: PackEmoji[]
  created: number // Unix timestamp
  lastModified: number
  tags?: string[]
  thumbnail?: string // First emoji preview URL
}

export interface SelectionState {
  packId: string
  selectedIds: Set<string> // Uses "id|name" format like iOS
  maxSelection: number // Default: 20
}

export type UploadStatus =
  | "pending"
  | "checking"
  | "uploading"
  | "success"
  | "failed"
  | "ratelimited"

export interface UploadQueueItem {
  id: string
  packId: string
  emoji: PackEmoji
  status: UploadStatus
  attempts: number
  error?: string
  nameConflict?: boolean
}

export interface UploadProgress {
  active: boolean
  total: number
  completed: number
  failed: number
  ratelimited: number
  current?: string // Current emoji name
  progress: number // 0-1
}

export interface ReviewItem {
  id: string
  emoji: PackEmoji
  proposedName: string
  status: "checking" | "available" | "taken" | "error"
  suggestedAlternatives?: string[]
}

export interface SlackmojisEmoji {
  name: string
  image_url: string
  category?: string
  aliases?: string[]
}

export interface UploadResult {
  success: number
  failed: number
  ratelimited: number
  errors: Array<{ emoji: string; error: string }>
}