"use client"

import Link from "next/link"
import { Loader2, Settings, Sparkles, type LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useDemoLoader } from "@/lib/hooks/use-demo-loader"

interface ConnectWorkspaceEmptyStateProps {
  icon: LucideIcon
  title?: string
  description: string
  /** Analytics source for the "Try demo data" action. */
  demoSource: string
  /** Hide the demo button, e.g. when demo data is already loaded. */
  showDemoAction?: boolean
}

/**
 * Shared "connect your workspace" empty state for data-gated pages,
 * following the pattern established on the Usage (reactions) page:
 * a dashed card with a settings link plus a one-click demo-data option.
 */
export function ConnectWorkspaceEmptyState({
  icon: Icon,
  title = "Connect to Slack to get started",
  description,
  demoSource,
  showDemoAction = true,
}: ConnectWorkspaceEmptyStateProps) {
  const { loadDemoData, isLoadingDemo } = useDemoLoader({ source: demoSource })

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" aria-hidden="true" />
              Go to Settings
            </Link>
            {showDemoAction && (
              <button
                type="button"
                onClick={loadDemoData}
                disabled={isLoadingDemo}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-60"
              >
                {isLoadingDemo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isLoadingDemo ? "Loading demo…" : "Try demo data"}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
