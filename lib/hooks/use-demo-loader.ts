"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { useTrack } from "@/lib/hooks/use-track"

interface DemoLoaderOptions {
  /** Where the demo load was initiated from — used for analytics. */
  source: string
  /** Navigate to /dashboard after loading (default true). */
  redirect?: boolean
}

/**
 * Loads the built-in demo workspace data.
 *
 * Persists it under the same localStorage keys and dispatches the same
 * `emojiDataUpdated` event as a real sync, so EmojiDataProvider (and any
 * other listener) picks it up exactly like real data. Keep the event
 * detail shape and storage keys in sync with the extension/mobile flows.
 */
export function useDemoLoader({ source, redirect = true }: DemoLoaderOptions) {
  const router = useRouter()
  const track = useTrack()
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)

  const loadDemoData = useCallback(async () => {
    setIsLoadingDemo(true)
    try {
      const { generateDemoData } = await import("@/lib/demo-data")
      const demoData = await generateDemoData()
      // generateDemoData swallows internal errors and returns [] — don't
      // persist an empty dataset as if the load succeeded.
      if (!demoData || demoData.length === 0) {
        throw new Error("Demo data generation returned no emojis")
      }

      safePersistEmojiDataToLocalStorage(demoData, { source })
      localStorage.setItem("workspace", "demo-workspace")
      localStorage.setItem("emojiCount", demoData.length.toString())
      localStorage.setItem("lastFetchTime", new Date().toISOString())

      // Notify the app the same way a real sync does.
      window.dispatchEvent(
        new CustomEvent("emojiDataUpdated", {
          detail: {
            emojiData: demoData,
            workspace: "demo-workspace",
            timestamp: Date.now(),
          },
        })
      )

      track("demo_mode_loaded", { emojiCount: demoData.length, source })

      if (redirect) {
        router.push("/dashboard")
      }
      return demoData
    } catch (error) {
      // Chunk-load or storage failures should not vanish silently.
      toast.error("Couldn't load demo data — please try again")
      return undefined
    } finally {
      setIsLoadingDemo(false)
    }
  }, [redirect, router, source, track])

  return { loadDemoData, isLoadingDemo }
}
