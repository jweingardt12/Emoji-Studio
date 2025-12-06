"use client"

import { OpenPanelComponent, useOpenPanel } from "@openpanel/nextjs"
import { useEffect, useRef } from "react"

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
 * OpenPanel provider that initializes analytics.
 * Renders OpenPanelComponent immediately so useOpenPanel() hooks work from first render.
 * WorkspaceSync handles setting global properties (workspace) after mount.
 */
export function OpenPanelProvider() {
  return (
    <>
      <OpenPanelComponent
        clientId={OPENPANEL_CLIENT_ID}
        trackScreenViews={true}
        trackAttributes={true}
        trackOutgoingLinks={true}
      />
      <WorkspaceSync />
    </>
  )
}
