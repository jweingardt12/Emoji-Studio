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

    return () => {
      // Dark mode is kept after leaving wrapped
    }
  }, [setTheme])

  return <>{children}</>
}
