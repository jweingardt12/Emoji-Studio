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
  useEffect(() => setIsClient(true), []);

  const { hasRealData, useDemoData, loading } = useEmojiData()
  const router = useRouter()
  
  useEffect(() => {
    if (isClient && !loading) {
      const hasAnyData = hasRealData || useDemoData
      if (!hasAnyData) {
        router.replace(redirectTo)
      }
    }
  }, [hasRealData, useDemoData, loading, redirectTo, router, isClient])

  if (!isClient) return null;
  return loading || hasRealData || useDemoData ? <>{children}</> : null
}
