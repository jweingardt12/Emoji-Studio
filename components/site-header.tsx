"use client"

import Image from "next/image"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { RefreshButton } from "@/components/refresh-button"
import { openCommandPalette } from "@/components/command-palette"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"

export function SiteHeader({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  // Get sidebar state to check if it's expanded or collapsed
  const { state } = useSidebar()
  const isExpanded = state === "expanded"
  const pathname = usePathname()
  const isDashboard = pathname === "/dashboard"
  
  return (
    <header className={cn("group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear", className)} {...props}>
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        
        {/* Logo and app name - only on dashboard for mobile, conditionally on desktop */}
        <div className="relative overflow-hidden flex-1">
          <div 
            className={cn(
              "flex items-center gap-2 transition-all duration-300 ease-in-out",
              // Desktop: show/hide based on sidebar state
              isExpanded ? 'lg:opacity-0 lg:-translate-x-8 lg:absolute' : 'lg:opacity-100 lg:translate-x-0',
              // Mobile: only show on dashboard
              !isDashboard && "md:flex hidden"
            )}
          >
            <Image 
              src="/logo.png" 
              alt="Emoji Studio Logo" 
              width={40} 
              height={40} 
              className="rounded-sm transition-transform duration-300 ease-in-out sm:w-8 sm:h-8" 
              priority 
            />
            <h1 className="text-xl font-semibold transition-opacity duration-300 ease-in-out sm:text-base">
              Emoji Studio
            </h1>
          </div>
        </div>

        {/* Search, refresh button and theme toggle on the right */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openCommandPalette}
            className="hidden sm:inline-flex items-center gap-2 h-8 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Search</span>
            <kbd className="pointer-events-none rounded border border-border bg-background px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
          <button
            type="button"
            onClick={openCommandPalette}
            className="sm:hidden inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
