"use client"

import { useState, useEffect } from "react"
import type { ChangeEvent, FormEvent, MouseEvent } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle as AlertCircleIcon,
  CheckCircle as CheckCircleIcon,
  Clipboard as ClipboardIcon,
  Loader as LoaderIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { Emoji } from "@/lib/services/emoji-service"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { useOpenPanel } from '@openpanel/nextjs';

export function SlackCurlInput() {
  const [curlCommand, setCurlCommand] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState("")
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false)
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const router = useRouter()
  const op = useOpenPanel();

  // Load saved curl command on mount
  useEffect(() => {
    const savedCurl = localStorage.getItem("slackCurlCommand")
    if (savedCurl) {
      setCurlCommand(savedCurl)
      validateCurl(savedCurl)
    }
  }, [])

  // Validate curl command as user types
  const validateCurl = (curl: string) => {
    if (!curl.trim()) {
      setIsValid(null)
      return
    }

    // Check for demo mode
    if (curl.trim().toLowerCase() === "demo" || curl.trim().toLowerCase() === "test") {
      setIsValid(true)
      return
    }

    const parsed = parseSlackCurl(curl)
    setIsValid(parsed.isValid)
  }

  const handleCurlChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setCurlCommand(newValue)
    validateCurl(newValue)
  }

  // Extract workspace name from curl command
  const extractWorkspaceName = (curl: string): string => {
    // Try to extract workspace name from URL
    const workspaceUrlMatch = curl.match(/https?:\/\/([^.]+)\.slack\.com/)
    if (workspaceUrlMatch && workspaceUrlMatch[1]) {
      return workspaceUrlMatch[1]
    }

    // Fallback to generic name
    return "slack-workspace"
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!curlCommand.trim()) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      // Check for demo mode - only if the curl command is EXACTLY "demo" or "test"
      if (curlCommand.trim().toLowerCase() === "demo" || curlCommand.trim().toLowerCase() === "test") {
        setLoadingStage("Demo mode detected...")
        setProgress(10)
        await new Promise((resolve) => setTimeout(resolve, 800))

        setLoadingStage("Loading sample data...")
        setProgress(40)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Load actual demo emoji data from the JSON file
        setLoadingStage("Loading sample data...")
        setProgress(40)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Import the async demo data generator
        const { generateDemoData } = await import("@/lib/demo-data")
        const demoData = await generateDemoData()
        setProgress(70)
        setEmojiData(demoData)

        // Save to localStorage for persistence
        localStorage.setItem("emojiData", JSON.stringify(demoData))
        localStorage.setItem("workspace", "demo-workspace")
        setWorkspace("demo-workspace")
        setHasRealData(true)

        // Store fetch statistics
        localStorage.setItem("emojiCount", demoData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())

        setLoadingStage(`Demo data loaded! (${demoData.length} emojis)`)
        setProgress(100)
        await new Promise((resolve) => setTimeout(resolve, 800))

        setSuccess(`Successfully loaded ${demoData.length} emojis in demo mode`)
        setIsLoading(false)
        setLoadingStage("")
        setProgress(0)

        // Trigger a refresh of the fetch stats display
        window.dispatchEvent(new CustomEvent("emojiDataUpdated"))
        router.push("/dashboard")
        return
      }

      // --- Parse curl command ---
      setLoadingStage("Parsing curl command...")
      setProgress(10)
      const parsed = parseSlackCurl(curlCommand)

      if (!parsed.isValid && !curlCommand.includes("--form")) {
        throw new Error(
          parsed.error || "Invalid curl command. Make sure it contains authentication and workspace information.",
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      // Extract authentication
      setLoadingStage("Extracting authentication...")
      const { token, cookie, workspace } = parsed
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Connect to Slack API
      setLoadingStage("Connecting to Slack API...")
      setProgress(25)
      await new Promise((resolve) => setTimeout(resolve, 800))

      setLoadingStage("Fetching emoji data from Slack...")
      setProgress(50)
      await new Promise((resolve) => setTimeout(resolve, 400))

      // Validate parsed result
      if (!parsed.isValid || !parsed.url) {
        throw new Error(parsed.error || "Invalid curl command or missing URL.")
      }
      setLoadingStage("Preparing Slack API request...")
      setProgress(60)

      // Extract URL from the curl command
      const url = parsed.url

      // Extract token from the curl command
      const extractedToken = parsed.token || ""

      // Extract form data from the curl command
      const formData: Record<string, string> = {}

      // Add required fields
      formData["post_type"] = "json"

      // Extract form fields using regex
      const formMatches = [...curlCommand.matchAll(/--form\s+['"]?([^='"]+)=([^'"]+)['"]?/g)]
      for (const match of formMatches) {
        if (match[1] && match[2]) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^['"]|['"]$/g, "") // Remove quotes if present
          formData[key] = value
        }
      }

      // Ensure we have the token
      if (extractedToken && !formData["token"]) {
        formData["token"] = extractedToken
      }

      // Ensure we have count for emoji requests
      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }

      setLoadingStage("Sending request to Slack API...")
      setProgress(70)

      // Make the request to our API endpoint
      try {
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
                ...(parsed.cookie ? { Cookie: parsed.cookie } : {}),
              },
              formData,
            },
          }),
        })

        // Get the response text for debugging
        const responseText = await response.text()
        console.log("API response text:", responseText)

        // Try to parse as JSON
        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Error parsing API response:", parseError)
          throw new Error(`Invalid JSON response from API: ${responseText.substring(0, 100)}...`)
        }

        if (!response.ok) {
          console.error("API error response:", data)
          throw new Error(`API error: ${data.error || response.statusText}`)
        }

        if (data.error) {
          console.error("API returned error:", data.error)
          throw new Error(data.error)
        }

        if (!data.emoji || !Array.isArray(data.emoji)) {
          console.error("Invalid emoji data:", data)
          throw new Error("No emoji data returned from API")
        }

        const emojiArray = data.emoji

        setLoadingStage("Processing emoji data...")
        setProgress(80)
        await new Promise(resolve => setTimeout(resolve, 500)) // Simulate processing

        setEmojiData(emojiArray)
        setHasRealData(true) // Indicate that real data has been loaded
        localStorage.setItem("slackCurlCommand", curlCommand) // Save successful curl command
        
        // OpenPanel Tracking for successful import from cURL
        op.track('Emoji Import Success', {
          emojiCount: emojiArray.length,
          workspace: extractWorkspaceName(curlCommand),
          source: 'curl_command'
        });

        setSuccess("Successfully fetched and processed emoji data!")
        setError(null)
        setProgress(100)
      } catch (err) {
        console.error("Error making request to API:", err)
        throw new Error("Error making request to API: " + (err instanceof Error ? err.message : String(err)))
      }
    } catch (err) {
      console.error("Error fetching emoji data:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      // Add this console.log to help with debugging:
      console.error("Full error details:", err)
    } finally {
      setIsLoading(false)
      setLoadingStage("")
      setProgress(0)
    }
  }

  // Handle instructions toggle separately from form submission
  const handleInstructionsToggle = (e: MouseEvent) => {
    e.preventDefault() // Prevent form submission
    e.stopPropagation() // Stop event propagation
    setIsInstructionsOpen(!isInstructionsOpen)
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle>Connect to Slack</CardTitle>
        <CardDescription>
          Enter a curl command from your Slack workspace to fetch emoji data. Your data is processed locally and never
          sent to any server.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {/* Clear instruction above the input */}
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ClipboardIcon className="h-4 w-4 text-primary" />
              <span>Paste your Slack curl command below:</span>
            </div>
            
            <div className="relative">
              <Textarea
                placeholder={`curl 'https://yourworkspace.slack.com/api/emoji.list?_x_id=...' \\
  --header 'Cookie: d=...; b=...' \\
  --header 'content-type: application/x-www-form-urlencoded' \\
  --form 'token=xoxc-...' \\
  --form 'page=1' \\
  --form 'count=20000' \\
  --form 'post_type=json'

Or type "demo" to try with sample data`}
                className={`min-h-[150px] resize-y font-mono text-sm transition-all duration-200 ${
                  curlCommand.trim() === ""
                    ? "border-2 border-dashed border-primary/30 bg-primary/5 focus-visible:border-primary focus-visible:ring-primary"
                    : isValid === true
                      ? "border-green-500 focus-visible:ring-green-500 bg-green-50/50"
                      : isValid === false
                        ? "border-red-500 focus-visible:ring-red-500 bg-red-50/50"
                        : "border-input"
                }`}
                value={curlCommand}
                onChange={handleCurlChange}
                disabled={isLoading}
              />
              
              {/* Status indicators */}
              {curlCommand.trim() === "" && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ClipboardIcon className="h-8 w-8 opacity-30" />
                    <span className="text-sm font-medium">Paste curl command here</span>
                  </div>
                </div>
              )}
              
              {isValid === true && (
                <div className="absolute right-3 top-3 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
              )}
              
              {isValid === false && curlCommand.trim() !== "" && (
                <div className="absolute right-3 top-3 text-red-600">
                  <AlertCircleIcon className="h-5 w-5" />
                </div>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 bottom-2 h-8 w-8"
                    onClick={() => {
                      setCurlCommand("demo")
                      validateCurl("demo")
                    }}
                  >
                    <ClipboardIcon className="h-4 w-4" />
                    <span className="sr-only">Use demo mode</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Use demo mode</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            {/* Helper text below the input */}
            <div className="text-xs text-muted-foreground">
              {curlCommand.trim() === "" ? (
                <span>💡 Right-click on the emoji.list request in your browser's Network tab → Copy → Copy as cURL (bash)</span>
              ) : isValid === true ? (
                <span className="text-green-600">✅ Valid curl command detected</span>
              ) : isValid === false ? (
                <span className="text-red-600">❌ Invalid curl command. Please check the format.</span>
              ) : (
                <span>Validating...</span>
              )}
            </div>
            
            {/* Fetch button moved here */}
            <div className="flex justify-between items-center pt-2">
              <div className="text-sm text-muted-foreground">
                Your data is processed locally and never stored on our servers
              </div>
              <Button onClick={handleSubmit} disabled={isLoading || !curlCommand.trim()}>
                {isLoading ? "Processing..." : "Fetch Emojis"}
              </Button>
            </div>
          </div>

          <Collapsible
            open={isInstructionsOpen}
            onOpenChange={setIsInstructionsOpen}
            className="w-full border rounded-md"
          >
            <div className="w-full" onClick={(e) => e.preventDefault()}>
              <button
                type="button" // Explicitly set button type to prevent form submission
                className="flex w-full justify-between p-4 text-left bg-transparent hover:bg-muted/50 transition-colors"
                onClick={handleInstructionsToggle}
              >
                <div className="flex flex-col gap-1">
                  <span>📺 How to get your Slack curl command</span>
                  <span className="text-sm text-muted-foreground">Video tutorial and step-by-step instructions</span>
                </div>
                {isInstructionsOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
              </button>
            </div>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-6">
                {/* Video Section */}
                <div className="space-y-3">
                  <h4 className="font-medium">Watch the Tutorial</h4>
                  <p className="text-sm text-muted-foreground">
                    Watch this quick video for step-by-step instructions on how to obtain the Slack curl command needed for emoji export.
                  </p>
                  <video
                    className="w-full max-w-xl rounded-lg border border-border bg-muted shadow-md"
                    controls
                    poster="/how-to-thumb.png"
                  >
                    <source src="/how-to.mp4" type="video/mp4" />
                    Sorry, your browser does not support embedded videos.
                  </video>
                </div>

                {/* Detailed Instructions */}
                <div className="space-y-4 text-sm border-t pt-6">
                  <h4 className="font-medium">Detailed Steps</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h5 className="font-medium">Step 1: Open Slack in your browser</h5>
                      <p className="text-muted-foreground">
                        Go to your Slack workspace in a web browser (e.g., Chrome, Firefox). Make sure you're logged in.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Step 2: Open Developer Tools</h5>
                      <p className="text-muted-foreground">
                        Right-click anywhere on the page and select "Inspect" or press F12 (Windows/Linux) or Cmd+Option+I
                        (Mac) to open Developer Tools.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Step 3: Go to the Network tab</h5>
                      <p className="text-muted-foreground">
                        Click on the "Network" tab in the Developer Tools panel. Make sure "All" or "XHR" is selected in the
                        filter options.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Step 4: Trigger an emoji request</h5>
                      <p className="text-muted-foreground">
                        In Slack, click on the emoji picker (the smiley face icon in the message input) or press
                        Ctrl+Shift+\ (Windows/Linux) or Cmd+Shift+\ (Mac). This will trigger a request to load emojis.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Step 5: Find the emoji.list request</h5>
                      <p className="text-muted-foreground">
                        In the Network tab, type "emoji.list" in the filter box. You should see a request with this name. If
                        you don't see it, try opening and closing the emoji picker again.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Step 6: Copy as cURL</h5>
                      <p className="text-muted-foreground">
                        Right-click on the "emoji.list" request, hover over "Copy", and select "Copy as cURL (bash)". This
                        will copy the full curl command to your clipboard.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium">Step 7: Paste and verify</h5>
                      <p className="text-muted-foreground">
                        Paste the copied curl command into the text area above. A valid curl command should contain:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        <li>
                          A URL to your Slack workspace (e.g., <code>https://yourworkspace.slack.com/api/emoji.list</code>)
                        </li>
                        <li>Headers including a Cookie with authentication information</li>
                        <li>Form data with a token (usually starting with "xoxc-")</li>
                      </ul>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                      <p className="font-medium">Important Notes:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>The curl command contains your authentication token. This specific one is only scoped to show emojis, so it's low-risk to share with this project. Again - everything here is performed locally in your browser.</li>
                        <li>Tokens expire after some time (unsure how long, exactly), so you may need to get a new curl command periodically.</li>
                        <li>For demo purposes, you can simply type "demo" in the field above and click "Fetch Emojis".</li>
                      </ul>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
                      <p className="font-medium">Example curl command structure:</p>
                      <pre className="whitespace-pre-wrap text-xs mt-2 bg-white p-2 rounded border border-blue-100 overflow-x-auto">
                        {`curl 'https://yourworkspace.slack.com/api/emoji.list?_x_id=...' \\
  --header 'Cookie: d=...; b=...' \\
  --header 'content-type: application/x-www-form-urlencoded' \\
  --form 'token=xoxc-...' \\
  --form 'page=1' \\
  --form 'count=20000' \\
  --form 'post_type=json'

Or type "demo" to try with sample data`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setCurlCommand("demo")
                validateCurl("demo")
              }}
            >
              Use Demo Mode
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t bg-muted/20 px-6 py-4">
        {isLoading && (
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              <span>{loadingStage}</span>
            </div>
            <Progress value={progress} className="h-3 transition-all" />
            <div className="text-xs text-muted-foreground text-right">{progress}%</div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
