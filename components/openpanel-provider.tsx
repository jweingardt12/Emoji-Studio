"use client"

import { OpenPanelComponent } from "@openpanel/nextjs"
import { useState, useEffect } from "react"

// OpenPanel client ID from environment
const OPENPANEL_CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!

/**
 * OpenPanel provider that initializes analytics with workspace as a global property.
 * This ensures ALL events (including automatic screen views) include the workspace.
 *
 * The component delays initialization slightly to read workspace from localStorage,
 * ensuring the first events include the workspace if available.
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
    <OpenPanelComponent
      clientId={OPENPANEL_CLIENT_ID}
      trackScreenViews={true}
      trackAttributes={true}
      trackOutgoingLinks={true}
      globalProperties={globalProperties}
    />
  )
}
