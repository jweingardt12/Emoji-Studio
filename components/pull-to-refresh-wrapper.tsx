"use client"

// Pull-to-refresh functionality has been disabled in favor of explicit refresh buttons
// This wrapper now simply passes through children without modification

interface PullToRefreshWrapperProps {
  children: React.ReactNode
}

export function PullToRefreshWrapper({ children }: PullToRefreshWrapperProps) {
  // Pull-to-refresh disabled - using explicit refresh buttons for better UX
  return <>{children}</>
}