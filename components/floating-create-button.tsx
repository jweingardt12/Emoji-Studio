"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { CreateEmojiDrawer } from "./create-emoji-drawer"

export function FloatingCreateButton() {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Don't show on create or settings pages
  if (pathname === "/create" || pathname === "/settings") {
    return null
  }
  
  // Only show on mobile
  if (!isMobile) {
    return null
  }

  // Mobile-only floating button wrapped in drawer
  return (
    <CreateEmojiDrawer isMobile={isMobile}>
      <button
        className={cn(
          "fixed z-50",
          "bottom-20 right-4", // Account for mobile bottom nav
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-lg hover:shadow-xl",
          "hover:scale-110 active:scale-95",
          "transition-all duration-200",
          "group",
          "animate-in fade-in slide-in-from-bottom-5 duration-500"
        )}
        aria-label="Create new emoji"
        onClick={() => {
          // Haptic feedback on tap
          if ('vibrate' in navigator) {
            navigator.vibrate(10)
          }
        }}
      >
        <Plus className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </CreateEmojiDrawer>
  )
}