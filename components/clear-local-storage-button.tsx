"use client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { idb } from "@/lib/storage/indexed-db"

export function ClearLocalStorageButton() {
  const { setEmojiData, setHasRealData, setUseDemoData, setWorkspace } = useEmojiData()

  const handleClear = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      // Reset the IndexedDB singleton connection first
      idb.reset();

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

      // Clear IndexedDB databases and wait for completion
      if ('indexedDB' in window) {
        // Delete the main emoji database
        await new Promise<void>((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase('EmojiStudioDB')
          deleteRequest.onsuccess = () => {
            console.log('IndexedDB cleared')
            resolve()
          }
          deleteRequest.onerror = () => {
            console.error('Failed to clear IndexedDB')
            resolve() // Continue anyway
          }
          deleteRequest.onblocked = () => {
            console.warn('IndexedDB delete blocked - closing connections')
            resolve() // Continue anyway
          }
        })

        // Also try to delete any other databases the app might have created
        if ('databases' in indexedDB) {
          try {
            const databases = await (indexedDB as any).databases()
            for (const db of databases) {
              if (db.name) {
                indexedDB.deleteDatabase(db.name)
              }
            }
          } catch (e) {
            // databases() not supported in all browsers
          }
        }
      }

      // Clear all in-memory state
      setEmojiData([])
      setHasRealData(false)
      setUseDemoData(false)
      setWorkspace("")

      // Clear any cached data (Service Worker caches)
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(name => caches.delete(name)))
      }

      toast.success("All app data cleared", {
        description: "All browser data and cache for this app has been removed.",
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
      toast.error("Failed to clear app data", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
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
