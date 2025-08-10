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
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t md:hidden">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.url
          
          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={() => handleNavClick(item)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[60px]">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}