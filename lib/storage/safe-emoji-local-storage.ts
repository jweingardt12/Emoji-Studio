"use client"

export type StorageWarningDetail = {
  reason: string
  source: string
  byteSize?: number
  limit?: number
}

export interface EmojiLocalStorageResult {
  saved: boolean
  reason?: string
  byteSize?: number
}

const DEFAULT_MAX_LOCAL_STORAGE_BYTES = 4 * 1024 * 1024 // 4 MB safety ceiling

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

const dispatchWarning = (detail: StorageWarningDetail) => {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<StorageWarningDetail>("emojiStorageWarning", { detail }))
}

export const safePersistEmojiDataToLocalStorage = (
  emojis: unknown[],
  options?: { source?: string; maxBytes?: number }
): EmojiLocalStorageResult => {
  if (typeof window === "undefined") {
    return { saved: false, reason: "client-only", byteSize: 0 }
  }

  const source = options?.source ?? "unknown"
  const limit = options?.maxBytes ?? DEFAULT_MAX_LOCAL_STORAGE_BYTES

  try {
    const serialized = JSON.stringify(emojis)
    const byteSize = new Blob([serialized]).size

    if (byteSize > limit) {
      try {
        localStorage.removeItem("emojiData")
      } catch (removeError) {
      }

      const reason = `Emoji data payload (${formatBytes(byteSize)}) exceeds the in-browser storage limit (${formatBytes(limit)}).`
      dispatchWarning({ reason, source, byteSize, limit })
      return { saved: false, reason, byteSize }
    }

    localStorage.setItem("emojiData", serialized)
    return { saved: true, byteSize }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    dispatchWarning({ reason: message, source })
    try {
      localStorage.removeItem("emojiData")
    } catch (removeError) {
    }
    return { saved: false, reason: message }
  }
}
