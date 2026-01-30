"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Dashboard Error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <div className="rounded-full bg-destructive/10 p-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Failed to load dashboard</h2>
          <p className="text-sm text-muted-foreground">
            There was a problem loading your emoji data. This might be a temporary issue.
          </p>
        </div>

        <Button onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    </div>
  )
}
