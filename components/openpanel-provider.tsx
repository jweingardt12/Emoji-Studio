"use client"

import { OpenPanelComponent, useOpenPanel } from "@openpanel/nextjs"
import { useState, useEffect, useRef } from "react"

// OpenPanel client ID from environment
const OPENPANEL_CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!

/**
 * Internal component that syncs workspace to OpenPanel global properties.
 * Must be rendered AFTER OpenPanelComponent so useOpenPanel() has access to the client.
 */
function WorkspaceSync() {
  const op = useOpenPanel()
  const lastSyncedWorkspace = useRef<string | null>(null)

  // Sync workspace on mount and when it changes
  useEffect(() => {
    if (typeof window === "undefined") return

    const syncWorkspace = () => {
      const workspace = localStorage.getItem("workspace")
      if (workspace && workspace !== lastSyncedWorkspace.current) {
        console.log("[OpenPanel] Setting global workspace property:", workspace)
        op.setGlobalProperties({ workspace })
        lastSyncedWorkspace.current = workspace
      }
    }

    // Initial sync
    syncWorkspace()

    // Listen for storage changes (cross-tab)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "workspace" && event.newValue) {
        syncWorkspace()
      }
    }

    // Listen for custom events (same-tab updates)
    const handleWorkspaceUpdate = () => {
      syncWorkspace()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("slackCurlUpdated", handleWorkspaceUpdate)
    window.addEventListener("emojiDataUpdated", handleWorkspaceUpdate)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("slackCurlUpdated", handleWorkspaceUpdate)
      window.removeEventListener("emojiDataUpdated", handleWorkspaceUpdate)
    }
  }, [op])

  return null
}

/**
 * OpenPanel provider that initializes analytics with workspace as a global property.
 * This ensures ALL events (including automatic screen views) include the workspace.
 *
 * The component delays initialization slightly to read workspace from localStorage,
 * ensuring the first events include the workspace if available.
 *
 * Includes internal WorkspaceSync component to keep global properties updated.
 */
export function OpenPanelProvider() {
  const [globalProperties, setGlobalProperties] = useState<Record<string, unknown>>({})
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Read workspace from localStorage on mount
    const workspace = localStorage.getItem("workspace")

    if (workspace) {
      setGlobalProperties({ workspace })
    }

    setIsReady(true)
  }, [])

  // Don't render until we've checked localStorage
  // This small delay ensures the first events include workspace
  if (!isReady) {
    return null
  }

  return (
    <>
      <OpenPanelComponent
        clientId={OPENPANEL_CLIENT_ID}
        trackScreenViews={true}
        trackAttributes={true}
        trackOutgoingLinks={true}
        globalProperties={globalProperties}
      />
      <WorkspaceSync />
    </>
  )
}
