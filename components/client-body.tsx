"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export default function ClientBody({ children, className }: { children: ReactNode; className?: string }) {
  // Use state to track client-side rendering
  const [isMounted, setIsMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // This effect will only run on the client side after initial render
  useEffect(() => {
    // Mark as mounted to prevent hydration mismatch
    setIsMounted(true)
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // During server-side rendering or first client render, return nothing
  // This completely avoids hydration mismatches from browser extensions like Grammarly
  if (!isMounted) {
    // Return an empty fragment with no DOM nodes
    return null
  }

  // Only render the actual content after client-side hydration is complete
  return (
    <div className={cn(className, isMobile && "app-frame-locked")}>
      <TooltipProvider>{children}</TooltipProvider>
    </div>
  )
}
