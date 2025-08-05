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
        console.log('[RequireData] Sync in progress, waiting for data...');
        // Give ChromeExtensionHandler plenty of time to complete the sync
        setTimeout(() => {
          const hasAnyData = hasRealData || useDemoData
          if (!hasAnyData) {
            console.log('[RequireData] No data after sync wait, redirecting to settings');
            router.replace(redirectTo)
          }
          setHasChecked(true);
        }, 5000); // Wait 5 seconds for sync to complete
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
