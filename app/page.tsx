"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { openpanel } from "@/lib/safe-openpanel"

export default function RootPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Check if it's a PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true ||
                  document.referrer.includes('android-app://');
    
    // Check for existing data
    const hasEmojiData = localStorage.getItem('emojiData');
    const hasSlackCurl = localStorage.getItem('slackCurlCommand');
    
    // Track landing page visit
    openpanel.track("Landing Page: Visited", {
      isPWA: isPWA,
      hasEmojiData: !!hasEmojiData,
      hasSlackCurl: !!hasSlackCurl,
      referrer: document.referrer
    })
    
    // Check if opened from extension
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('extension') === 'true') {
      // Redirect to dashboard with extension parameter to show processing
      openpanel.track("Landing Page: Extension Redirect", {})
      router.push("/dashboard?extension=true")
      return;
    }
    
    // For PWA users, check if it's their first time
    if (isPWA) {
      const hasSeenPWAOnboarding = localStorage.getItem('pwaOnboardingComplete');
      
      // If no onboarding done and no data synced, go to settings
      if (!hasSeenPWAOnboarding && (!hasEmojiData || !hasSlackCurl)) {
        // Mark that we're showing onboarding
        localStorage.setItem('pwaOnboardingComplete', 'true');
        
        openpanel.track("PWA: First Time Onboarding", {
          hasData: !!hasEmojiData,
          hasCurl: !!hasSlackCurl
        })
        
        router.push("/settings?pwa=first");
        return;
      }
    }
    
    // Default to dashboard
    openpanel.track("Landing Page: Auto Redirect", {
      destination: "dashboard",
      reason: isPWA ? "pwa_has_data" : "default",
      isPWA: isPWA
    })
    router.push("/dashboard")
  }, [router])
  
  return null
}