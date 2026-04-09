"use client"

import { Card, CardContent } from "@/components/ui/card"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"

export function DataSection() {
  return (
    <div className="space-y-4">
      <FetchStatsDisplay />

      <Card size="sm" className="py-2">
        <CardContent className="px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Clear Data</p>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-3">
            <p className="text-xs text-destructive">
              This will remove all cached emojis, workspace data, and preferences. You'll need to reconnect to Slack.
            </p>
          </div>
          <ClearLocalStorageButton />
        </CardContent>
      </Card>
    </div>
  )
}
