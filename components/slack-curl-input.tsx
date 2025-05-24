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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { useOpenPanel } from '@openpanel/nextjs';
import { LoadingOverlay } from "@/components/loading-overlay";

export function SlackCurlInput() {
  const router = useRouter()
  const [curlCommand, setCurlCommand] = useState("")
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isMasked, setIsMasked] = useState(false);
  const [loadingStage, setLoadingStage] = useState("");
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [redirectPending, setRedirectPending] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const op = useOpenPanel();
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  useEffect(() => {
    const savedCurl = localStorage.getItem("slackCurlCommand")
    if (savedCurl) {
      setCurlCommand(savedCurl)
      validateCurl(savedCurl)
    }
  }, [])

  useEffect(() => {
    if (redirectPending) {
      router.push('/dashboard');
      setRedirectPending(false);
    }
  }, [redirectPending, router]);

  const extractWorkspaceName = (curl: string): string => {
    const workspaceUrlMatch = curl.match(/https?:\/\/([^.]+)\.slack\.com/)
    if (workspaceUrlMatch && workspaceUrlMatch[1]) {
      return workspaceUrlMatch[1]
    }
    return "slack-workspace"
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
      maskedLines[maskedLines.length - 1] = maskedLines[maskedLines.length - 1].replace(/\s*\\$/, "");
    }
    return maskedLines.join("\n");
  };

  const validateCurl = (curl: string) => {
    if (!curl.trim()) {
      setIsValid(null)
      setIsMasked(false)
      return
    }

    const isDemoCommand = curl.trim().toLowerCase() === "demo" || curl.trim().toLowerCase() === "test";
    if (isDemoCommand) {
      setIsValid(true)
      setIsMasked(false)
      return
    }

    const parsed = parseSlackCurl(curl)
    setIsValid(parsed.isValid)
    if (parsed.isValid) {
      setIsMasked(true)
    } else {
      setIsMasked(false)
    }
  }

  const handleCurlChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!curlCommand.trim()) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      if (curlCommand.trim().toLowerCase() === "demo" || curlCommand.trim().toLowerCase() === "test") {
        setLoadingStage("Demo mode detected...")
        setProgress(10)
        await new Promise((resolve) => setTimeout(resolve, 800))

        setLoadingStage("Loading sample data...")
        setProgress(40)
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const { generateDemoData } = await import("@/lib/demo-data")
        const demoData = await generateDemoData()
        setProgress(70)
        setEmojiData(demoData)

        localStorage.setItem("emojiData", JSON.stringify(demoData))
        localStorage.setItem("workspace", "demo-workspace")
        setWorkspace("demo-workspace")
        setHasRealData(true)

        localStorage.setItem("emojiCount", demoData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())

        setLoadingStage(`Demo data loaded! (${demoData.length} emojis)`)
        setProgress(100)
        await new Promise((resolve) => setTimeout(resolve, 800))

        setSuccess(`Successfully loaded ${demoData.length} emojis in demo mode`)
        setIsLoading(false)
        setLoadingStage("")
        setProgress(0)

        window.dispatchEvent(new CustomEvent("emojiDataUpdated"))
        setRedirectPending(true)
        return
      }

      setLoadingStage("Parsing curl command...")
      setProgress(10)
      const parsed = parseSlackCurl(curlCommand)

      if (!parsed.isValid && !curlCommand.includes("--form")) {
        throw new Error(
          parsed.error || "Invalid curl command. Make sure it contains authentication and workspace information.",
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 500))

      const { token, cookie, workspace } = parsed
      await new Promise((resolve) => setTimeout(resolve, 500))

      setLoadingStage("Connecting to Slack API...")
      setProgress(25)
      await new Promise((resolve) => setTimeout(resolve, 800))

      setLoadingStage("Fetching emoji data from Slack...")
      setProgress(50)
      await new Promise((resolve) => setTimeout(resolve, 400))

      if (!parsed.isValid || !parsed.url) {
        throw new Error(parsed.error || "Invalid curl command or missing URL.")
      }
      setLoadingStage("Preparing Slack API request...")
      setProgress(60)

      const url = parsed.url
      const extractedToken = parsed.token || ""
      const formData: Record<string, string> = {}
      formData["post_type"] = "json"

      const formMatches = [...curlCommand.matchAll(/--form\s+['"]?([^='"]+)=([^'"]+)['"]?/g)]
      for (const match of formMatches) {
        if (match[1] && match[2]) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^['"]|['"]$/g, "")
          formData[key] = value
        }
      }

      if (extractedToken && !formData["token"]) {
        formData["token"] = extractedToken
      }

      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }

      setLoadingStage("Sending request to Slack API...")
      setProgress(70)

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

      const responseText = await response.text()
      console.log("API response text:", responseText)

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
      await new Promise(resolve => setTimeout(resolve, 500))

      setEmojiData(emojiArray)
      setHasRealData(true)
      localStorage.setItem("slackCurlCommand", curlCommand)

      op.track('Emoji Import Success', {
        emojiCount: emojiArray.length,
        workspace: extractWorkspaceName(curlCommand),
        source: 'curl_command'
      });

      setLoadingStage("Finalizing...");
      setProgress(100);
      setSuccess("Emoji data processed successfully! Redirecting...");
      // Persist data to localStorage or context
      localStorage.setItem('emojiData', JSON.stringify(data.emoji));
      localStorage.setItem('customEmojis', JSON.stringify(data.custom_emoji_total_count));
      localStorage.setItem('paging', JSON.stringify(data.paging));
      localStorage.setItem('lastUpdated', Date.now().toString());
      localStorage.setItem('dataSource', 'curl'); // Indicate data source

      // Dispatch a custom event to notify other components (like Navbar)
      window.dispatchEvent(new CustomEvent('emojiDataUpdated'));
      
      // Set redirect pending instead of direct navigation
      setRedirectPending(true);

    } catch (err: any) {
      console.error("Error fetching emoji data:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      console.error("Full error details:", err)
    } finally {
      setIsLoading(false)
      setLoadingStage("")
    }
  }

  const handleInstructionsToggle = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsInstructionsOpen(!isInstructionsOpen)
  }

  return (
    <>
      {isLoading && <LoadingOverlay isOpen={isLoading} progress={progress} loadingStage={loadingStage} />}
      <Card className="overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle>Connect to Slack</CardTitle>
          <CardDescription>
            Enter a curl command from your Slack workspace to fetch emoji data. Your data is processed locally and never sent to any server.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
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
                      value={generateMaskedCurl(curlCommand)} // Use the new function here
                      readOnly
                      rows={5}
                      className="border-green-500 bg-muted text-muted-foreground focus-visible:ring-green-500 pr-20 font-mono text-xs" // Added font-mono and text-xs
                      aria-label="Masked cURL command input"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsMasked(false);
                        setTimeout(() => textAreaRef.current?.focus(), 0);
                      }}
                      className="absolute top-1/2 right-3 -translate-y-1/2 transform text-xs px-2 py-1 h-auto"
                      aria-label="Edit cURL command"
                    >
                      Edit
                    </Button>
                  </>
                ) : (
                  <Textarea
                    ref={textAreaRef}
                    id="curlCommand"
                    placeholder="Paste your cURL command here (e.g., curl 'https://your-workspace.slack.com/api/emoji.adminList?...'), or type 'demo' for sample data"
                    value={curlCommand}
                    onChange={handleCurlChange}
                    rows={5}
                    className={
                      isValid === true
                        ? "border-green-500 focus-visible:ring-green-500"
                        : isValid === false
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                    }
                    aria-label="cURL command input"
                  />
                )}
                {curlCommand && !isLoading && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopyToClipboard}
                          className="absolute bottom-2 right-2 h-7 w-7"
                          aria-label="Copy cURL command"
                        >
                          <ClipboardIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy cURL command</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {isValid === true && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <CheckCircleIcon className="mr-1 h-4 w-4" />
                  Valid curl command detected.
                  {isMasked && curlCommand.trim().toLowerCase() !== "demo" && curlCommand.trim().toLowerCase() !== "test" && 
                    <span className="ml-1 text-xs text-muted-foreground">(Masked for security)</span>}
                </div>
              )}
              {isValid === false && curlCommand.trim() && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertCircleIcon className="mr-1 h-4 w-4" />
                  Invalid curl command. Please check the format.
                </div>
              )}
              
              <div className="text-xs text-muted-foreground">
                Your data is processed locally in your browser and never stored on our servers.
                Type &quot;demo&quot; or &quot;test&quot; to use sample data.
              </div>
            </div>

            {error && !isLoading && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && !isLoading && (
              <Alert variant="default"> 
                <CheckCircleIcon className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button type="submit" disabled={isLoading || isValid === false} className="w-full">
                Fetch Emojis
              </Button>
            </div>
          </form>
        </CardContent>

        <Collapsible open={isInstructionsOpen} onOpenChange={setIsInstructionsOpen}>
          <CardFooter className="p-0 border-t">
              <div className="w-full" onClick={(e) => e.preventDefault()}>
                <button
                  type="button"
                  className="flex w-full justify-between p-4 text-left bg-transparent hover:bg-muted/50 transition-colors items-center"
                  onClick={handleInstructionsToggle}
                  aria-expanded={isInstructionsOpen}
                  aria-controls="curl-instructions"
                >
                  <span className="font-semibold">How to get your Slack cURL command</span>
                  {isInstructionsOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                </button>
              </div>
          </CardFooter>
          <CollapsibleContent id="curl-instructions" className="p-6 pt-0 text-sm bg-muted/30">
            <ol className="list-decimal space-y-3 pl-5 pt-4">
              <li>
                Open your Slack workspace in a web browser (e.g., Chrome, Firefox).
                Make sure you are logged in.
              </li>
              <li>
                Navigate to the emoji administration page. You can usually find this by going to
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  https://YOUR_WORKSPACE.slack.com/customize/emoji
                </code>.
              </li>
              <li>
                Open your browser&apos;s Developer Tools.
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Chrome: Right-click anywhere on the page, select &quot;Inspect&quot;, then go to the &quot;Network&quot; tab.</li>
                  <li>Firefox: Right-click, select &quot;Inspect Element&quot;, then go to the &quot;Network&quot; tab.</li>
                </ul>
              </li>
              <li>
                In the Developer Tools Network tab, you might need to refresh the emoji page (F5 or Cmd+R)
                to see the network requests.
              </li>
              <li>
                Look for a request named <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">emoji.adminList</code> or similar.
                It might also appear as just <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">emoji.list</code> if you don&apos;t have admin rights, but adminList is preferred for complete data.
                Make sure the request status is 200 (successful).
              </li>
              <li>
                Right-click on that specific <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">emoji.adminList</code> request.
              </li>
              <li>
                In the context menu, find an option like &quot;Copy&quot; &gt; &quot;Copy as cURL&quot;.
                The exact wording might vary slightly depending on your browser:
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Chrome: &quot;Copy&quot; &gt; &quot;Copy as cURL (bash)&quot; or &quot;Copy as cURL (cmd)&quot;</li>
                  <li>Firefox: &quot;Copy Value&quot; &gt; &quot;Copy as cURL&quot;</li>
                  <li>Edge: &quot;Copy&quot; &gt; &quot;Copy as cURL&quot;</li>
                  <li>Safari: May require enabling developer features and has a similar option.</li>
                </ul>
              </li>
              <li>
                Paste the copied command into the text area above.
              </li>
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              Note: The cURL command contains authentication tokens. This tool processes it locally in your browser.
              Never share this cURL command publicly.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </>
  )
}