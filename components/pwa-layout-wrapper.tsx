"use client"

import { useEffect, useState } from "react"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { FloatingCreateButton } from "./floating-create-button"
import { PWAInstallPrompt } from "./pwa-install-prompt"
import { useIOSViewportFix } from "@/hooks/use-ios-viewport-fix"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { useIsMobile } from "@/hooks/use-mobile"
import { openpanel } from "@/lib/safe-openpanel"

export function PWALayoutWrapper({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isPWA, setIsPWA] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const isMobile = useIsMobile()
  
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
      
      // Show install prompt if on mobile web but not in PWA
      if (isMobile && !pwaStatus) {
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        const dismissedTime = localStorage.getItem('pwa-install-dismissed-time')
        
        if (dismissed !== 'true' || !dismissedTime || 
            (Date.now() - parseInt(dismissedTime)) > (7 * 24 * 60 * 60 * 1000)) {
          setShowInstallPrompt(true)
        }
      }
      
      // Track PWA status
      if (pwaStatus) {
        openpanel.track("PWA: App Opened", {
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
          console.log('Service Worker registered successfully')
          
          openpanel.track("PWA: Service Worker Registered", {
            scope: registration.scope
          })
          
          // Check for updates periodically
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available, refresh to update')
                  openpanel.track("PWA: Update Available", {})
                  // Could show a toast here to notify user
                }
              })
            }
          })
        })
        .catch((error) => {
          console.warn('Service Worker registration failed:', error)
          openpanel.track("PWA: Service Worker Registration Failed", {
            error: error.message
          })
          // Don't break the app if SW fails, it's an enhancement
        })
    } else if (window.location.protocol !== 'https:') {
      console.log('Service Worker requires HTTPS')
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      openpanel.track("PWA: Install Prompt Available", {})
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('resize', checkPWA)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('resize', checkPWA)
    }
  }, [isMobile])

  // Function to trigger PWA install
  const installPWA = async () => {
    if (!deferredPrompt) return

    openpanel.track("PWA: Install Prompt Shown", {})
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)
    
    openpanel.track("PWA: Install Prompt Response", {
      outcome: outcome,
      accepted: outcome === 'accepted'
    })
    
    setDeferredPrompt(null)
  }

  return (
    <>
      {children}
      {/* Add spacer for mobile bottom nav */}
      <div className="md:hidden" style={{ height: isPWA ? '93px' : '80px' }} />
      <MobileBottomNav isPWA={isPWA} />
      <FloatingCreateButton isPWA={isPWA} />
      {/* Show install prompt for mobile web users (not PWA) */}
      {showInstallPrompt && isMobile && !isPWA && (
        <PWAInstallPrompt
          deferredPrompt={deferredPrompt}
          onDismiss={() => {
            setShowInstallPrompt(false)
            setDeferredPrompt(null)
          }}
          onInstall={installPWA}
        />
      )}
    </>
  )
}