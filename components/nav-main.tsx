"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { XCircle } from "lucide-react"

interface NavMainProps {
  items: {
    title: string
    url: string
    icon: any
    action?: string
    indicator?: "error" | "warning" | "success" | "info"
    external?: boolean
  }[]
  onRefresh?: () => void
  refreshing?: boolean
  slackLoaded?: boolean
  onNavigate?: (navItem?: { title: string; url: string; icon: any; action?: string; indicator?: "error" | "warning" | "success" | "info"; external?: boolean }) => void
}

export function NavMain({ items, onRefresh, refreshing, slackLoaded, onNavigate }: NavMainProps) {
  const pathname = usePathname()

  return (
    <div className="grid gap-1 p-2">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.url
        const isRefresh = item.action === "refresh"
        const isDisabled = isRefresh && refreshing

        // Handle refresh action
        const handleClick = (e: React.MouseEvent) => {
          if (isRefresh) {
            e.preventDefault()
            onRefresh?.()
            return
          }
          // Pass the navigation item to track the event
          onNavigate?.(item)
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
        
        return (
          <Link
            key={item.title}
            href={item.url}
            onClick={handleClick}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground",
              isDisabled && "pointer-events-none opacity-50",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="truncate">{item.title}</span>
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
          </Link>
        )
      })}
    </div>
  )
}
