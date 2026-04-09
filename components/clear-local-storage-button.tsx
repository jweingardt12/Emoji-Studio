"use client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { idb, emojiStorage } from "@/lib/storage/indexed-db"

export function ClearLocalStorageButton() {
  const { setEmojiData, setHasRealData, setUseDemoData, setWorkspace } = useEmojiData()

  const handleClear = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      // Step 1: Clear all IndexedDB stores WHILE the connection is still open.
      // This is reliable because it uses a normal readwrite transaction, unlike
      // deleteDatabase() which can be blocked by open connections and silently fail.
      try {
        await emojiStorage.clearEmojis()
        await idb.clear('settings')
        await idb.clear('cache')
      } catch (e) {
      }

      // Step 2: Close the IndexedDB connection after stores are cleared
      idb.reset();

      // Step 3: Clear all localStorage
      localStorage.clear()

      // Step 4: Clear all sessionStorage
      sessionStorage.clear()

      // Step 5: Clear all cookies for this domain
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })

      // Step 6: Try to delete the IndexedDB database entirely.
      // Wait for onsuccess even if onblocked fires first — the delete will
      // eventually complete once all connections close (which we did in step 2).
      if ('indexedDB' in window) {
        await new Promise<void>((resolve) => {
          const deleteRequest = indexedDB.deleteDatabase('EmojiStudioDB')
          let resolved = false
          const done = () => {
            if (!resolved) {
              resolved = true
              resolve()
            }
          }
          deleteRequest.onsuccess = () => {
            done()
          }
          deleteRequest.onerror = () => {
            done()
          }
          deleteRequest.onblocked = () => {
            // Don't resolve yet — wait for onsuccess. But set a timeout as fallback
            // in case the delete never completes (e.g. leaked connection in another tab).
            setTimeout(done, 2000)
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

      // Step 7: Clear all in-memory state
      setEmojiData([])
      setHasRealData(false)
      setUseDemoData(false)
      setWorkspace("")

      // Step 8: Clear any cached data (Service Worker caches)
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
