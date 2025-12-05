"use client"

import { useState, useEffect } from "react"
import { X, Download, Share, Plus, ChevronUp } from "lucide-react"
import { useTrack } from "@/lib/hooks/use-track"
import { cn } from "@/lib/utils"

interface PWAInstallPromptProps {
  deferredPrompt: any
  onDismiss: () => void
  onInstall: () => void
}

export function PWAInstallPrompt({ deferredPrompt, onDismiss, onInstall }: PWAInstallPromptProps) {
  const track = useTrack();
  const [isIOS, setIsIOS] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

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
    track("PWA: Install Prompt Dismissed", {
      platform: isIOS ? 'ios' : 'android'
    })
    onDismiss()
  }

  const handleInstall = () => {
    if (isIOS) {
      setShowInstructions(true)
      track("PWA: iOS Install Instructions Shown", {})
    } else {
      onInstall()
    }
  }

  if (isDismissed) return null

  return (
    <>
      <div 
        className={cn(
          "fixed left-2 right-2 z-40 md:hidden transition-all duration-500 ease-out",
          isMinimized ? "bottom-[88px]" : "bottom-[88px]"
        )}
      >
        <div 
          className={cn(
            "relative overflow-hidden rounded-2xl border border-border/50",
            "bg-background/80 backdrop-blur-xl shadow-2xl",
            "animate-in slide-in-from-bottom-5 fade-in duration-700"
          )}
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          
          {/* Content */}
          <div className={cn(
            "relative p-4 transition-all duration-300",
            isMinimized && "pb-2"
          )}>
            {!isMinimized ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-base mb-1">
                      Install Emoji Studio
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Add to your home screen for the best experience
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleInstall}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl font-medium text-sm",
                      "bg-primary text-primary-foreground",
                      "hover:bg-primary/90 active:scale-[0.98]",
                      "transition-all duration-200",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    {isIOS ? (
                      <>
                        <Share className="h-4 w-4" />
                        Install App
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Install App
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsMinimized(true)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl font-medium text-sm",
                      "bg-muted/50 text-muted-foreground",
                      "hover:bg-muted active:scale-[0.98]",
                      "transition-all duration-200"
                    )}
                  >
                    Not Now
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsMinimized(false)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Install Emoji Studio</span>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {showInstructions && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-500 border-t border-border/50">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h3 className="text-lg font-semibold mb-6 text-foreground">
              How to Install
            </h3>
            
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Share className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Tap the Share button</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Located in your Safari toolbar</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Add to Home Screen</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Scroll down in the share menu</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">Tap "Add"</p>
                  <p className="text-xs text-muted-foreground mt-0.5">The app will appear on your home screen</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowInstructions(false)
                handleDismiss()
              }}
              className={cn(
                "w-full mt-6 py-3 rounded-xl font-medium text-sm",
                "bg-muted/50 text-foreground",
                "hover:bg-muted active:scale-[0.98]",
                "transition-all duration-200"
              )}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}