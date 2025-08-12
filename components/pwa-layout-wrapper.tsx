"use client"

import { useEffect, useState } from "react"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { FloatingCreateButton } from "./floating-create-button"
import { useIOSViewportFix } from "@/hooks/use-ios-viewport-fix"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"

export function PWALayoutWrapper({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  
  // Apply iOS Safari viewport fixes
  useIOSViewportFix()
  
  // Enable auto-refresh on app focus
  useAutoRefresh()

  useEffect(() => {
    // Check if running as PWA (for future use)
    const checkPWA = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone
      // Log PWA status for debugging
      console.log('PWA Status:', isStandalone || isInStandaloneMode)
    }

    checkPWA()

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('resize', checkPWA)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('resize', checkPWA)
    }
  }, [])

  // Function to trigger PWA install
  const installPWA = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)
    setDeferredPrompt(null)
  }

  return (
    <>
      {children}
      <MobileBottomNav />
      <FloatingCreateButton />
      {deferredPrompt && (
        <div className="fixed top-4 left-4 right-4 z-50 md:hidden">
          <div className="bg-card border rounded-lg p-4 shadow-lg">
            <p className="text-sm mb-2">Install Emoji Studio for a better experience!</p>
            <div className="flex gap-2">
              <button
                onClick={installPWA}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
              >
                Install
              </button>
              <button
                onClick={() => setDeferredPrompt(null)}
                className="px-3 py-1 bg-muted rounded text-sm"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}