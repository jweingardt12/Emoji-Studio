"use client"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

export function ClearLocalStorageButton() {
  const { setEmojiData, setHasRealData, setUseDemoData, setWorkspace } = useEmojiData()
  
  const handleClear = () => {
    try {
      // Clear all localStorage
      localStorage.clear()
      
      // Clear all sessionStorage
      sessionStorage.clear()
      
      // Clear all cookies for this domain
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      
      // Clear all in-memory state
      setEmojiData([])
      setHasRealData(false)
      setUseDemoData(false)
      setWorkspace("")
      
      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name)
          })
        })
      }
      
      toast({
        title: "All app data cleared",
        description: "All browser data and cache for this app has been removed.",
        variant: "default",
      })
      
      // Dispatch event for any other components that need to know
      window.dispatchEvent(new CustomEvent("localStorageCleared"))
      
      // Notify Chrome extension if it's installed
      if (typeof window !== 'undefined') {
        window.postMessage({ type: 'EMOJI_STUDIO_CLEAR_DATA' }, '*')
      }

      // Force reload to ensure clean state
      setTimeout(() => {
        window.location.href = "/settings"
      }, 500)
    } catch (error) {
      console.error("Error clearing app data:", error)
      toast({
        title: "Failed to clear app data",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleClear} 
      className="mt-2"
      data-clear-storage-button
    >
      Clear All App Data
    </Button>
  )
}
