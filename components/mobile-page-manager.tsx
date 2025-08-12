"use client"

import { useState, useEffect, ReactNode, Suspense } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

// Import page components directly for now (can optimize with dynamic imports later)
import DashboardPage from "@/app/dashboard/page"
import LeaderboardPage from "@/app/leaderboard/page"
import ExplorerPage from "@/app/explorer/page"
import MyEmojisPage from "@/app/my-emojis/page"
import SettingsPage from "@/app/settings/page"

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

interface PageConfig {
  component: React.ComponentType
  title: string
  preload?: boolean
}

const MOBILE_PAGES: Record<string, PageConfig> = {
  '/dashboard': { component: DashboardPage, title: 'Dashboard', preload: true },
  '/leaderboard': { component: LeaderboardPage, title: 'Leaderboard', preload: true },
  '/explorer': { component: ExplorerPage, title: 'Explorer' },
  '/my-emojis': { component: MyEmojisPage, title: 'My Emojis' },
  '/settings': { component: SettingsPage, title: 'Settings' },
}

interface MobilePageManagerProps {
  children: ReactNode
  fallbackPath?: string
}

export function MobilePageManager({ children, fallbackPath = '/dashboard' }: MobilePageManagerProps) {
  const pathname = usePathname()
  const [activePage, setActivePage] = useState(pathname)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [, setPageHistory] = useState<string[]>([pathname])

  // Check if current path is a mobile-managed page
  const isMobilePage = MOBILE_PAGES[pathname] !== undefined

  // Handle page transitions
  const navigateToPage = async (path: string, skipTransition = false) => {
    if (path === activePage) return

    if (!skipTransition) {
      setIsTransitioning(true)
      
      // Add haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }

      // Native app-like transition timing
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    setActivePage(path)
    setPageHistory(prev => [...prev.slice(-4), path]) // Keep last 5 pages
    
    // Update URL without full page reload
    if (window.location.pathname !== path) {
      window.history.pushState({ mobilePage: true }, '', path)
    }
    
    if (!skipTransition) {
      setTimeout(() => setIsTransitioning(false), 50)
    }
  }

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const newPath = window.location.pathname
      if (MOBILE_PAGES[newPath]) {
        navigateToPage(newPath, true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Expose navigation function globally for mobile nav
  useEffect(() => {
    (window as any).__mobileNavigate = navigateToPage
    return () => {
      delete (window as any).__mobileNavigate
    }
  }, [])

  // If not a mobile page, render children normally
  if (!isMobilePage) {
    return <>{children}</>
  }

  // Render mobile-managed page
  const pageConfig = MOBILE_PAGES[activePage]
  if (!pageConfig) {
    // Fallback to dashboard if page not found
    const fallbackConfig = MOBILE_PAGES[fallbackPath]
    if (fallbackConfig) {
      const FallbackComponent = fallbackConfig.component
      return (
        <div className="animate-in fade-in duration-200">
          <Suspense fallback={<PageLoader />}>
            <FallbackComponent />
          </Suspense>
        </div>
      )
    }
    return <>{children}</>
  }

  const PageComponent = pageConfig.component

  return (
    <div 
      className={cn(
        "h-full transition-all duration-150 ease-out",
        isTransitioning 
          ? "opacity-60 scale-[0.98]" 
          : "opacity-100 scale-100"
      )}
    >
      <Suspense fallback={<PageLoader />}>
        <div className="animate-in fade-in slide-in-from-right-2 duration-200">
          <PageComponent />
        </div>
      </Suspense>
    </div>
  )
}

// Hook for components to use mobile navigation
export function useMobileNavigation() {
  return {
    navigate: (path: string) => {
      if (typeof window !== 'undefined' && (window as any).__mobileNavigate) {
        (window as any).__mobileNavigate(path)
      }
    },
    canGoBack: () => {
      return window.history.length > 1
    },
    goBack: () => {
      if (window.history.length > 1) {
        window.history.back()
      }
    }
  }
}