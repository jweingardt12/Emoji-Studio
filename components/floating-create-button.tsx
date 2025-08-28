"use client"

import { useState, useEffect } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import dynamic from 'next/dynamic'

const MobileEmojiDrawer = dynamic(
  () => import('./mobile-emoji-drawer').then(mod => mod.MobileEmojiDrawer),
  {
    ssr: false,
    loading: () => null
  }
) as any

interface FloatingCreateButtonProps {
  isPWA?: boolean
}

export function FloatingCreateButton({ isPWA = false }: FloatingCreateButtonProps) {
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
    <MobileEmojiDrawer isMobile={isMobile}>
      <button
        className={cn(
          "fixed z-50",
          isPWA ? "bottom-28" : "bottom-24",
          "right-6",
          "flex h-14 w-14 items-center justify-center rounded-full",
          "bg-primary text-primary-foreground",
          "shadow-2xl hover:shadow-2xl",
          "drop-shadow-2xl hover:drop-shadow-2xl",
          "[box-shadow:0_20px_25px_-5px_rgba(0,0,0,0.3),0_10px_10px_-5px_rgba(0,0,0,0.2)]",
          "hover:scale-110 active:scale-95",
          "transition-all duration-200",
          "group",
          "animate-in fade-in slide-in-from-bottom-5 duration-500",
          "ring-1 ring-black/5"
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
    </MobileEmojiDrawer>
  )
}