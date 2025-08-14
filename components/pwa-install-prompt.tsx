"use client"

import { useState, useEffect } from "react"
import { X, Download, Smartphone, Share, Plus } from "lucide-react"
import { openpanel } from "@/lib/safe-openpanel"

interface PWAInstallPromptProps {
  deferredPrompt: any
  onDismiss: () => void
  onInstall: () => void
}

export function PWAInstallPrompt({ deferredPrompt, onDismiss, onInstall }: PWAInstallPromptProps) {
  const [isIOS, setIsIOS] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)
    
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedTime = localStorage.getItem('pwa-install-dismissed-time')
    
    if (dismissed === 'true' && dismissedTime) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) {
        setIsDismissed(true)
      } else {
        localStorage.removeItem('pwa-install-dismissed')
        localStorage.removeItem('pwa-install-dismissed-time')
      }
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true')
    localStorage.setItem('pwa-install-dismissed-time', Date.now().toString())
    openpanel.track("PWA: Install Prompt Dismissed", {
      platform: isIOS ? 'ios' : 'android'
    })
    onDismiss()
  }

  const handleInstall = () => {
    if (isIOS) {
      setShowInstructions(true)
      openpanel.track("PWA: iOS Install Instructions Shown", {})
    } else {
      onInstall()
    }
  }

  if (isDismissed) return null

  return (
    <>
      <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden animate-in slide-in-from-bottom-5 duration-500">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 shadow-2xl">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-white/80 hover:text-white"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg mb-1">
                Install Emoji Studio
              </h3>
              <p className="text-white/90 text-sm mb-3">
                Get the full app experience with offline access, faster loading, and home screen convenience!
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-white/30 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-500">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-6 w-6" />
            </button>
            
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Install on iOS
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mt-1">
                  <Share className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">1. Tap the Share button</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Find it in your Safari toolbar at the bottom</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mt-1">
                  <Plus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">2. Select "Add to Home Screen"</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Scroll down in the share menu to find this option</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-2 mt-1">
                  <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">3. Tap "Add"</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Emoji Studio will be added to your home screen</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowInstructions(false)
                handleDismiss()
              }}
              className="w-full mt-6 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  )
}