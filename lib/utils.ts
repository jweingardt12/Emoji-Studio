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
