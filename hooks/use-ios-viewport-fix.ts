"use client"

import { useEffect } from "react"

export function useIOSViewportFix() {
  useEffect(() => {
    // Only run on iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    
    if (isIOS && isSafari) {
      // Set CSS custom property for viewport height
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)
      }

      // Set initial value
      setViewportHeight()

      // Update on resize and orientation change
      window.addEventListener('resize', setViewportHeight)
      window.addEventListener('orientationchange', () => {
        // Delay to account for iOS Safari's animation
        setTimeout(setViewportHeight, 500)
      })

      // Cleanup
      return () => {
        window.removeEventListener('resize', setViewportHeight)
        window.removeEventListener('orientationchange', setViewportHeight)
      }
    }
  }, [])
}