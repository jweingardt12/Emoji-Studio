"use client"

import { useEffect } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useTrack } from "@/lib/hooks/use-track"

export function GlobalExtensionListener() {
  const track = useTrack();
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  
  useEffect(() => {
    console.log('[GlobalExtensionListener] Setting up global message listener')
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'EXTENSION_TRACK_EVENT') {
        // Forward tracking events from extension to openpanel
        if (event.data.eventName) {
          track(event.data.eventName, event.data.properties || {})
        }
      } else if (event.data.type === 'EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION') {
        console.log('[GlobalExtensionListener] Clear data request received!')
        
        // Clear all data
        localStorage.clear()
        sessionStorage.clear()
        setEmojiData([])
        setHasRealData(false)
        setWorkspace("")
        
        // Redirect to settings
        window.location.href = "/settings"
      }
    }
    
    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [setEmojiData, setWorkspace, setHasRealData, track])
  
  return null
}