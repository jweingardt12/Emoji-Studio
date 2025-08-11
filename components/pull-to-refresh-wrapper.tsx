"use client"

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { toast } from "sonner"

interface PullToRefreshWrapperProps {
  children: React.ReactNode
  enabled?: boolean
}

export function PullToRefreshWrapper({ children, enabled = true }: PullToRefreshWrapperProps) {
  const { hasRealData, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  const handleRefresh = async () => {
    // If we're in demo mode (no real data), don't refresh
    if (!hasRealData) {
      console.log("In demo mode, refresh not available")
      return
    }
    
    // Check for extension auth data first
    const extensionToken = typeof window !== "undefined" ? localStorage.getItem("extensionToken") : null
    const extensionCookie = typeof window !== "undefined" ? localStorage.getItem("extensionCookie") : null
    const workspace = typeof window !== "undefined" ? localStorage.getItem("workspace") : null
    
    if (extensionToken && extensionCookie && workspace) {
      // We have extension auth data, construct a curl command from it
      console.log("Using extension auth data for refresh")
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
    console.log("Refresh via pull, curl command found:", !!lastCurl)
    
    // Only proceed if the curl command exists and is not just whitespace
    if (!lastCurl || !lastCurl.trim()) {
      console.log("No valid curl command found")
      toast.error("No Slack connection found. Please connect your workspace first.")
      return
    }
    
    await fetchWithCurl(lastCurl.trim())
  }

  // Helper to fetch with a curl command
  const fetchWithCurl = async (curl: string) => {
    try {
      const parsed = parseSlackCurl(curl)
      if (!parsed.isValid) {
        toast.error(parsed.error || "Invalid Slack curl command. Please check your connection.")
        return
      }
      
      // Extract necessary data from the curl command
      const { token, cookie } = parsed
      const url = parsed.url || ""
      
      // Create form data
      const formData: Record<string, string> = {}
      if (token) formData.token = token
      
      // Ensure we have count for emoji requests
      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }
      
      console.log("Making direct request to API proxy with curl data")
      
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
        console.error("Error response from API:", errorText)
        throw new Error(`Error from Slack API: ${errorText}`)
      }
      
      const data = await response.json()
      console.log("API response:", data)
      
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
        setEmojiData(sortedData)
        const workspaceName = parsed.workspace || "slack-workspace"
        setWorkspace(workspaceName)
        setHasRealData(true)
        localStorage.setItem("emojiData", JSON.stringify(sortedData))
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", sortedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        window.dispatchEvent(new CustomEvent("emojiDataUpdated", { 
          detail: { 
            emojiData: sortedData,
            workspace: workspaceName,
            timestamp: Date.now()
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
    }
  }

  const { isPulling, pullDistance, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 120, // Increased from 80 to require more deliberate pull
    enabled: enabled && hasRealData && typeof window !== 'undefined' && 'ontouchstart' in window
  })

  return (
    <div className="relative">
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 flex justify-center items-center transition-all z-50",
            "pointer-events-none"
          )}
          style={{
            transform: `translateY(${Math.min(pullDistance - 40, 40)}px)`,
            opacity: Math.min(pullProgress, 1)
          }}
        >
          <div className={cn(
            "bg-primary/10 backdrop-blur-sm rounded-full p-3 shadow-lg",
            isRefreshing && "animate-pulse"
          )}>
            <RefreshCw 
              className={cn(
                "h-5 w-5 text-primary transition-transform",
                isRefreshing && "animate-spin"
              )}
              style={{
                transform: `rotate(${pullProgress * 180}deg)`
              }}
            />
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div
        style={{
          transform: isPulling ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isPulling ? 'none' : 'transform 0.3s ease'
        }}
      >
        {children}
      </div>
    </div>
  )
}