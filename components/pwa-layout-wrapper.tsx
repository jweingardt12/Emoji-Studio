"use client"

import { useEffect, useState } from "react"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { FloatingCreateButton } from "./floating-create-button"
import { useIOSViewportFix } from "@/hooks/use-ios-viewport-fix"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"

export function PWALayoutWrapper({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
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
      // Log PWA status for debugging
      console.log('PWA Status:', pwaStatus)
    }

    checkPWA()

    // Register service worker with better error handling
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully')
          
          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available, refresh to update')
                  // Could show a toast here to notify user
                }
              })
            }
          })
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
          // Don't break the app if SW fails, it's an enhancement
        })
    } else if (window.location.protocol !== 'https:') {
      console.log('Service Worker requires HTTPS')
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
      {/* Add spacer for mobile bottom nav */}
      <div className="md:hidden" style={{ height: isPWA ? '93px' : '80px' }} />
      <MobileBottomNav isPWA={isPWA} />
      <FloatingCreateButton isPWA={isPWA} />
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