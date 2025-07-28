"use client"

import { useEffect } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

export function ExtensionClearDataListener() {
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  
  // Log on every render to ensure component is mounting
  console.log('[ExtensionClearDataListener] Component rendered')
  
  useEffect(() => {
    console.log('[ExtensionClearDataListener] Component mounted, setting up message listener')
    
    // Listen for clear data messages from the extension
    const handleMessage = (event: MessageEvent) => {
      console.log('[ExtensionClearDataListener] Window message received:', event.data?.type, event.data)
      
      if (event.data.type === 'EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION') {
        console.log('[ExtensionClearDataListener] ⚠️ CLEAR DATA MESSAGE DETECTED!')
        console.log('[ExtensionClearDataListener] Clearing all data...')
        
        // Clear all data
        localStorage.clear()
        sessionStorage.clear()
        setEmojiData([])
        setHasRealData(false)
        setWorkspace("")
        
        console.log('[ExtensionClearDataListener] Data cleared, redirecting to settings...')
        
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