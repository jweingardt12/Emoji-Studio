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
 * This includes in-app browsers from Slack, Discord, Twitter, LinkedIn, Facebook, Instagram, etc.
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

  // Detect specific app WebViews that may have limited capabilities
  // These apps embed web content but may not support full browser APIs
  const isSlackWebView = /Slack/i.test(ua)
  const isDiscordWebView = /Discord/i.test(ua)
  const isTwitterWebView = /Twitter/i.test(ua)
  const isLinkedInWebView = /LinkedInApp/i.test(ua)
  const isFacebookWebView = /FBAN|FBAV/i.test(ua)
  const isInstagramWebView = /Instagram/i.test(ua)
  const isMessengerWebView = /Messenger/i.test(ua)
  const isSnapchatWebView = /Snapchat/i.test(ua)
  const isTikTokWebView = /TikTok/i.test(ua)
  const isLineWebView = /Line\//i.test(ua)
  const isWeChatWebView = /MicroMessenger/i.test(ua)

  // Generic in-app browser detection
  const isGenericInAppBrowser = /InApp/i.test(ua)

  return isIOSWebView || isStandalone || isAndroidWebView ||
    isSlackWebView || isDiscordWebView || isTwitterWebView ||
    isLinkedInWebView || isFacebookWebView || isInstagramWebView ||
    isMessengerWebView || isSnapchatWebView || isTikTokWebView ||
    isLineWebView || isWeChatWebView || isGenericInAppBrowser
}

/**
 * Detect if running in a restricted WebView that likely doesn't support Web Share API
 * More aggressive detection for environments where we should show fallback UI
 */
export function isRestrictedWebView(): boolean {
  if (typeof navigator === "undefined") return false

  // If basic WebView detection says yes, it's restricted
  if (isWebView()) return true

  // On iOS, if we don't have Safari in the UA, it's probably a WebView
  if (isIOS()) {
    const ua = navigator.userAgent
    // Safari includes both "Safari" and "Version" in the UA
    const hasSafari = /Safari/.test(ua) && /Version/.test(ua)
    // Chrome on iOS has "CriOS"
    const hasChrome = /CriOS/.test(ua)
    // Firefox on iOS has "FxiOS"
    const hasFirefox = /FxiOS/.test(ua)
    // Edge on iOS has "EdgiOS"
    const hasEdge = /EdgiOS/.test(ua)
    // If it's none of these known browsers, it's likely a WebView
    if (!hasSafari && !hasChrome && !hasFirefox && !hasEdge) {
      return true
    }
  }

  return false
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
    isRestrictedWebView: isRestrictedWebView(),
    isIOSSafari: isIOSSafari(),
    isIOSChrome: isIOSChrome(),
    supportsDownload: supportsDownloadAttribute(),
    supportsClipboardImage: supportsClipboardWriteImage(),
    supportsWebShare: supportsWebShareWithFiles(),
    supportsBlobUrls: supportsBlobUrls(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  }
}
