"use client"

import { useEffect, useRef } from "react"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"

export function useAutoRefresh() {
  const { hasRealData, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const lastRefreshTime = useRef<number>(0)
  const isRefreshing = useRef<boolean>(false)
  
  const STALE_DATA_THRESHOLD = 5 * 60 * 1000 // 5 minutes
  const MIN_REFRESH_INTERVAL = 30 * 1000 // 30 seconds minimum between refreshes

  const performRefresh = async () => {
    if (!hasRealData || isRefreshing.current) return
    
    const now = Date.now()
    if (now - lastRefreshTime.current < MIN_REFRESH_INTERVAL) return
    
    isRefreshing.current = true
    lastRefreshTime.current = now
    
    try {
      // Check for extension auth data first
      const extensionToken = localStorage.getItem("extensionToken")
      const extensionCookie = localStorage.getItem("extensionCookie")
      const workspace = localStorage.getItem("workspace")
      
      let curlCommand = ""
      
      if (extensionToken && extensionCookie && workspace) {
        // Use extension auth data
        const timestamp = Math.floor(Date.now() / 1000)
        curlCommand = `curl 'https://${workspace}.slack.com/api/emoji.adminList?_x_id=generated-${timestamp}&_x_version_ts=noversion&fp=98' \
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
      } else {
        // Fall back to stored curl command
        const lastCurl = localStorage.getItem("slackCurlCommand")
        if (!lastCurl?.trim()) return
        curlCommand = lastCurl.trim()
      }
      
      const parsed = parseSlackCurl(curlCommand)
      if (!parsed.isValid) return
      
      const { token, cookie } = parsed
      const url = parsed.url || ""
      
      const formData: Record<string, string> = {}
      if (token) formData.token = token
      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }
      
      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      
      if (!response.ok) return
      
      const data = await response.json()
      
      // Process emoji data
      let emojiArray = []
      if (data.emojis && Array.isArray(data.emojis)) {
        emojiArray = data.emojis
      } else if (data.emoji && Array.isArray(data.emoji)) {
        emojiArray = data.emoji
      } else if (data.slackResponse?.emoji) {
        const emojiObj = data.slackResponse.emoji
        if (typeof emojiObj === "object" && !Array.isArray(emojiObj)) {
          emojiArray = Object.entries(emojiObj).map(([name, url]) => ({
            name, url, is_alias: 0, user_id: "", created: Math.floor(Date.now() / 1000), user_display_name: "",
          }))
        } else if (Array.isArray(emojiObj)) {
          emojiArray = emojiObj
        }
      }
      
      if (emojiArray.length > 0) {
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
        
        const sortedData = [...recentData].sort((a, b) => (b.created || 0) - (a.created || 0))
        setEmojiData(sortedData)
        const workspaceName = parsed.workspace || "slack-workspace"
        setWorkspace(workspaceName)
        setHasRealData(true)
        localStorage.setItem("emojiData", JSON.stringify(sortedData))
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", sortedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        
        window.dispatchEvent(new CustomEvent("emojiDataUpdated", { 
          detail: { emojiData: sortedData, workspace: workspaceName, timestamp: Date.now() } 
        }))
      }
    } catch (error) {
      // Silent failure for auto-refresh
      console.log("Auto-refresh failed:", error)
    } finally {
      isRefreshing.current = false
    }
  }

  const checkDataFreshness = () => {
    if (!hasRealData) return
    
    const lastFetchTime = localStorage.getItem("lastFetchTime")
    if (!lastFetchTime) return
    
    const lastFetch = new Date(lastFetchTime).getTime()
    const now = Date.now()
    
    if (now - lastFetch > STALE_DATA_THRESHOLD) {
      performRefresh()
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check data freshness when app gains focus
    const handleFocus = () => {
      checkDataFreshness()
    }
    
    // Check data freshness when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkDataFreshness()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Initial check
    checkDataFreshness()
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [hasRealData])
}