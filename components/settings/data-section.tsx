"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"

export function DataSection() {
  return (
    <div className="space-y-4">
      <FetchStatsDisplay />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Clear Data</CardTitle>
          <CardDescription>Remove all cached data and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
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
