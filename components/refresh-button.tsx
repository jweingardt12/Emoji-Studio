"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { emojiStorage } from "@/lib/storage/indexed-db"
import { toast } from "sonner"
import { useState, useEffect, useCallback } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false)
  const { hasRealData, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  const handleRefresh = async () => {
    // If we're in demo mode (no real data), don't show the modal - just return early
    if (!hasRealData) {
      return
    }
    
    // Check for extension auth data first
    const extensionToken = typeof window !== "undefined" ? localStorage.getItem("extensionToken") : null
    const extensionCookie = typeof window !== "undefined" ? localStorage.getItem("extensionCookie") : null
    const workspace = typeof window !== "undefined" ? localStorage.getItem("workspace") : null
    
    if (extensionToken && extensionCookie && workspace) {
      const timestamp = Math.floor(Date.now() / 1000)
      const curlCommand = `curl 'https://${workspace}.slack.com/api/emoji.adminList?_x_id=generated-${timestamp}&_x_version_ts=noversion&fp=98' \
        -H 'accept: */*' \
        -H 'accept-language: en-US,en;q=0.9' \
        -H 'cache-control: no-cache' \
        -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
        -b '${extensionCookie}' \
        -H 'pragma: no-cache' \
        -H 'sec-fetch-dest: empty' \
        -H 'sec-fetch-mode: cors' \
        -H 'sec-fetch-site: same-origin' \
        --data-raw $'------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="token"\\r\\n\\r\\n${extensionToken}\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="count"\\r\\n\\r\\n20000\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\\r\\n'`
      
      await fetchWithCurl(curlCommand)
      return
    }
    
    // Fall back to checking for a stored curl command
    const lastCurl = typeof window !== "undefined" ? localStorage.getItem("slackCurlCommand") : null

    // Only proceed if the curl command exists and is not just whitespace
    if (!lastCurl || !lastCurl.trim()) {
      toast.error("No Slack connection found. Please connect your workspace first.")
      return
    }
    
    await fetchWithCurl(lastCurl.trim())
  }

  // Helper to fetch with a curl command
  const fetchWithCurl = async (curl: string) => {
    setRefreshing(true)
    try {
      const parsed = parseSlackCurl(curl)
      if (!parsed.isValid) {
        toast.error(parsed.error || "Invalid Slack curl command. Please check your connection.")
        setRefreshing(false)
        return
      }
      
      // Extract necessary data from the curl command
      const { token, cookie, workspace } = parsed
      const url = parsed.url || ""
      
      // Create form data
      const formData: Record<string, string> = {}
      if (token) formData.token = token
      
      // Ensure we have count for emoji requests
      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }
      
      // Make the request to our API endpoint
      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          curlRequest: {
            url,
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              ...(cookie ? { Cookie: cookie } : {}),
            },
            formData,
          },
        }),
      })
      
      // Parse the response
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error from Slack API: ${errorText}`)
      }
      
      const data = await response.json()
      
      // Process the emoji data
      let emojiArray = []
      if (data.emojis && Array.isArray(data.emojis)) {
        emojiArray = data.emojis
      } else if (data.emoji && Array.isArray(data.emoji)) {
        emojiArray = data.emoji
      } else if (data.slackResponse && data.slackResponse.emoji) {
        const emojiObj = data.slackResponse.emoji
        if (typeof emojiObj === "object" && !Array.isArray(emojiObj)) {
          emojiArray = Object.entries(emojiObj).map(([name, url]) => ({
            name,
            url,
            is_alias: 0,
            user_id: "",
            created: Math.floor(Date.now() / 1000),
            user_display_name: "",
          }))
        } else if (Array.isArray(emojiObj)) {
          emojiArray = emojiObj;
        }
      }

      // Process the emoji array with consistent fields
      const recentData = emojiArray.map((emoji: any) => ({
        name: emoji.name,
        url: emoji.url,
        team_id: emoji.team_id || "",
        user_id: emoji.user_id || "",
        created: (emoji.created && emoji.created > 0) ? emoji.created : Math.floor(Date.now() / 1000),
        is_alias: emoji.is_alias || 0,
        alias_for: emoji.alias_for || "",
        is_bad: emoji.is_bad || false,
        user_display_name: emoji.user_display_name || "",
        can_delete: emoji.can_delete || false,
        aliases: emoji.aliases || [],
      }))
      
      if (recentData && Array.isArray(recentData) && recentData.length > 0) {
        // Sort by created timestamp descending (newest first)
        const sortedData = [...recentData].sort((a, b) => (b.created || 0) - (a.created || 0));

        const workspaceName = parsed.workspace || "slack-workspace"
        const syncTimestamp = Date.now();

        // Update context immediately (optimistic update)
        setEmojiData(sortedData)
        setWorkspace(workspaceName)
        setHasRealData(true)

        // Save to storage with timestamp (this ensures atomicity and prevents race conditions)
        await emojiStorage.saveEmojis(sortedData, syncTimestamp);

        // Update metadata in localStorage for tracking
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", sortedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())

        // Dispatch event AFTER storage is complete with all data included
        window.dispatchEvent(new CustomEvent("emojiDataUpdated", {
          detail: {
            emojiData: sortedData,
            workspace: workspaceName,
            timestamp: syncTimestamp
          }
        }))

        toast.success(`Successfully refreshed ${sortedData.length} emojis!`)
      } else {
        toast.error("No emoji data returned from Slack. Please check your connection.")
      }
    } catch (err) {
      // Check for invalid_auth error specifically
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred."
      const isAuthError = errorMessage.includes("invalid_auth")
      
      toast.error(isAuthError 
        ? "Your Slack token has expired. Please update your connection." 
        : errorMessage || "Failed to fetch emojis from Slack.")
    } finally {
      setRefreshing(false)
    }
  }

  // Data freshness indicator
  const [lastFetchLabel, setLastFetchLabel] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)

  const updateFreshnessLabel = useCallback(() => {
    const lastFetch = localStorage.getItem("lastFetchTime")
    if (!lastFetch) { setLastFetchLabel(null); return }
    const diff = Date.now() - new Date(lastFetch).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    setIsStale(hours >= 24)

    if (minutes < 1) setLastFetchLabel("Just now")
    else if (minutes < 60) setLastFetchLabel(`${minutes}m ago`)
    else if (hours < 24) setLastFetchLabel(`${hours}h ago`)
    else setLastFetchLabel(`${days}d ago`)
  }, [])

  useEffect(() => {
    updateFreshnessLabel()
    const interval = setInterval(updateFreshnessLabel, 60000)
    return () => clearInterval(interval)
  }, [updateFreshnessLabel])

  // Update label immediately after refresh completes
  useEffect(() => {
    if (!refreshing) updateFreshnessLabel()
  }, [refreshing, updateFreshnessLabel])

  if (!hasRealData) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            {lastFetchLabel && (
              <span className={cn("text-[10px] tabular-nums hidden sm:inline", isStale ? "text-warning" : "text-muted-foreground")}>
                {lastFetchLabel}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8 p-0 relative"
            >
              {isStale && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-warning" />
              )}
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              <span className="sr-only">Refresh emoji data</span>
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{lastFetchLabel ? `Updated ${lastFetchLabel}` : "Refresh emoji data"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}