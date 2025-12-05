"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

interface WrappedLayoutWrapperProps {
  children: React.ReactNode
}

export function WrappedLayoutWrapper({ children }: WrappedLayoutWrapperProps) {
  const { setTheme, theme } = useTheme()

  // Force dark mode for the wrapped experience
  useEffect(() => {
    // Store the original theme so we could restore it if needed
    const originalTheme = theme

    // Set to dark mode
    setTheme("dark")

    // Cleanup: optionally restore the original theme when leaving wrapped
    // For now, we'll keep it dark since the whole wrapped experience is dark-themed
    return () => {
      // If you want to restore the original theme when leaving:
      // if (originalTheme && originalTheme !== "dark") {
      //   setTheme(originalTheme)
      // }
    }
  }, [setTheme])

  return <>{children}</>
}
