"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function DebugSlackCurl() {
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleDebug = async () => {
    setIsLoading(true)
    try {
      const curlCommand = localStorage.getItem("slackCurlCommand")
      if (!curlCommand) {
        setDebugInfo("No curl command found in local storage")
        return
      }

      // Test the curl command parsing
      setDebugInfo(`Testing curl command: ${curlCommand.substring(0, 50)}...`)

      // Make a test request to the API
      const response = await fetch("/api/slack-emojis/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ curl: curlCommand }),
      })

      const data = await response.json()
      setDebugInfo(JSON.stringify(data, null, 2))
    } catch (error) {
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleDebug} disabled={isLoading}>
        {isLoading ? "Testing..." : "Debug Curl Command"}
      </Button>

      {debugInfo && (
        <Card className="p-4 bg-muted">
          <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
        </Card>
      )}
    </div>
  )
}
