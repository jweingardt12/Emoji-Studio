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

  const handleClick = () => {
    trackNavigation("Create", "/create")
  }

  return (
    <Link
      href="/create"
      onClick={handleClick}
      className={cn(
        "floating-create-btn fixed z-50 md:hidden mr-safe",
        "flex h-14 w-14 items-center justify-center",
        "rounded-full bg-primary text-primary-foreground shadow-lg",
        "hover:bg-primary/90 active:scale-95",
        "transition-all duration-150"
      )}
      style={{
        bottom: "calc(4rem + 1rem + env(safe-area-inset-bottom))",
        right: "1rem"
      }}
      aria-label="Create new emoji"
    >
      <Plus className="h-6 w-6" />
    </Link>
  )
}