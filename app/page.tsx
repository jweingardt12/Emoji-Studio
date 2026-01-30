"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTrack } from "@/lib/hooks/use-track"

/**
 * Root Page - Handles client-side redirects that require browser APIs
 * Note: Extension redirects (extension=true) are handled by middleware.ts
 */
export default function RootPage() {
  const router = useRouter()
  const track = useTrack()

  useEffect(() => {
    // Check if it's a PWA (requires client-side matchMedia)
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true ||
                  document.referrer.includes('android-app://');

    // Check for existing data (requires localStorage)
    const hasEmojiData = localStorage.getItem('emojiData');
    const hasSlackCurl = localStorage.getItem('slackCurlCommand');

    // Track landing page visit
    track("Landing Page: Visited", {
      isPWA: isPWA,
      hasEmojiData: !!hasEmojiData,
      hasSlackCurl: !!hasSlackCurl,
      referrer: document.referrer
    })

    // For PWA users, check if it's their first time
    if (isPWA) {
      const hasSeenPWAOnboarding = localStorage.getItem('pwaOnboardingComplete');

      // If no onboarding done and no data synced, go to settings
      if (!hasSeenPWAOnboarding && (!hasEmojiData || !hasSlackCurl)) {
        // Mark that we're showing onboarding
        localStorage.setItem('pwaOnboardingComplete', 'true');

        track("PWA: First Time Onboarding", {
          hasData: !!hasEmojiData,
          hasCurl: !!hasSlackCurl
        })

        router.push("/settings?pwa=first");
        return;
      }
    }

    // Default to dashboard
    track("Landing Page: Auto Redirect", {
      destination: "dashboard",
      reason: isPWA ? "pwa_has_data" : "default",
      isPWA: isPWA
    })
    router.push("/dashboard")
  }, [router, track])

  return null
}