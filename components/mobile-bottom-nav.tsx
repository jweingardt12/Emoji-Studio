"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboardIcon,
  TrophyIcon,
  Images,
  UserCircle,
  SettingsIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalytics } from "@/lib/analytics"

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { trackNavigation } = useAnalytics()

  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Leaderboard",
      url: "/leaderboard",
      icon: TrophyIcon,
    },
    {
      title: "Explorer",
      url: "/explorer",
      icon: Images,
    },
    {
      title: "My Emojis",
      url: "/my-emojis",
      icon: UserCircle,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
  ]

  const handleNavClick = (item: NavItem) => {
    trackNavigation(item.title, item.url)
    // Haptic feedback on tap
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t md:hidden">
      <div className="grid grid-cols-5 h-16 px-safe pb-safe pt-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.url
          
          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex items-center justify-center transition-colors relative touch-target",
                "active:scale-95 active:opacity-70",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              aria-label={item.title}
            >
              <Icon className="h-6 w-6" />
              {/* Visual indicator for active state */}
              {isActive && (
                <div className="absolute bottom-0 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}