"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Check if it's a PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone === true ||
                  document.referrer.includes('android-app://');
    
    // Check if opened from extension
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('extension') === 'true') {
      // Redirect to dashboard with extension parameter to show processing
      router.push("/dashboard?extension=true")
      return;
    }
    
    // For PWA users, check if it's their first time
    if (isPWA) {
      const hasSeenPWAOnboarding = localStorage.getItem('pwaOnboardingComplete');
      const hasEmojiData = localStorage.getItem('emojiData');
      const hasSlackCurl = localStorage.getItem('slackCurlCommand');
      
      // If no onboarding done and no data synced, go to settings
      if (!hasSeenPWAOnboarding && (!hasEmojiData || !hasSlackCurl)) {
        // Mark that we're showing onboarding
        localStorage.setItem('pwaOnboardingComplete', 'true');
        router.push("/settings?pwa=first");
        return;
      }
    }
    
    // Default to dashboard
    router.push("/dashboard")
  }, [router])
  
  return null
}