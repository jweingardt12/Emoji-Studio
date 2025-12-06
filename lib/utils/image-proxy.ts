/**
 * Default placeholder for missing/broken emoji images
 */
export const EMOJI_PLACEHOLDER = "/placeholder.svg?height=128&width=128&text=emoji"

/**
 * Proxies an image URL through our API to avoid CORS issues
 */
export const proxyImageUrl = (url: string): string => {
  // Return placeholder for missing/invalid URLs
  if (!url || typeof url !== "string" || url.trim() === "") {
    return EMOJI_PLACEHOLDER
  }

  // If it's already a proxied URL or a local URL, return it as is
  if (url.startsWith("/api/emoji-proxy") || url.startsWith("/placeholder.svg")) {
    return url
  }

  // Otherwise, proxy it through our API
  return `/api/emoji-proxy?url=${encodeURIComponent(url)}`
}

/**
 * Check if an emoji has a valid URL
 */
export const hasValidUrl = (emoji: { url?: string } | null | undefined): boolean => {
  return Boolean(emoji?.url && typeof emoji.url === "string" && emoji.url.trim() !== "")
}
