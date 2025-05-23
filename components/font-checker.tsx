"use client"

import { useEffect, useState } from "react"
import { areFontsLoaded } from "@/lib/utils"

export function FontChecker() {
  const [fontLoaded, setFontLoaded] = useState(false)
  const [fontFamily, setFontFamily] = useState("")

  useEffect(() => {
    // Check if fonts are loaded
    setFontLoaded(areFontsLoaded())

    // Get the computed font family of the body
    if (typeof document !== "undefined") {
      setFontFamily(window.getComputedStyle(document.body).fontFamily)
    }
  }, [])

  // Only render in development
  if (process.env.NODE_ENV !== "development") return null

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs z-50">
      <div>Font loaded: {fontLoaded ? "Yes" : "No"}</div>
      <div>Font family: {fontFamily}</div>
    </div>
  )
}
