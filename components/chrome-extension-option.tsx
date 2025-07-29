"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle as CheckCircleIcon, Download as DownloadIcon, Monitor as ChromeIcon, AlertCircle as AlertCircleIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { initializeExtensionListener, type SlackAuthData, validateSlackAuthData } from "@/lib/chrome-extension"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useOpenPanel } from '@openpanel/nextjs'

export function ChromeExtensionOption() {
  const router = useRouter()
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const op = useOpenPanel()
  const isConnectingRef = useRef(false)

  useEffect(() => {
    // Check if Chrome extension is installed by trying to communicate with it
    const checkExtension = () => {
      if (typeof window !== 'undefined' && window.postMessage) {
        window.postMessage({ type: 'CHECK_EXTENSION' }, '*')
        
        const timeout = setTimeout(() => {
          setIsExtensionInstalled(false)
        }, 1000)

        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'EXTENSION_AVAILABLE') {
            clearTimeout(timeout)
            setIsExtensionInstalled(true)
            window.removeEventListener('message', handleMessage)
          }
        }

        window.addEventListener('message', handleMessage)
        
        return () => {
          clearTimeout(timeout)
          window.removeEventListener('message', handleMessage)
        }
      }
    }

    checkExtension()
  }, [])

  useEffect(() => {
    // Check URL params to see if we came from extension
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('extension') === 'true') {
      console.log('Extension parameter detected, waiting for data...');
      setIsConnecting(true);
      isConnectingRef.current = true;
      setError(null);
      setSuccess('Waiting for data from Chrome extension...');
      
      // Set a timeout in case data doesn't arrive
      const timeoutId = setTimeout(() => {
        if (isConnectingRef.current) {
          console.log('Timeout waiting for extension data');
          setError('No data received from extension. Please try clicking "Sync to Emoji Studio" again.');
          setIsConnecting(false);
          isConnectingRef.current = false;
          setSuccess(null);
        }
      }, 10000); // 10 second timeout
      
      // Store timeout ID for cleanup
      return () => clearTimeout(timeoutId);
    }
    
    // Initialize Chrome extension listener
    initializeExtensionListener(
      (data: SlackAuthData) => {
        console.log('Received data from Chrome extension:', data)
        
        // Validate the data before processing
        if (!data || !data.workspace || !data.token || !data.cookie) {
          console.error('Invalid extension data format:', data)
          setError('Invalid data received from Chrome extension. Please make sure you are logged into Slack and try again.')
          setIsConnecting(false)
          return
        }
        
        setIsConnecting(true)
        isConnectingRef.current = true
        setError(null)
        
        // Process the extension data
        processExtensionData(data)
      },
      () => {
        console.log('Clear data request received from extension')
        // Clear all data when requested by extension
        localStorage.clear()
        sessionStorage.clear()
        setEmojiData([])
        setHasRealData(false)
        setWorkspace("")
        // Redirect to settings
        window.location.href = "/settings"
      }
    )
  }, [])

  const processExtensionData = async (data: SlackAuthData) => {
    try {
      const workspace = data.workspace || 'slack-workspace'
      
      // Store the auth data
      localStorage.setItem("workspace", workspace)
      setWorkspace(workspace)

      setSuccess('Data received from Chrome extension! Processing...')
      
      // Generate curl command from extension data for API compatibility
      const curlFromExtension = generateCurlFromExtensionData(data)
      localStorage.setItem("slackCurlCommand", curlFromExtension)

      // Parse the data for API call
      const curlRequest = {
        url: `https://${workspace}.slack.com/api/emoji.adminList?_x_id=${data.xId}&_x_version_ts=noversion&fp=98`,
        method: "POST",
        headers: {
          Cookie: data.cookie || "",
        },
        formData: {
          token: data.token || "",
          count: "20000", // Ensure we get all emojis, not just first 1000
        },
      }
      
      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ curlRequest }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch emoji data")
      }

      const responseData = await response.json()
      
      if (!responseData.emojis || !Array.isArray(responseData.emojis)) {
        throw new Error("Invalid emoji data format")
      }

      setEmojiData(responseData.emojis)
      setHasRealData(true)
      localStorage.setItem("emojiData", JSON.stringify(responseData.emojis))
      localStorage.setItem("emojiCount", responseData.emojis.length.toString())
      localStorage.setItem("lastFetchTime", new Date().toISOString())

      // Fire event to notify other components that emoji data has been updated
      window.dispatchEvent(new CustomEvent("emojiDataUpdated"))

      op.track('chrome_extension_emoji_fetch', {
        emojiCount: responseData.emojis.length,
        workspace: workspace,
      })

      setSuccess(`Successfully fetched ${responseData.emojis.length} emojis from ${workspace}`)
      setIsConnecting(false)
      isConnectingRef.current = false

      // Redirect to dashboard after success
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)

    } catch (err) {
      console.error("Error processing extension data:", err)
      setError(err instanceof Error ? err.message : "Failed to process extension data")
      setIsConnecting(false)
      isConnectingRef.current = false
    }
  }

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

  const handleConnectWithExtension = () => {
    if (!isExtensionInstalled) {
      return
    }

    setIsConnecting(true)
    setError(null)
    setSuccess(null)

    // Send message to extension to start the auth process
    window.postMessage({ type: 'START_SLACK_AUTH' }, '*')

    op.track('chrome_extension_connect_attempt', {})

    // Set a timeout for the connection attempt
    setTimeout(() => {
      if (isConnecting) {
        setError("Connection timeout. Please make sure you're logged into Slack and try again.")
        setIsConnecting(false)
      }
    }, 30000) // 30 second timeout
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ChromeIcon className="h-5 w-5 text-blue-500" />
          Chrome Extension (Recommended)
        </CardTitle>
        <CardDescription>
          The easiest way to connect your Slack workspace. Install the Chrome extension for one-click authentication.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isExtensionInstalled ? (
          <div className="space-y-4">
            <Button
              onClick={() => window.open('https://github.com/jweingardt12/emoji-studio-chrome-extension/releases/download/latest/emoji-studio-extension.zip', '_blank')}
              className="w-full"
              size="lg"
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              Download Chrome Extension
            </Button>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">How to install:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Download and unzip the extension file</li>
                <li>Open Chrome and go to <code className="text-xs bg-muted px-1 py-0.5 rounded">chrome://extensions</code></li>
                <li>Enable "Developer mode" in the top right</li>
                <li>Click "Load unpacked" and select the unzipped folder</li>
                <li>The extension will appear in your toolbar</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert>
              <CheckCircleIcon className="h-4 w-4" />
              <AlertTitle>Extension Detected</AlertTitle>
              <AlertDescription>
                Chrome extension is installed and ready to connect to your Slack workspace.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={handleConnectWithExtension}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? "Connecting..." : "Connect with Extension"}
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
            <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}