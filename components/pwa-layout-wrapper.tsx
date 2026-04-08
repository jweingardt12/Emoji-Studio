"use client"

import { useEffect, useState } from "react"
import { FloatingCreateButton } from "./floating-create-button"
import { useIOSViewportFix } from "@/hooks/use-ios-viewport-fix"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { useTrack } from "@/lib/hooks/use-track"

export function PWALayoutWrapper({ children }: { children: React.ReactNode }) {
  const track = useTrack();
  const [isPWA, setIsPWA] = useState(false)

  // Apply iOS Safari viewport fixes
  useIOSViewportFix()

  // Enable auto-refresh on app focus
  useAutoRefresh()

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone
      const pwaStatus = isStandalone || isInStandaloneMode
      setIsPWA(pwaStatus)

      // Track PWA status
      if (pwaStatus) {
        track("PWA: App Opened", {
          displayMode: isStandalone ? "standalone" : "ios-standalone",
          hasServiceWorker: 'serviceWorker' in navigator,
          protocol: window.location.protocol,
          userAgent: navigator.userAgent
        })
      }
    }

    checkPWA()

    // Register service worker with better error handling
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          track("PWA: Service Worker Registered", {
            scope: registration.scope
          })

          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  track("PWA: Update Available", {})
                }
              })
            }
          })
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
          track("PWA: Service Worker Registration Failed", {
            error: error.message
          })
        })
    }

    window.addEventListener('resize', checkPWA)

    return () => {
      window.removeEventListener('resize', checkPWA)
    }
  }, [])

  return (
    <>
      {children}
      <FloatingCreateButton isPWA={isPWA} />
    </>
  )
}