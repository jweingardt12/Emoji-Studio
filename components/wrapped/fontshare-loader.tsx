"use client"

import { useEffect } from "react"

const FONTSHARE_URL =
  "https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@400,500,600,700&display=swap"

/**
 * Injects the Fontshare stylesheet (Clash Display + General Sans) after
 * mount. Only /wrapped uses these families, and injecting imperatively
 * keeps the stylesheet from blocking the route's first paint the way a
 * React 19 `precedence` stylesheet would; display=swap covers the brief
 * fallback-font window.
 */
export function FontshareLoader() {
  useEffect(() => {
    if (document.getElementById("fontshare-fonts")) return
    const link = document.createElement("link")
    link.id = "fontshare-fonts"
    link.rel = "stylesheet"
    link.href = FONTSHARE_URL
    document.head.appendChild(link)
    // Intentionally not removed on unmount — fonts stay cached for the session.
  }, [])

  return null
}
