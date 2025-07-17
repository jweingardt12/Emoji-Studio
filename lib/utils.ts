import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if fonts are loaded
 * This is used by the FontChecker component
 */
export function areFontsLoaded(): boolean {
  if (typeof document === 'undefined') return false
  
  // Use the document.fonts API if available
  if (document.fonts && typeof document.fonts.check === 'function') {
    return document.fonts.check('1em Inter')
  }
  
  // Fallback: just return true if we can't check
  return true
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format emoji name for Slack compatibility
 * Converts to lowercase, replaces spaces with hyphens, removes special characters
 */
export function formatEmojiName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Format emoji name for display in Slack format
 * Returns the name wrapped in colons like :emoji-name:
 */
export function formatSlackEmojiDisplay(name: string): string {
  return `:${formatEmojiName(name)}:`
}
