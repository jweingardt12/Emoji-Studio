"use client"

import { useEffect, useRef } from "react"
import { useOpenPanel } from "@openpanel/nextjs"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

/**
 * Component that syncs the workspace to OpenPanel's global properties.
 * This ensures that ALL OpenPanel events (including automatic ones like
 * screen views, outgoing links, etc.) include the workspace name.
 *
 * Must be rendered inside both OpenPanelComponent and EmojiDataProvider.
 */
export function OpenPanelWorkspaceSync() {
  const op = useOpenPanel()
  const { workspace } = useEmojiData()
  const lastSyncedWorkspace = useRef<string | null>(null)

  useEffect(() => {
    // Don't set global properties if workspace hasn't changed
    if (lastSyncedWorkspace.current === workspace) {
      return
    }

    // Try to get workspace from context, fallback to localStorage
    const workspaceToSync = workspace ||
      (typeof window !== "undefined" ? localStorage.getItem("workspace") : null)

    if (workspaceToSync && workspaceToSync !== lastSyncedWorkspace.current) {
      console.log("[OpenPanel] Setting global workspace property:", workspaceToSync)
      op.setGlobalProperties({
        workspace: workspaceToSync,
      })
      lastSyncedWorkspace.current = workspaceToSync
    }
  }, [workspace, op])

  // Also listen for localStorage changes (for cases where workspace is set outside React context)
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "workspace" && event.newValue && event.newValue !== lastSyncedWorkspace.current) {
        console.log("[OpenPanel] Workspace changed in localStorage, updating global properties:", event.newValue)
        op.setGlobalProperties({
          workspace: event.newValue,
        })
        lastSyncedWorkspace.current = event.newValue
      }
    }

    // Also handle custom events for workspace updates within the same tab
    const handleWorkspaceUpdate = () => {
      const currentWorkspace = localStorage.getItem("workspace")
      if (currentWorkspace && currentWorkspace !== lastSyncedWorkspace.current) {
        console.log("[OpenPanel] Workspace updated via event, updating global properties:", currentWorkspace)
        op.setGlobalProperties({
          workspace: currentWorkspace,
        })
        lastSyncedWorkspace.current = currentWorkspace
      }
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

  // Initial sync on mount - check localStorage for workspace
  useEffect(() => {
    if (typeof window === "undefined") return

    const storedWorkspace = localStorage.getItem("workspace")
    if (storedWorkspace && storedWorkspace !== lastSyncedWorkspace.current) {
      console.log("[OpenPanel] Initial workspace sync from localStorage:", storedWorkspace)
      op.setGlobalProperties({
        workspace: storedWorkspace,
      })
      lastSyncedWorkspace.current = storedWorkspace
    }
  }, [op])

  return null
}
