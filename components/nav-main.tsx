"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { XCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { TextShimmer } from "@/components/ui/text-shimmer"

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
        const isWrapped = item.url === "/wrapped"
        const isDisabled = (isRefresh && refreshing) || (!hasData && !isSettings && !isWrapped && !item.external && !isFeedback)

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
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
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
            <Icon className={cn("h-5 w-5 shrink-0", isRefresh && refreshing && "animate-spin")} aria-hidden="true" />
            <span className="truncate">{item.title}</span>
            {item.badge && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-green-700 px-2 py-0.5 text-xs font-medium text-white uppercase">
                {item.badge}
              </span>
            )}
            {item.indicator === "error" && (
              <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
            )}
          </>
        )

        // Special content for Wrapped link with shimmer effect
        const wrappedLinkContent = (
          <>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <TextShimmer
              as="span"
              className="text-sm font-medium [--base-color:#f97316] [--base-gradient-color:#fbbf24] dark:[--base-color:#f97316] dark:[--base-gradient-color:#fef3c7]"
              duration={1.5}
              spread={1.5}
            >
              {item.title}
            </TextShimmer>
            {item.badge && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-green-700 px-2 py-0.5 text-xs font-medium text-white uppercase">
                {item.badge}
              </span>
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
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground",
              isDisabled && "pointer-events-none opacity-50",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {isWrapped && !isActive ? wrappedLinkContent : linkContent}
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
