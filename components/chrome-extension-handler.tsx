"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { initializeExtensionListener, type SlackAuthData, type SyncedEmojiData, type SyncedEmojiMeta } from "@/lib/chrome-extension"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { emojiStorage } from "@/lib/storage/indexed-db"
import { Emoji } from "@/lib/services/emoji-service"
import { EmojiImportStatus } from "@/components/emoji-import-status"
import { useTrack } from '@/lib/hooks/use-track'
import { toast } from "sonner"

export function ChromeExtensionHandler() {
  const searchParams = useSearchParams()
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const hasProcessed = useRef(false)
  const lastSyncTimeProcessed = useRef(0)
  const track = useTrack()

  // Function to process synced data from extension storage
  const processSyncedData = useCallback(async (data: SyncedEmojiData, meta: SyncedEmojiMeta, forceShowToast = false) => {
    console.log('[ChromeExtensionHandler] Processing synced data:', {
      workspace: data.workspace,
      emojiCount: data.emojiCount,
      hasToken: !!data.token,
      hasCookie: !!data.cookie,
      version: data.version,
      lastSyncTime: data.lastSyncTime
    })
    console.log('[ChromeExtensionHandler] Sync meta:', meta)

    // Prevent duplicate processing of the same sync
    const syncTime = data.lastSyncTime || Date.now();
    if (syncTime === lastSyncTimeProcessed.current) {
      console.log('[ChromeExtensionHandler] Already processed this sync data, skipping');
      return;
    }
    lastSyncTimeProcessed.current = syncTime;

    // Check if this is actually new data or just cached data being loaded
    const existingLastSyncTime = localStorage.getItem('lastSyncTime');
    const isNewSync = !existingLastSyncTime || syncTime > parseInt(existingLastSyncTime);

    try {
      // Validate we have actual emoji data
      if (!data.emojiData || !Array.isArray(data.emojiData)) {
        console.error('[ChromeExtensionHandler] Invalid emoji data received:', typeof data.emojiData);
        throw new Error('Invalid emoji data format');
      }

      console.log(`[ChromeExtensionHandler] Processing ${data.emojiData.length} emojis for workspace ${data.workspace}`);

      // Update emoji data in the app (optimistic update)
      setEmojiData(data.emojiData as Emoji[])
      setWorkspace(data.workspace)
      setHasRealData(true)

      // Save to storage with timestamp (this ensures atomicity and prevents race conditions)
      console.log(`[ChromeExtensionHandler] Saving to storage with timestamp ${syncTime}`);
      await emojiStorage.saveEmojis(data.emojiData, syncTime);

      // Update metadata in localStorage for tracking
      localStorage.setItem('workspace', data.workspace)
      localStorage.setItem('emojiCount', data.emojiCount.toString())
      localStorage.setItem('lastFetchTime', data.lastFetchTime)
      localStorage.setItem('lastSyncTime', syncTime.toString())

      // Store auth data if provided (for future API calls)
      if (data.token) {
        localStorage.setItem('extensionToken', data.token)
        console.log('[ChromeExtensionHandler] Stored extension token');
      }
      if (data.cookie) {
        localStorage.setItem('extensionCookie', data.cookie)
        console.log('[ChromeExtensionHandler] Stored extension cookie');
      }

      // Generate and store a curl command for compatibility with the refresh button
      // Now works with partial data - only requires workspace and at least token OR cookie
      if (data.workspace && (data.token || data.cookie)) {
        const timestamp = Math.floor(Date.now() / 1000)
        const token = data.token || ''
        const cookie = data.cookie || ''
        const curlCommand = `curl 'https://${data.workspace}.slack.com/api/emoji.adminList?_x_id=generated-${timestamp}&_x_version_ts=noversion&fp=98' \
          -H 'accept: */*' \
          -H 'accept-language: en-US,en;q=0.9' \
          -H 'cache-control: no-cache' \
          -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW' \
          -b '${cookie}' \
          -H 'pragma: no-cache' \
          -H 'sec-fetch-dest: empty' \
          -H 'sec-fetch-mode: cors' \
          -H 'sec-fetch-site: same-origin' \
          --data-raw $'------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="token"\\r\\n\\r\\n${token}\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="count"\\r\\n\\r\\n20000\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\\r\\n'`

        localStorage.setItem('slackCurlCommand', curlCommand)
        console.log('[ChromeExtensionHandler] Generated and stored curl command for refresh')
      } else {
        console.log('[ChromeExtensionHandler] Skipping curl command generation - missing workspace or auth data', {
          hasWorkspace: !!data.workspace,
          hasToken: !!data.token,
          hasCookie: !!data.cookie
        })
      }

      console.log(`[ChromeExtensionHandler] Successfully saved synced data`);

      // Dispatch event AFTER storage is complete with all data included
      window.dispatchEvent(new CustomEvent('emojiDataUpdated', {
        detail: {
          emojiData: data.emojiData,
          workspace: data.workspace,
          timestamp: syncTime
        }
      }));

      // Calculate non-alias emoji count (to match dashboard display)
      const nonAliasCount = (data.emojiData as Emoji[]).filter(emoji => !emoji.is_alias).length

      // Only show success toast if this is actually a NEW sync (not just loading cached data)
      if (isNewSync || forceShowToast) {
        toast.success(`Synced ${nonAliasCount} emojis from ${data.workspace}`, {
          description: `Last updated: ${new Date(data.lastFetchTime).toLocaleString()}`,
          duration: 4000,
        })
      } else {
        console.log('[ChromeExtensionHandler] Loaded cached data, not showing toast');
      }

      // Track event
      track('chrome_extension_synced_data', {
        emojiCount: data.emojiCount,
        nonAliasCount: nonAliasCount,
        workspace: data.workspace,
        version: data.version,
        source: 'background_sync'
      })

      // Hide loading overlay after data is successfully processed
      setProgress(100);
      setLoadingStage(`Processing complete!`);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
        setLoadingStage("");
      }, 1000);
    } catch (error) {
      console.error('[ChromeExtensionHandler] Error processing synced data:', error)
      toast.error('Failed to process synced data', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      // Hide loading overlay on error
      setIsLoading(false);
      setProgress(0);
      setLoadingStage("");
    }
  }, [setEmojiData, setWorkspace, setHasRealData, track, setIsLoading, setProgress, setLoadingStage])
  
  // Function to process extension data
  const processExtensionData = async (data: SlackAuthData) => {
    console.log('[ChromeExtensionHandler] Processing extension data:', data)
    
    if (hasProcessed.current) {
      console.log('[ChromeExtensionHandler] Already processed, ignoring duplicate')
      return
    }
    
    hasProcessed.current = true
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)
    
    try {
      setLoadingStage("Processing Chrome extension data...")
      setProgress(10)
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      // Convert extension data to curl command format
      const generateCurlFromExtensionData = (data: SlackAuthData): string => {
        const workspace = data.workspace || 'workspace'
        const timestamp = Math.floor(Date.now() / 1000)
        const xId = data.xId || `generated-${timestamp}`
        const url = `https://${workspace}.slack.com/api/emoji.adminList?_x_id=${xId}&_x_version_ts=noversion&fp=98`
        
        let curl = `curl '${url}'`
        curl += ` -H 'accept: */*'`
        curl += ` -H 'accept-language: en-US,en;q=0.9'`
        curl += ` -H 'cache-control: no-cache'`
        curl += ` -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'`
        
        if (data.cookie) {
          curl += ` -b '${data.cookie}'`
        }
        
        curl += ` -H 'pragma: no-cache'`
        curl += ` -H 'sec-fetch-dest: empty'`
        curl += ` -H 'sec-fetch-mode: cors'`
        curl += ` -H 'sec-fetch-site: same-origin'`
        curl += ` --data-raw $'------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="token"\\r\\n\\r\\n${data.token}\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="count"\\r\\n\\r\\n20000\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\\r\\n'`
        
        return curl
      }
      
      setLoadingStage("Parsing authentication data...")
      setProgress(20)
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      const curlCommand = generateCurlFromExtensionData(data)
      console.log('[ChromeExtensionHandler] Generated curl command:', curlCommand)
      
      // Parse the curl command to extract the request details
      const parsedData = parseSlackCurl(curlCommand)
      
      if (!parsedData.isValid || parsedData.error) {
        const errorMessage = parsedData.error || "Invalid authentication data"
        track('chrome_extension_invalid_data', {
          error: errorMessage,
          hasToken: !!parsedData.token,
          hasCookie: !!parsedData.cookie,
          hasWorkspace: !!parsedData.workspace,
        })
        throw new Error(errorMessage)
      }
      
      setLoadingStage("Connecting to Slack workspace...")
      setProgress(40)
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      const workspace = data.workspace || "workspace"
      localStorage.setItem("slackCurlCommand", curlCommand)
      localStorage.setItem("workspace", workspace)
      setWorkspace(workspace)
      
      // Transform parsed data into the format expected by the API
      const curlRequest = {
        url: parsedData.url,
        method: "POST",
        headers: {
          Cookie: parsedData.cookie || "",
        },
        formData: {
          token: parsedData.token || "",
          count: "100000", // Set very high to get all emojis
        },
      }
      
      setLoadingStage("Fetching emoji data...")
      setProgress(60)
      
      // Make the API request
      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ curlRequest }),
      })

      const responseText = await response.text()
      console.log("[ChromeExtensionHandler] API response text:", responseText)

      if (!response.ok) {
        let errorMessage = "Failed to fetch emoji data"
        try {
          const errorData = JSON.parse(responseText)
          console.error("[ChromeExtensionHandler] API error response:", errorData)
          errorMessage = errorData.error || errorMessage
          
          track('chrome_extension_api_error', {
            status: response.status,
            error: errorMessage,
            workspace: workspace,
          })
        } catch {
          console.error("[ChromeExtensionHandler] Failed to parse error response:", responseText)
        }
        throw new Error(`API error: ${errorMessage}`)
      }

      setLoadingStage("Processing emoji data...")
      setProgress(80)

      let responseData: any
      try {
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[ChromeExtensionHandler] Failed to parse response:", responseText)
        throw new Error("Invalid response format from server")
      }

      if (!responseData.emojis || !Array.isArray(responseData.emojis)) {
        console.error("[ChromeExtensionHandler] Invalid data format:", responseData)
        throw new Error("Invalid emoji data format")
      }

      const typedEmojis = responseData.emojis as Emoji[]
      setProgress(90)

      const syncTimestamp = Date.now();

      // Update the emoji data (optimistic update)
      setEmojiData(typedEmojis)
      setHasRealData(true)

      // Save to storage with timestamp
      console.log(`[ChromeExtensionHandler] Saving fetched data with timestamp ${syncTimestamp}`);
      await emojiStorage.saveEmojis(typedEmojis, syncTimestamp);

      // Update metadata in localStorage for tracking
      localStorage.setItem("emojiCount", typedEmojis.length.toString())
      localStorage.setItem("lastFetchTime", new Date().toISOString())
      localStorage.setItem("lastSyncTime", syncTimestamp.toString())

      console.log(`[ChromeExtensionHandler] Successfully saved ${typedEmojis.length} emojis`);

      // Dispatch event AFTER storage is complete
      window.dispatchEvent(new CustomEvent('emojiDataUpdated', {
        detail: {
          emojiData: typedEmojis,
          workspace: workspace,
          timestamp: syncTimestamp
        }
      }));

      setLoadingStage(`Success! Emojis loaded`)
      setProgress(100)
      setSuccess(`Successfully synced emojis from ${workspace}`)
      setIsLoading(false)

      track('chrome_extension_emojis_fetched', {
        emojiCount: typedEmojis.length,
        workspace: workspace,
        hasAliases: responseData.emojis.some((e: any) => e.is_alias),
      })

      // Remove the extension parameter from the URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('extension')
      window.history.replaceState({}, '', newUrl.toString())

      setTimeout(() => {
        setProgress(0)
        setLoadingStage("")
        setSuccess(null)
      }, 2000)

    } catch (error) {
      console.error('[ChromeExtensionHandler] Error processing extension data:', error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
      setIsLoading(false)
      setLoadingStage("")
      setProgress(0)
    }
  }

  useEffect(() => {
    console.log('[ChromeExtensionHandler] Component mounted')
    // Check if we're coming from the extension
    const fromExtension = searchParams.get('extension') === 'true'
    const syncStarting = searchParams.get('syncStarting') === 'true'
    console.log('[ChromeExtensionHandler] Extension parameter:', fromExtension)
    console.log('[ChromeExtensionHandler] SyncStarting parameter:', syncStarting)
    
    // If sync is starting, show loading overlay immediately
    if (syncStarting) {
      setIsLoading(true)
      setProgress(5)
      setLoadingStage("Preparing to sync...")
      setError(null)
      
      // Set a timeout to hide loading if sync doesn't start within 10 seconds
      const timeoutId = setTimeout(() => {
        console.log('[ChromeExtensionHandler] Sync timeout - no progress messages received');
        setIsLoading(false)
        setError("Sync timeout. Please ensure you've visited a Slack emoji page first.")
      }, 10000)
      
      // Clean up URL parameter after a delay
      setTimeout(() => {
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('syncStarting')
        window.history.replaceState({}, '', newUrl.toString())
      }, 2000)
      
      // Return cleanup function
      return () => {
        clearTimeout(timeoutId)
      }
    }
    
    // Always initialize the extension listener to handle synced data
    if (fromExtension && !hasProcessed.current) {
      console.log('[ChromeExtensionHandler] Setting up extension listener with sync handler')
      
      // Show loading overlay immediately
      setIsLoading(true)
      setLoadingStage("Waiting for Chrome extension data...")
      setProgress(10)
      
      // Set a timeout in case extension doesn't respond
      const timeoutId = setTimeout(() => {
        if (!hasProcessed.current) {
          console.log('[ChromeExtensionHandler] Timeout waiting for extension data')
          setError("Connection timeout. Please make sure the Chrome extension is installed and try again.")
          setIsLoading(false)
          setLoadingStage("")
          setProgress(0)
        }
      }, 10000) // 10 second timeout
      
      // Initialize Chrome extension listener with synced data handler
      initializeExtensionListener(
        (data: SlackAuthData) => {
          console.log('[ChromeExtensionHandler] Received data from extension:', data)
          // Clear the timeout
          clearTimeout(timeoutId)
          // Process immediately if we haven't already
          if (!hasProcessed.current) {
            processExtensionData(data)
          }
        },
        () => {
          console.log('[ChromeExtensionHandler] Clear data request from extension')
          // Clear all data when requested by extension
          localStorage.clear()
          sessionStorage.clear()
          setEmojiData([])
          setHasRealData(false)
          setWorkspace("")
          // Reload to ensure clean state
          window.location.href = "/settings"
        },
        (data: SyncedEmojiData, meta: SyncedEmojiMeta) => {
          // Force show toast when syncStarting=true
          const forceShow = searchParams.get('syncStarting') === 'true'
          processSyncedData(data, meta, forceShow)
        }
      )
    } else {
      // Even if not from extension, listen for synced data
      console.log('[ChromeExtensionHandler] Setting up listener for background synced data')
      initializeExtensionListener(
        (data: SlackAuthData) => {
          console.log('[ChromeExtensionHandler] Received auth data (not expected)')
        },
        () => {
          console.log('[ChromeExtensionHandler] Clear data request from extension')
          // Clear all data when requested by extension
          localStorage.clear()
          sessionStorage.clear()
          setEmojiData([])
          setHasRealData(false)
          setWorkspace("")
          // Reload to ensure clean state
          window.location.href = "/settings"
        },
        (data: SyncedEmojiData, meta: SyncedEmojiMeta) => {
          // Force show toast when syncStarting=true
          const forceShow = searchParams.get('syncStarting') === 'true'
          processSyncedData(data, meta, forceShow)
        }
      )
    }
  }, [searchParams, processSyncedData, setEmojiData, setWorkspace, setHasRealData])

  // Listen for sync progress messages from the extension
  useEffect(() => {
    const handleSyncProgress = (event: MessageEvent) => {
      if (event.data?.type === 'EMOJI_STUDIO_SYNC_PROGRESS') {
        const { status, workspace, emojiCount, error } = event.data;
        
        if (status === 'started') {
          console.log('[ChromeExtensionHandler] Sync started for:', workspace);
          setIsLoading(true);
          setProgress(20);
          setLoadingStage(`Syncing emojis from ${workspace}...`);
          setError(null);
        } else if (status === 'completed') {
          const { nonAliasCount } = event.data;
          const displayCount = nonAliasCount !== undefined ? nonAliasCount : emojiCount;
          console.log('[ChromeExtensionHandler] Sync completed for:', workspace, 'with', emojiCount, 'total emojis,', nonAliasCount, 'non-alias');
          setProgress(90);
          setLoadingStage(`Synced ${displayCount} emojis successfully!`);
          
          // DON'T hide the loading overlay yet - wait for data to be processed
          // The processSyncedData function will handle hiding it after data is stored
        } else if (status === 'error') {
          console.log('[ChromeExtensionHandler] Sync error for:', workspace, error);
          setProgress(0);
          setLoadingStage("");
          setError(`Sync failed: ${error}`);
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('message', handleSyncProgress);
    return () => window.removeEventListener('message', handleSyncProgress);
  }, []);

  return (
    <>
      <EmojiImportStatus
        isActive={isLoading}
        progress={progress}
        stage={loadingStage}
        description={isLoading ? "Syncing emojis via the Chrome extension." : undefined}
        isSuccess={Boolean(success) && progress >= 100}
        className="fixed bottom-6 right-6 z-[9999] w-80"
      />
      {error && !isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-destructive">Error</h3>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => {
                setError(null)
                // Remove the extension parameter and redirect to settings
                window.location.href = "/settings"
              }}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Settings
            </button>
          </div>
        </div>
      )}
    </>
  )
}