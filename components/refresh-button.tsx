"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { emojiStorage } from "@/lib/storage/indexed-db"
import { toast } from "sonner"
import { useState } from "react"

export function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false)
  const { hasRealData, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  const handleRefresh = async () => {
    // If we're in demo mode (no real data), don't show the modal - just return early
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
    console.log("Refresh clicked, curl command found:", !!lastCurl)
    
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
        console.log(`Found ${emojiArray.length} emojis in data.emojis`);
      } else if (data.emoji && Array.isArray(data.emoji)) {
        emojiArray = data.emoji
        console.log(`Found ${emojiArray.length} emojis in data.emoji`);
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
          console.log(`Converted ${emojiArray.length} emojis from data.slackResponse.emoji object`);
        } else if (Array.isArray(emojiObj)) {
          emojiArray = emojiObj;
          console.log(`Found ${emojiArray.length} emojis in data.slackResponse.emoji array`);
        }
      }
      console.log(`Total emojis to process: ${emojiArray.length}`);
      
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
        console.log(`[RefreshButton] About to update context with ${sortedData.length} emojis`);

        const workspaceName = parsed.workspace || "slack-workspace"
        const syncTimestamp = Date.now();

        // Update context immediately (optimistic update)
        setEmojiData(sortedData)
        setWorkspace(workspaceName)
        setHasRealData(true)

        // Save to storage with timestamp (this ensures atomicity and prevents race conditions)
        console.log(`[RefreshButton] Saving to storage with timestamp ${syncTimestamp}`);
        await emojiStorage.saveEmojis(sortedData, syncTimestamp);

        // Update metadata in localStorage for tracking
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", sortedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())

        console.log(`[RefreshButton] Successfully saved ${sortedData.length} emojis from ${workspaceName}`)

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

  if (!hasRealData) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRefresh}
      disabled={refreshing}
      className="h-8 w-8 p-0"
    >
      <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
      <span className="sr-only">Refresh emoji data</span>
    </Button>
  )
}