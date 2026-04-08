"use client"

import { OpenPanelComponent, useOpenPanel } from "@openpanel/nextjs"
import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

// OpenPanel client ID from environment
const OPENPANEL_CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!

/**
 * Get workspace for tracking with better fallback logic.
 */
function getWorkspaceForTracking(): string {
  if (typeof window === "undefined") return "unknown"

  // Try localStorage first
  const workspace = localStorage.getItem("workspace")
  if (workspace && workspace !== "unknown") return workspace

  // Check if we're in demo mode
  const isDemo = localStorage.getItem("useDemoData") === "true"
  if (isDemo) return "demo-workspace"

  return "not-connected"
}

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
        op.setGlobalProperties({ workspace })
        lastSyncedWorkspace.current = workspace
      }
    }

    // Initial sync
    syncWorkspace()

    // Restore user identification from localStorage if available
    const mobileUserId = localStorage.getItem("mobileUserId")
    const cachedUsername = localStorage.getItem("userDisplayName")
    if (mobileUserId && cachedUsername) {
      op.identify({
        profileId: mobileUserId,
        firstName: cachedUsername,
        properties: {
          app: "emoji-dashboard",
          workspace: getWorkspaceForTracking(),
        },
      })
    }

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
 * Component that tracks page views manually after workspace data is ready.
 * This replaces automatic screen views to ensure workspace is captured.
 */
function PageViewTracker() {
  const op = useOpenPanel()
  const pathname = usePathname()
  const lastTracked = useRef<string>("")
  const hasTrackedInitial = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Small delay to allow workspace to be set from localStorage
    const timeoutId = setTimeout(() => {
      const workspace = getWorkspaceForTracking()
      const key = `${pathname}:${workspace}`

      // Only track if this is a new page/workspace combination
      if (key !== lastTracked.current) {
        const pageName = pathname.split("/").pop() || "home"
        op.track("screen_view", {
          name: pageName,
          path: pathname,
          workspace,
        })
        lastTracked.current = key
        hasTrackedInitial.current = true
      }
    }, hasTrackedInitial.current ? 0 : 100) // Delay first page view slightly

    return () => clearTimeout(timeoutId)
  }, [pathname, op])

  return null
}

/**
 * OpenPanel provider that initializes analytics.
 * Renders OpenPanelComponent immediately so useOpenPanel() hooks work from first render.
 * WorkspaceSync handles setting global properties (workspace) after mount.
 * PageViewTracker handles manual screen view tracking after workspace is ready.
 */
export function OpenPanelProvider() {
  return (
    <>
      <OpenPanelComponent
        clientId={OPENPANEL_CLIENT_ID}
        apiUrl={process.env.NEXT_PUBLIC_OPENPANEL_API_URL}
        trackScreenViews={false}
        trackAttributes={true}
        trackOutgoingLinks={true}
      />
      <WorkspaceSync />
      <PageViewTracker />
    </>
  )
}
