"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, RefreshCwIcon } from "lucide-react"

export function FetchStatsDisplay() {
  const [fetchStats, setFetchStats] = useState<{
    count: number
    lastFetch: string
    workspace: string
  } | null>(null)

  useEffect(() => {
    // Function to load fetch stats from localStorage
    const loadFetchStats = () => {
      const count = localStorage.getItem("emojiCount")
      const lastFetch = localStorage.getItem("lastFetchTime")
      const workspace = localStorage.getItem("workspace")

      if (count && lastFetch && workspace) {
        setFetchStats({
          count: Number.parseInt(count, 10),
          lastFetch,
          workspace,
        })
      } else {
        setFetchStats(null)
      }
    }

    // Load stats initially
    loadFetchStats()

    // Listen for emoji data updates
    const handleEmojiDataUpdated = () => {
      loadFetchStats()
    }

    window.addEventListener("emojiDataUpdated", handleEmojiDataUpdated)

    // Also listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "emojiCount" || e.key === "lastFetchTime" || e.key === "workspace") {
        loadFetchStats()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("emojiDataUpdated", handleEmojiDataUpdated)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  if (!fetchStats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fetch Statistics</CardTitle>
          <CardDescription>No emoji data has been fetched yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the Slack Integration above to fetch emoji data from your workspace.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fetch Statistics</CardTitle>
        <CardDescription>Information about your emoji data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-primary/10 p-2">
              <RefreshCwIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Emoji Count</p>
              <p className="text-sm text-muted-foreground">
                {fetchStats.count.toLocaleString()} emojis fetched from workspace{" "}
                <span className="font-mono">{fetchStats.workspace}</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-primary/10 p-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">Last Updated</p>
              <p className="text-sm text-muted-foreground">{new Date(fetchStats.lastFetch).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
