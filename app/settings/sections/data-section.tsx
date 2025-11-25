"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"

export function DataSection() {
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold">Data Management</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your cached data and storage settings
        </p>
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <FetchStatsDisplay />
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold">Clear Local Storage</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Remove all cached data and preferences
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs text-destructive">
                  Warning: This will remove all cached emoji data, workspace information,
                  and stored preferences. You'll need to reconnect to Slack.
                </p>
              </div>
              <ClearLocalStorageButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
