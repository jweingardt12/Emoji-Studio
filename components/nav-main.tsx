"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { XCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { triggerHaptic } from "@/lib/utils/animations"

interface NavMainProps {
  items: {
    title: string
    url: string
    icon: any
    action?: string
    indicator?: "error" | "warning" | "success" | "info"
    external?: boolean
    badge?: string
  }[]
  onRefresh?: () => void
  refreshing?: boolean
  slackLoaded?: boolean
  onNavigate?: (navItem?: { title: string; url: string; icon: any; action?: string; indicator?: "error" | "warning" | "success" | "info"; external?: boolean; badge?: string }) => void
  hasData?: boolean
  onFeedback?: () => void
}

export function NavMain({ items, onRefresh, refreshing, slackLoaded, onNavigate, hasData = true, onFeedback }: NavMainProps) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="grid gap-1 p-2">
      {items.map((item, index) => {
        const Icon = item.icon
        const isActive = pathname === item.url
        const isRefresh = item.action === "refresh"
        const isFeedback = item.action === "feedback"
        const isSettings = item.url === "/settings"
        const isDisabled = (isRefresh && refreshing) || (!hasData && !isSettings && !item.external && !isFeedback)

        // Handle refresh action
        const handleClick = (e: React.MouseEvent) => {
          // Trigger haptic feedback on mobile
          triggerHaptic("light")

          if (isDisabled) {
            e.preventDefault()
            return
          }
          if (isRefresh) {
            e.preventDefault()
            onRefresh?.()
            return
          }
          if (isFeedback) {
            e.preventDefault()
            onFeedback?.()
            // Track navigation for feedback
            onNavigate?.(item)
            return
          }

          // For internal navigation, don't prevent default - let Link handle it naturally
          // Just call onNavigate for tracking/sidebar closing
          if (!item.external) {
            onNavigate?.(item)
            // Don't prevent default, don't call router.push - let Link component handle navigation
          }
        }

        // Handle external links
        if (item.external) {
          return (
            <a
              key={item.title}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                "transition-all duration-150 ease-out",
                "hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5",
                "active:scale-[0.98] active:bg-accent/80",
                isDisabled && "pointer-events-none opacity-50",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-green-700 px-2 py-0.5 text-xs font-medium text-white uppercase">
                  {item.badge}
                </span>
              )}
              {/* External link indicator */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="ml-auto h-3 w-3 text-muted-foreground"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          )
        }
        
        const linkContent = (
          <>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.title}</span>
            {item.badge && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-green-700 px-2 py-0.5 text-xs font-medium text-white uppercase">
                {item.badge}
              </span>
            )}
            {item.indicator === "error" && (
              <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
            )}
            {isRefresh && refreshing && (
              <svg
                className="ml-auto h-4 w-4 animate-spin text-muted-foreground"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
          </>
        )

        const link = (
          <Link
            key={item.title}
            href={item.url}
            onClick={handleClick}
            prefetch={true}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              "transition-all duration-150 ease-out",
              "hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5",
              "active:scale-[0.98] active:bg-accent/80",
              isActive && "bg-accent text-accent-foreground",
              isDisabled && "pointer-events-none opacity-50",
            )}
            aria-current={isActive ? "page" : undefined}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full transition-all duration-200" />
            )}
            {linkContent}
          </Link>
        )

        // Wrap in tooltip if disabled due to no data
        if (isDisabled && !hasData && !isSettings) {
          return (
            <TooltipProvider key={item.title}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {link}
                </TooltipTrigger>
                <TooltipContent>
                  <p>Connect to Slack first</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }

        return link
      })}
    </div>
  )
}
