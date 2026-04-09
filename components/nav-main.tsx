"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { XCircle, ExternalLink } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.url
        const isRefresh = item.action === "refresh"
        const isFeedback = item.action === "feedback"
        const isSettings = item.url === "/settings"
        const isDisabled = (isRefresh && refreshing) || (!hasData && !isSettings && item.url !== "/wrapped" && !item.external && !isFeedback)

        // Handle refresh action
        const handleClick = (e: React.MouseEvent) => {
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
                "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground min-h-[44px]",
                isDisabled && "pointer-events-none opacity-50",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.title}</span>
              {item.badge && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground uppercase">
                  {item.badge}
                </span>
              )}
              <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </a>
          )
        }
        
        const linkContent = (
          <>
            <Icon className={cn("h-5 w-5 shrink-0 transition-colors duration-200", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground", isRefresh && refreshing && "animate-spin")} aria-hidden="true" />
            <span className="truncate">{item.title}</span>
            {item.badge && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground uppercase">
                {item.badge}
              </span>
            )}
            {item.indicator === "error" && (
              <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
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
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200 min-h-[44px]",
              isActive && "bg-accent/50 text-foreground",
              isDisabled && "pointer-events-none opacity-50",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-[var(--brand)]" />
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
