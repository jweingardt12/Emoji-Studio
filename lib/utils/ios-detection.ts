/**
 * iOS and WebView detection utilities for handling platform-specific behaviors
 */

/**
 * Detect if the current environment is iOS (iPhone, iPad, iPod)
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false

  // Check for iOS devices
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)

  // Also check for iPad on iOS 13+ which reports as Mac
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1

  return isIOSDevice || isIPadOS
}

/**
 * Detect if running in a WebView (iOS or Android)
 */
export function isWebView(): boolean {
  if (typeof navigator === "undefined") return false

  const ua = navigator.userAgent

  // iOS WebView detection
  // WKWebView doesn't include "Safari" in the UA string
  const isIOSWebView = isIOS() && !/(Safari)/.test(ua) && /(Mobile)/.test(ua)

  // Alternative iOS WebView detection using standalone mode
  const isStandalone = ("standalone" in navigator) && (navigator as { standalone?: boolean }).standalone === true

  // Android WebView detection
  const isAndroidWebView = /wv/.test(ua) || /Android.*Version\/[\d.]+.*Chrome\/[\d.]+ Mobile/.test(ua)

  return isIOSWebView || isStandalone || isAndroidWebView
}

/**
 * Detect if running in iOS Safari (not WebView)
 */
export function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false

  return isIOS() && /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent) && !isWebView()
}

/**
 * Detect if running in iOS Chrome
 */
export function isIOSChrome(): boolean {
  if (typeof navigator === "undefined") return false

  return isIOS() && /CriOS/.test(navigator.userAgent)
}

/**
 * Check if the device supports the download attribute on anchor elements
 * iOS Safari and WebViews don't fully support programmatic downloads
 */
export function supportsDownloadAttribute(): boolean {
  if (typeof document === "undefined") return false

  // iOS doesn't properly support the download attribute
  if (isIOS()) return false

  // Check if download attribute is supported
  const a = document.createElement("a")
  return typeof a.download !== "undefined"
}

/**
 * Check if the Clipboard API supports writing images
 * iOS Safari/WebView has limited clipboard support
 */
export function supportsClipboardWriteImage(): boolean {
  if (typeof navigator === "undefined") return false

  // Check basic clipboard API support
  if (!navigator.clipboard || !navigator.clipboard.write) return false

  // iOS WebView doesn't support ClipboardItem with images
  if (isWebView()) return false

  // iOS Safari has inconsistent support - check for ClipboardItem
  if (typeof ClipboardItem === "undefined") return false

  // iOS Safari 13.4+ technically supports it, but it's unreliable
  // Better to use share API on iOS
  if (isIOS()) return false

  return true
}

/**
 * Check if Web Share API with file support is available
 * This is the preferred sharing method on iOS
 */
export function supportsWebShareWithFiles(): boolean {
  if (typeof navigator === "undefined") return false
  if (!navigator.share || !navigator.canShare) return false

  try {
    const testFile = new File(["test"], "test.png", { type: "image/png" })
    return navigator.canShare({ files: [testFile] })
  } catch {
    return false
  }
}

/**
 * Check if we can create and open blob URLs
 * Some WebViews restrict blob URL handling
 */
export function supportsBlobUrls(): boolean {
  if (typeof URL === "undefined") return false
  if (typeof Blob === "undefined") return false

  try {
    const blob = new Blob(["test"], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Get platform info for debugging and analytics
 */
export function getPlatformInfo() {
  return {
    isIOS: isIOS(),
    isWebView: isWebView(),
    isIOSSafari: isIOSSafari(),
    isIOSChrome: isIOSChrome(),
    supportsDownload: supportsDownloadAttribute(),
    supportsClipboardImage: supportsClipboardWriteImage(),
    supportsWebShare: supportsWebShareWithFiles(),
    supportsBlobUrls: supportsBlobUrls(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  }
}
