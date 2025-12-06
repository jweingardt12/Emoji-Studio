"use client"

import Image from "next/image"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { RefreshButton } from "@/components/refresh-button"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

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

        {/* Refresh button and theme toggle on the right */}
        <div className="flex items-center gap-1">
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
