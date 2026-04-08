"use client"

import { useEffect } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

export function ExtensionClearDataListener() {
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  
  useEffect(() => {
    // Listen for clear data messages from the extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION') {
        // Clear all data
        localStorage.clear()
        sessionStorage.clear()
        setEmojiData([])
        setHasRealData(false)
        setWorkspace("")

        // Redirect to settings using window.location to avoid router issues
        window.location.href = "/settings"
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [setEmojiData, setWorkspace, setHasRealData])
  
  return null
}