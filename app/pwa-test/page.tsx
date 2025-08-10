"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle, Download, Smartphone } from "lucide-react"

export default function PWATestPage() {
  const [pwaStatus, setPwaStatus] = useState({
    serviceWorker: false,
    manifest: false,
    https: false,
    installable: false,
    standalone: false,
  })
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check service worker
    if ('serviceWorker' in navigator) {
      setPwaStatus(prev => ({ ...prev, serviceWorker: true }))
      navigator.serviceWorker.ready.then(() => {
        console.log('Service Worker is ready')
      })
    }

    // Check HTTPS
    setPwaStatus(prev => ({ ...prev, https: window.location.protocol === 'https:' || window.location.hostname === 'localhost' }))

    // Check standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (('standalone' in window.navigator) && (window.navigator as any).standalone)
    setPwaStatus(prev => ({ ...prev, standalone: isStandalone }))

    // Check manifest
    const manifestLink = document.querySelector('link[rel="manifest"]')
    setPwaStatus(prev => ({ ...prev, manifest: !!manifestLink }))

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPwaStatus(prev => ({ ...prev, installable: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const installPWA = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to install prompt: ${outcome}`)
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const StatusItem = ({ label, status }: { label: string; status: boolean }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="font-medium">{label}</span>
      {status ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
    </div>
  )

  return (
    <div className="container mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            PWA Status Check
          </CardTitle>
          <CardDescription>
            Test the Progressive Web App functionality of Emoji Studio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <StatusItem label="Service Worker Registered" status={pwaStatus.serviceWorker} />
            <StatusItem label="Manifest File Linked" status={pwaStatus.manifest} />
            <StatusItem label="HTTPS or Localhost" status={pwaStatus.https} />
            <StatusItem label="App Installable" status={pwaStatus.installable} />
            <StatusItem label="Running in Standalone Mode" status={pwaStatus.standalone} />
          </div>

          {deferredPrompt && (
            <div className="pt-4">
              <Button onClick={installPWA} className="w-full" size="lg">
                <Download className="mr-2 h-5 w-5" />
                Install Emoji Studio
              </Button>
            </div>
          )}

          {pwaStatus.standalone && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                You're running Emoji Studio as an installed PWA!
              </p>
            </div>
          )}

          <div className="pt-4 space-y-2 text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground">How to install:</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>On Chrome/Edge: Look for the install icon in the address bar</li>
              <li>On Safari iOS: Tap Share → Add to Home Screen</li>
              <li>On Android: Tap the menu → Install app</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}