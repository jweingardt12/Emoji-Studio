/**
 * Proxies an image URL through our API to avoid CORS issues
 */
export const proxyImageUrl = (url: string): string => {
  if (!url) return ""

  // If it's already a proxied URL or a local URL, return it as is
  if (url.startsWith("/api/emoji-proxy") || url.startsWith("/placeholder.svg")) {
    return url
  }

  // Otherwise, proxy it through our API
  return `/api/emoji-proxy?url=${encodeURIComponent(url)}`
}
