"use client"

import Link from "next/link"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/lib/analytics"
import { usePathname } from "next/navigation"

export function FloatingCreateButton() {
  const { trackNavigation } = useAnalytics()
  const pathname = usePathname()
  
  // Don't show on create page
  if (pathname === "/create") {
    return null
  }

  return (
    <Link
      href="/create"
      className={cn(
        "floating-create-btn fixed right-4 z-30 md:hidden",
        "flex h-14 w-14 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "transition-all duration-200 active:scale-90",
        "touch-target"
      )}
      aria-label="Create new emoji"
      onClick={() => {
        trackNavigation("Create", "/create")
        // Haptic feedback on tap
        if ('vibrate' in navigator) {
          navigator.vibrate(10)
        }
      }}
    >
      <Plus className="h-6 w-6" />
    </Link>
  )
}