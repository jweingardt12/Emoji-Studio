"use client"

import { usePathname } from "next/navigation"
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

interface MobileBottomNavProps {
  isPWA?: boolean
}

export function MobileBottomNav({ isPWA = false }: MobileBottomNavProps) {
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
      title: "My Emojis",
      url: "/my-emojis",
      icon: UserCircle,
    },
    {
      title: "Explorer",
      url: "/explorer",
      icon: Images,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
  ]

  const handleNavClick = (item: NavItem) => {
    trackNavigation(item.title, item.url)
    
    // Use mobile navigation if available, otherwise fallback to regular navigation
    if (typeof window !== 'undefined' && (window as any).__mobileNavigate) {
      (window as any).__mobileNavigate(item.url)
    } else {
      // Fallback to regular navigation
      window.location.href = item.url
    }
  }

  return (
    <>
      {/* Background fill for PWA mode */}
      {isPWA && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-background md:hidden z-30"
          style={{ height: '3px' }}
        />
      )}
      <nav 
        className="mobile-bottom-nav fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t md:hidden"
        style={{ bottom: isPWA ? '3px' : '0' }}
      >
        <div className="grid grid-cols-5 px-safe py-4" style={{ paddingBottom: isPWA ? 'calc(2rem + env(safe-area-inset-bottom))' : 'calc(1rem + env(safe-area-inset-bottom))' }}>
          {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.url
          
          return (
            <button
              key={item.url}
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
            </button>
          )
        })}
      </div>
    </nav>
    </>
  )
}