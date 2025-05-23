"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"

// List of allowed routes when no data is set
const ALLOWED_ROUTES_WITHOUT_DATA = [
  "/about",
  "/settings",
  "/dashboard", // Allow dashboard access even without data
]

/**
 * Middleware component that restricts access to pages when no data is set
 * Only allows access to About, Settings, and Dashboard pages when no data is available
 */
export function RequireDataMiddleware({ children }: { children: React.ReactNode }) {
  const { hasRealData, useDemoData, loading } = useEmojiData()
  const router = useRouter()
  const pathname = usePathname()
  const [redirecting, setRedirecting] = useState(false)
  
  // Check if the current route is allowed without data
  const isAllowedWithoutData = ALLOWED_ROUTES_WITHOUT_DATA.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  )
  
  // For root path, redirect to settings if no data
  const isRootPath = pathname === "/"
  
  useEffect(() => {
    // Prevent multiple redirects
    if (redirecting) return
    
    // Only check after loading is complete
    if (!loading) {
      const hasAnyData = hasRealData || useDemoData
      
      // If no data is set and the current route is not allowed, redirect to settings
      if (!hasAnyData && !isAllowedWithoutData) {
        setRedirecting(true)
        // Use a small delay to avoid race conditions with chunk loading
        setTimeout(() => {
          console.log(`Redirecting from ${pathname} to /settings (no data available)`)
          router.push("/settings")
        }, 50)
      }
    }
  }, [hasRealData, useDemoData, loading, isAllowedWithoutData, isRootPath, router, pathname, redirecting])
  
  // Always render children - we'll handle redirection via router.push
  // This avoids chunk loading errors that can occur with conditional rendering
  return <>{children}</>
}
