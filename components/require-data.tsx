"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

type RequireDataProps = {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Component to protect pages that require data
 * Redirects to specified page (defaults to /settings) if no data is available
 * Use this component at the page level instead of as a global middleware
 */
import { useState } from "react"

export function RequireData({ 
  children, 
  redirectTo = "/settings" 
}: RequireDataProps) {
  const [isClient, setIsClient] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  useEffect(() => setIsClient(true), []);

  const { hasRealData, useDemoData, loading } = useEmojiData()
  const router = useRouter()
  
  useEffect(() => {
    if (isClient && !loading && !hasChecked) {
      // Check if we're coming from a sync operation
      const urlParams = new URLSearchParams(window.location.search);
      const isSyncing = urlParams.get('syncStarting') === 'true';
      
      // If we're syncing, don't redirect - wait for the sync to complete
      if (isSyncing) {
        // Give ChromeExtensionHandler plenty of time to complete the sync
        // Extension needs time to: fetch data, process it, store it, and update context
        setTimeout(() => {
          const hasAnyData = hasRealData || useDemoData
          if (!hasAnyData) {
            router.replace(redirectTo)
          }
          setHasChecked(true);
        }, 10000); // Wait 10 seconds for sync to complete and data to be processed
      } else {
        // Normal check with short delay
        setTimeout(() => {
          const hasAnyData = hasRealData || useDemoData
          if (!hasAnyData) {
            router.replace(redirectTo)
          }
          setHasChecked(true);
        }, 500);
      }
    }
  }, [hasRealData, useDemoData, loading, redirectTo, router, isClient, hasChecked])

  if (!isClient) return null;
  return loading || hasRealData || useDemoData ? <>{children}</> : null
}
