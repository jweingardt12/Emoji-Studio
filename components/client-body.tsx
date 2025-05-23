"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function ClientBody({ children }: { children: ReactNode }) {
  // Use state to track client-side rendering
  const [isMounted, setIsMounted] = useState(false)
  
  // This effect will only run on the client side after initial render
  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setIsMounted(true)
  }, [])

  // During server-side rendering or first client render, return nothing
  // This completely avoids hydration mismatches from browser extensions like Grammarly
  if (!isMounted) {
    // Return an empty fragment with no DOM nodes
    return null
  }

  // Only render the actual content after client-side hydration is complete
  return <TooltipProvider>{children}</TooltipProvider>
}
