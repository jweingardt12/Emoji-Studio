"use client"

import { useState, useEffect, useRef } from "react"
import type { ChangeEvent, FormEvent, MouseEvent } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle as AlertCircleIcon,
  CheckCircle as CheckCircleIcon,
  Clipboard as ClipboardIcon,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { Emoji } from "@/lib/services/emoji-service"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { useTrack } from '@/lib/hooks/use-track';
import { EmojiImportStatus } from "@/components/emoji-import-status"
import { initializeExtensionListener, type SlackAuthData } from "@/lib/chrome-extension";
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"

export function SlackCurlInput() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [curlCommand, setCurlCommand] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isMasked, setIsMasked] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const track = useTrack();
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  useEffect(() => {
    const savedCurl = localStorage.getItem("slackCurlCommand")
    if (savedCurl) {
      setCurlCommand(savedCurl)
      validateCurl(savedCurl)
    }
  }, [])
  
  useEffect(() => {
    // Initialize Chrome extension listener
    initializeExtensionListener((data: SlackAuthData) => {
      console.log('Received data from Chrome extension:', data);
      // Convert extension data to curl command format
      const curlFromExtension = generateCurlFromExtensionData(data);
      console.log('Generated curl command:', curlFromExtension);
      setCurlCommand(curlFromExtension);
      validateCurl(curlFromExtension);
      // Store the curl command
      localStorage.setItem("slackCurlCommand", curlFromExtension);
      try { window.dispatchEvent(new CustomEvent("slackCurlUpdated")) } catch {}
      // Set a flag to auto-submit
      setSuccess('Data received from Chrome extension! Processing...');
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
        }
      }, 1000);
    });
  }, [])


  const extractWorkspaceName = (curl: string): string => {
    // First try the subdomain
    const workspaceUrlMatch = curl.match(/https?:\/\/([^.]+)\.slack\.com/)
    if (workspaceUrlMatch && workspaceUrlMatch[1] &&
        workspaceUrlMatch[1] !== 'app' &&
        workspaceUrlMatch[1] !== 'api' &&
        workspaceUrlMatch[1] !== 'files') {
      return workspaceUrlMatch[1]
    }

    // Try slack_route cookie (contains team ID like T0ABC123)
    const slackRouteMatch = curl.match(/slack_route=([A-Z][A-Z0-9]+)/i)
    if (slackRouteMatch) {
      return slackRouteMatch[1]
    }

    // Try client path like /client/T0ABC123/
    const clientPathMatch = curl.match(/\/client\/([A-Z][A-Z0-9]+)/i)
    if (clientPathMatch) {
      return clientPathMatch[1]
    }

    // Try team parameter
    const teamMatch = curl.match(/[?&]team=([^&\s'"]+)/) ||
                      curl.match(/team_id=([^&\s'"]+)/)
    if (teamMatch) {
      return teamMatch[1]
    }

    return "slack-workspace"
  }
  
  const generateCurlFromExtensionData = (data: SlackAuthData): string => {
    // Generate a curl command from the extension data
    const workspace = data.workspace || 'workspace';
    
    // Generate a timestamp for _x_id
    const timestamp = Math.floor(Date.now() / 1000);
    const xId = data.xId || `generated-${timestamp}`;
    
    // Build URL with required parameters
    const url = `https://${workspace}.slack.com/api/emoji.adminList?_x_id=${xId}&_x_version_ts=noversion&fp=98`;
    
    // Build curl command on a single line with escaped newlines
    let curl = `curl '${url}'`;
    curl += ` -H 'accept: */*'`;
    curl += ` -H 'accept-language: en-US,en;q=0.9'`;
    curl += ` -H 'cache-control: no-cache'`;
    curl += ` -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'`;
    
    if (data.cookie) {
      curl += ` -b '${data.cookie}'`;
    }
    
    curl += ` -H 'pragma: no-cache'`;
    curl += ` -H 'sec-fetch-dest: empty'`;
    curl += ` -H 'sec-fetch-mode: cors'`;
    curl += ` -H 'sec-fetch-site: same-origin'`;
    curl += ` --data-raw $'------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="token"\\r\\n\\r\\n${data.token}\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\\r\\n'`;
    
    return curl;
  }

  const generateMaskedCurl = (curl: string): string => {
    if (!curl.trim()) return ""
    const lines = curl.split(/\\?\n/).map(line => line.trim().replace(/\\$/, '').trim());
    let maskedLines = [];

    if (lines.length > 0) {
      const firstLine = lines[0];
      const urlMatch = firstLine.match(/^(curl\s+['"])(https?:\/\/[^.]+\.slack\.com\/api\/[^?]+)(\?[^'"]+)?(['"])/);
      if (urlMatch) {
        maskedLines.push(`${urlMatch[1]}${urlMatch[2]}?[parameters masked]${urlMatch[4]} \\`);
      } else {
        maskedLines.push("curl '[URL details masked]' \\");
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("-H") || line.startsWith("--header")) {
        const headerMatch = line.match(/^(-[Hh] |--header\s+)(['"]?)([^:]+):.*(['"]?)/);
        if (headerMatch) {
          maskedLines.push(`${headerMatch[1]}${headerMatch[2]}${headerMatch[3]}: [value masked]${headerMatch[4]} \\`);
        } else {
          maskedLines.push(line.replace(/[^ ]+$/, "[value masked] \\"));
        }
      } else if (line.startsWith("-b") || line.startsWith("--cookie")) {
        maskedLines.push(line.replace(/'.*'/, "'[cookies masked]'").replace(/".*"/, "\"[cookies masked]\"") + " \\");
      } else if (line.startsWith("--form") || line.startsWith("--data-raw") || line.startsWith("-d ")) {
         const formMatch = line.match(/^(--form|--data-raw|-d)\s+['"]?([^='"]+)=/);
         if (formMatch) {
           maskedLines.push(`${formMatch[1]} '${formMatch[2]}=[value masked]' \\`);
         } else {
            maskedLines.push(line.replace(/'.*'/, "'[value masked]'").replace(/".*"/, "\"[value masked]\"") + " \\");
         }
      } else {
        maskedLines.push(line + " \\"); // Keep other lines as is, just add trailing slash for consistency
      }
    }

    // Remove trailing slash from the last line
    if (maskedLines.length > 0) {
      maskedLines[maskedLines.length - 1] = maskedLines[maskedLines.length - 1].replace(/ \\$/, '');
    }

    return maskedLines.join('\n');
  };

  const validateCurl = (value: string) => {
    if (value.trim().toLowerCase() === "demo" || value.trim().toLowerCase() === "test") {
      setIsValid(true)
      setIsMasked(false)
      return
    }

    const result = parseSlackCurl(value)
    setIsValid(result.isValid && !result.error);
    setIsMasked(result.isValid && !!result.token && result.token.length > 10);
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setCurlCommand(newValue)
    validateCurl(newValue)
  }

  const handleCopyToClipboard = async () => {
    if (!curlCommand) return;
    try {
      await navigator.clipboard.writeText(curlCommand);
    } catch (err) {
      console.error("Failed to copy cURL command: ", err);
    }
  };

  const loadDemoData = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      setLoadingStage("Demo mode activated...")
      setProgress(10)
      await new Promise((resolve) => setTimeout(resolve, 800))

      setLoadingStage("Loading sample data...")
      setProgress(40)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const { generateDemoData } = await import("@/lib/demo-data")
      const demoData = await generateDemoData()
      setProgress(70)
      setEmojiData(demoData)

      safePersistEmojiDataToLocalStorage(demoData, { source: "slack-curl-input-demo" })
      localStorage.setItem("workspace", "demo-workspace")
      setWorkspace("demo-workspace")
      setHasRealData(true)

      localStorage.setItem("emojiCount", demoData.length.toString())
      localStorage.setItem("lastFetchTime", new Date().toISOString())

      // Fire event to notify other components that emoji data has been updated
      window.dispatchEvent(new CustomEvent("emojiDataUpdated"))

      setLoadingStage(`Demo data loaded!`)
      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 800))

      setSuccess(`Successfully loaded demo emojis`)
      setLoadingStage("")
      setIsLoading(false)

      track('demo_mode_loaded', {
        emojiCount: demoData.length,
      });

      // Show success state for a moment
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      // Start fade out and redirect
      
      // Redirect after a short delay to ensure smooth transition
      setTimeout(() => {
        router.push('/dashboard')
      }, 600)
    } catch (err) {
      console.error("Error loading demo data:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setIsLoading(false)
      setLoadingStage("")
      setProgress(0)
    }
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!curlCommand.trim()) return
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)
    try {
      if (curlCommand.trim().toLowerCase() === "demo" || curlCommand.trim().toLowerCase() === "test") {
        await loadDemoData()
        return
      }

      setLoadingStage("Parsing cURL command...")
      setProgress(20)
      await new Promise((resolve) => setTimeout(resolve, 500))

      const parsedCurl = parseSlackCurl(curlCommand)
      if (!parsedCurl.isValid || parsedCurl.error) {
        const errorMessage = parsedCurl.error || "Invalid cURL command format"
        
        track('slack_curl_invalid', {
          error: errorMessage,
          hasToken: !!parsedCurl.token,
          hasCookie: !!parsedCurl.cookie,
          hasWorkspace: !!parsedCurl.workspace,
        });
        
        throw new Error(errorMessage)
      }

      setLoadingStage("Connecting to Slack workspace...")
      setProgress(40)
      await new Promise((resolve) => setTimeout(resolve, 800))

      const workspace = extractWorkspaceName(curlCommand)
      localStorage.setItem("slackCurlCommand", curlCommand)
      localStorage.setItem("workspace", workspace)
      try { window.dispatchEvent(new CustomEvent("slackCurlUpdated")) } catch {}
      
      setWorkspace(workspace)

      setLoadingStage("Fetching emoji data...")
      setProgress(60)

      // Parse the curl command to extract the request details
      const parsedData = parseSlackCurl(curlCommand)
      
      // Transform parsed data into the format expected by the API
      const curlRequest = {
        url: parsedData.url,
        method: "POST",
        headers: {
          Cookie: parsedData.cookie || "",
        },
        formData: {
          token: parsedData.token || "",
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

      const responseText = await response.text()
      console.log("API response text:", responseText)

      if (!response.ok) {
        let errorMessage = "Failed to fetch emoji data"
        try {
          const errorData = JSON.parse(responseText)
          console.error("API error response:", errorData)
          errorMessage = errorData.error || errorMessage
          
          track('slack_api_error', {
            status: response.status,
            error: errorMessage,
            workspace: workspace,
          });
        } catch {
          console.error("Failed to parse error response:", responseText)
        }
        throw new Error(`API error: ${errorMessage}`)
      }

      setLoadingStage("Processing emoji data...")
      setProgress(80)

      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Failed to parse response:", responseText)
        throw new Error("Invalid response format from server")
      }

      if (!data.emojis || !Array.isArray(data.emojis)) {
        console.error("Invalid data format:", data)
        throw new Error("Invalid emoji data format")
      }

      const typedEmojis = data.emojis as Emoji[]
      setProgress(90)

      setEmojiData(typedEmojis)
      setHasRealData(true)
      safePersistEmojiDataToLocalStorage(typedEmojis, { source: "slack-curl-input" })
      localStorage.setItem("emojiCount", typedEmojis.length.toString())
      localStorage.setItem("lastFetchTime", new Date().toISOString())

      // Fire event to notify other components that emoji data has been updated
      window.dispatchEvent(new CustomEvent("emojiDataUpdated"))

      setLoadingStage(`Success! Emojis loaded`)
      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 800))

      setSuccess(`Successfully synced emojis from ${workspace}`)
      setLoadingStage("")
      setIsLoading(false)

      track('slack_emojis_fetched', {
        emojiCount: typedEmojis.length,
        workspace: workspace,
        hasAliases: data.emojis.some((e: any) => e.is_alias),
      });

      // Show success state for a moment before redirecting
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Redirect after a short delay to ensure smooth transition
      setTimeout(() => {
        router.push('/dashboard')
      }, 600)
    } catch (err) {
      console.error("Error fetching emoji data:", err)
      console.error("Full error details:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
      setIsLoading(false)
      setLoadingStage("")
      setProgress(0)
    }
  }

  const handleInstructionsToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsInstructionsOpen(!isInstructionsOpen);
  };

  const handleClearCurl = () => {
    setCurlCommand("")
    setIsValid(null)
    setIsMasked(false)
    setError(null)
    setSuccess(null)
    localStorage.removeItem("slackCurlCommand")
    // Focus textarea if available
    if (textAreaRef.current) {
      textAreaRef.current.focus()
    }
  }

  return (
    <>
      <div className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ClipboardIcon className="h-4 w-4 text-primary" />
                <span>Paste your Slack curl command below:</span>
              </div>
              
              <div className="relative">
                {isMasked && isValid && curlCommand.trim().toLowerCase() !== "demo" && curlCommand.trim().toLowerCase() !== "test" ? (
                  <>
                    <Textarea
                      ref={textAreaRef}
                      value={generateMaskedCurl(curlCommand)}
                      readOnly
                      className="w-full min-h-[160px] sm:min-h-[200px] font-mono text-[13px] sm:text-xs opacity-60"
                      placeholder="curl 'https://your-workspace.slack.com/api/emoji.list...' \\\" 
                    />
                    <div className="absolute top-2 right-2 hidden sm:flex items-center gap-2">
                      <span className="hidden sm:inline text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                        Sensitive data masked
                      </span>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleCopyToClipboard}
                            >
                              <ClipboardIcon className="h-4 w-4" />
                              <span className="sr-only">Copy to clipboard</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Copy original curl command</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleClearCurl}
                            >
                              {/* X icon via SVG to avoid extra import */}
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              <span className="sr-only">Clear curl</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>Clear curl</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="mt-2 flex sm:hidden justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleCopyToClipboard}>
                        Copy
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleClearCurl}>
                        Clear
                      </Button>
                    </div>
                  </>
                ) : (
                  <Textarea
                    ref={textAreaRef}
                    value={curlCommand}
                    onChange={handleChange}
                    className={`w-full min-h-[160px] sm:min-h-[200px] font-mono text-[13px] sm:text-xs ${
                      isValid === false ? "border-destructive" : ""
                    }`}
                    placeholder="curl 'https://your-workspace.slack.com/api/emoji.list...' \\\" 
                  />
                )}
              </div>
              {!isMasked && (
                <div className="flex justify-end gap-2 -mt-1 sm:-mt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleClearCurl}>
                    Clear
                  </Button>
                </div>
              )}
              
              {isValid === false && curlCommand && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Invalid Format</AlertTitle>
                  <AlertDescription>
                    Please enter a valid Slack API curl command or type "demo" for demo mode.
                  </AlertDescription>
                </Alert>
              )}
              
              {isValid === true && (
                <Alert>
                  <CheckCircleIcon className="h-4 w-4" />
                  <AlertTitle>Valid Command</AlertTitle>
                  <AlertDescription>
                    {curlCommand.trim().toLowerCase() === "demo" || curlCommand.trim().toLowerCase() === "test"
                      ? "Demo mode ready. Click submit to load sample emoji data."
                      : "Your Slack curl command is valid and ready to submit."}
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {error}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" type="button" onClick={handleClearCurl}>Clear curl</Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
                  <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {(isLoading || progress > 0) && (
                <EmojiImportStatus
                  isActive={isLoading}
                  progress={progress}
                  stage={loadingStage || (isLoading ? "Syncing emojis..." : undefined)}
                  description={isLoading ? "Hang tight while we fetch your Slack emoji library." : undefined}
                  isSuccess={!isLoading && progress >= 100}
                  className="mt-4"
                />
              )}
            </div>
            
            <div className="pt-4">
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? "Processing..." : "Connect Workspace"}
              </Button>
            </div>
          </form>

        <div className="mt-4 border rounded-lg">
          <div className="p-3">
            <Button
              variant="ghost"
              onClick={handleInstructionsToggle}
              className="flex w-full items-center justify-between p-0 text-left hover:bg-transparent"
            >
              <span className="text-sm font-medium">How to get your Slack curl command</span>
              {isInstructionsOpen ? (
                <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
          <Collapsible open={isInstructionsOpen}>
            <CollapsibleContent>
              <div className="px-3 pb-3 space-y-4 text-sm text-muted-foreground border-t pt-3">
              <ol className="list-decimal space-y-3 pl-5">
                <li>Open your Slack workspace in a web browser</li>
                <li>
                  Navigate to <strong>Workspace Settings</strong> → <strong>Customize Your Workspace</strong> → <strong>Emoji</strong>
                </li>
                <li>
                  Open your browser's Developer Tools:
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Chrome/Edge: Press <code className="rounded bg-muted px-1 py-0.5">F12</code> or <code className="rounded bg-muted px-1 py-0.5">Ctrl+Shift+I</code> (Windows/Linux) or <code className="rounded bg-muted px-1 py-0.5">Cmd+Option+I</code> (Mac)</li>
                    <li>Firefox: Press <code className="rounded bg-muted px-1 py-0.5">F12</code> or <code className="rounded bg-muted px-1 py-0.5">Ctrl+Shift+I</code> (Windows/Linux) or <code className="rounded bg-muted px-1 py-0.5">Cmd+Option+I</code> (Mac)</li>
                    <li>Safari: Enable Developer menu in Preferences, then press <code className="rounded bg-muted px-1 py-0.5">Cmd+Option+I</code></li>
                  </ul>
                </li>
                <li>Go to the <strong>Network</strong> tab in Developer Tools</li>
                <li>Refresh the emoji page or navigate to it if you haven't already</li>
                <li>
                  Look for a request named <code className="rounded bg-muted px-1 py-0.5">emoji.adminList</code> or <code className="rounded bg-muted px-1 py-0.5">emoji.list</code>
                </li>
                <li>Right-click on the request and select <strong>Copy</strong> → <strong>Copy as cURL</strong></li>
                <li>Paste the copied command in the text area above</li>
              </ol>
              
              <Alert>
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Demo Mode</AlertTitle>
                <AlertDescription>
                  Type <strong>"demo"</strong> or <strong>"test"</strong> instead of a curl command to load sample emoji data for testing.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Privacy & Security</AlertTitle>
                <AlertDescription>
                  Your Slack authentication data is stored locally in your browser and is only used to fetch emoji data directly from Slack. 
                  We never store or transmit your credentials to our servers.
                </AlertDescription>
              </Alert>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </>
  )
}