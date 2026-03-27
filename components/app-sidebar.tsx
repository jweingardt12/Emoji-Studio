"use client"

import type * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  BarChartIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  SmileIcon,
  TrendingUpIcon,
  UsersIcon,
  RefreshCwIcon,
  Images,
  GithubIcon,
  CirclePlus,
  UserCircle,
  MessageSquareIcon,
  Smartphone,
  Gift,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { MadeWithLove } from "./made-with-love"
import { TrophyIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ShineBorder } from "@/src/components/magicui/shine-border"
import { fetchSlackEmojis } from "@/lib/services/emoji-service"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

// Curl command modal using proper Dialog component
function CurlCommandModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (curl: string) => void }) {
  const [curl, setCurl] = useState("")
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Slack Curl Command</DialogTitle>
        </DialogHeader>
        <Textarea
          className="min-h-[120px] text-sm"
          placeholder="Paste your Slack curl command here..."
          value={curl}
          onChange={(e) => setCurl(e.target.value)}
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => { if (curl.trim()) onSubmit(curl.trim()) }}
            disabled={!curl.trim()}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Feedback Modal implementation
function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [feedbackType, setFeedbackType] = useState("feature")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({})
  const pathname = usePathname()
  const { trackFeedbackSubmitted, trackFeedbackSubmissionFailed, trackFeedbackModalClosed, trackFeedbackModalOpened } = useAnalytics()

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate form fields
  const validateForm = () => {
    const newErrors: { name?: string; email?: string; message?: string } = {}

    if (!name.trim()) {
      newErrors.name = "Name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!message.trim()) {
      newErrors.message = "Message is required"
    } else if (message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters"
    } else if (message.trim().length > 1000) {
      newErrors.message = "Message must be less than 1000 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  useEffect(() => {
    if (open) {
      // Track modal opened
      trackFeedbackModalOpened()
      // Small delay to ensure the DOM is ready for the transition
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [open, trackFeedbackModalOpened])

  const handleClose = () => {
    setIsVisible(false)
    // Track modal closed with submission status
    trackFeedbackModalClosed(showSuccess)
    // Wait for fade out animation before actually closing
    setTimeout(() => {
      onClose()
      // Reset form and errors after closing
      setName("")
      setEmail("")
      setFeedbackType("feature")
      setMessage("")
      setErrors({})
      setShowSuccess(false)
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form before submission
    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      // Get workspace info from localStorage
      const workspace = localStorage.getItem("workspace") || null
      const emojiData = localStorage.getItem("emojiData")
      let emojiCount = 0

      if (emojiData) {
        try {
          const parsedData = JSON.parse(emojiData)
          emojiCount = Array.isArray(parsedData) ? parsedData.length : 0
        } catch (e) {
          console.error("Error parsing emoji data:", e)
        }
      }

      const feedbackData = {
        name,
        email,
        feedbackType,
        message,
        timestamp: new Date().toISOString(),
        source: "emoji-studio-app",
        currentPage: pathname,
        ...(workspace && {
          workspace,
          emojiCount
        })
      }

      const response = await fetch("https://cloud.activepieces.com/api/v1/webhooks/XWehbc587ULYJx3eoWxZz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Show success state
      setShowSuccess(true)

      // Track successful submission
      trackFeedbackSubmitted(feedbackType as 'bug' | 'feature', !!workspace, pathname)

      // Close modal after 3 seconds
      setTimeout(() => {
        handleClose()
        // Show toast after modal closes
        setTimeout(() => {
          toast.success("Feedback sent!", {
            description: "Thank you for your feedback. We'll get back to you soon.",
          })
        }, 300)
      }, 3000)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      trackFeedbackSubmissionFailed(errorMessage)
      toast.error("Error submitting feedback", {
        description: "Please try again later.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`relative bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <ShineBorder
          borderWidth={2}
          duration={8}
          shineColor={["#60a5fa", "#e879f9", "#60a5fa"]}
        />
        <div className="relative p-8 overflow-y-auto max-h-[90vh]">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 bg-green-500/20" style={{ animationIterationCount: 3 }}></div>
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-10 w-10 text-white animate-[scale-in_0.3s_ease-out]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold animate-[fade-in_0.4s_ease-out_0.2s_both]">Message sent!</h2>
              <p className="text-muted-foreground animate-[fade-in_0.4s_ease-out_0.3s_both]">We'll get back to you soon.</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">Send Feedback</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (errors.name) setErrors({ ...errors, name: undefined })
                    }}
                    placeholder="Your name"
                    className={errors.name ? "border-destructive" : ""}
                    required
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors({ ...errors, email: undefined })
                    }}
                    placeholder="your@email.com"
                    className={errors.email ? "border-destructive" : ""}
                    required
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Feedback Type</Label>
                  <RadioGroup value={feedbackType} onValueChange={setFeedbackType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bug" id="bug" />
                      <Label htmlFor="bug" className="font-normal cursor-pointer">
                        Bug Report
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="feature" id="feature" />
                      <Label htmlFor="feature" className="font-normal cursor-pointer">
                        Feature Request
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      if (errors.message) setErrors({ ...errors, message: undefined })
                    }}
                    placeholder={feedbackType === "bug" ? "Please describe the issue you're experiencing..." : "Please describe the feature you'd like to see..."}
                    rows={5}
                    className={errors.message ? "border-destructive" : ""}
                    required
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground ml-auto">
                      {message.length}/1000
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Feedback"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useSidebar } from "@/components/ui/sidebar";
import { useAnalytics } from "@/lib/analytics";
import { useRouter } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [hasCurl, setHasCurl] = useState<boolean>(false)
  const [slackLoaded, setSlackLoaded] = useState<boolean>(false)
  const { emojiData, hasRealData, workspace } = useEmojiData()

  // initialize on client mount and track emoji data changes
  useEffect(() => {
    function updateCurlState() {
      if (typeof window !== "undefined") {
        const storedCurl = localStorage.getItem("slackCurlCommand")
        const storedData = localStorage.getItem("emojiData")
        const hadCurl = hasCurl
        setHasCurl(!!storedCurl)
        setSlackLoaded(!!storedData && storedData !== "[]" && JSON.parse(storedData).length > 0)

        // Log when the curl command status changes
        if (!!storedCurl !== hadCurl) {
          console.log("Curl command status changed:", !!storedCurl ? "Available" : "Not available")
        }
      }
    }
    updateCurlState()
    window.addEventListener("slackCurlCommandUpdated", updateCurlState)
    return () => window.removeEventListener("slackCurlCommandUpdated", updateCurlState)
  }, [])

  // Update slackLoaded status when emojiData changes
  useEffect(() => {
    setSlackLoaded(emojiData.length > 0)
  }, [emojiData])

  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  // Handler to fetch recent data from Slack
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
      console.log("No valid curl command found, opening modal")
      setModalOpen(true)
      return
    }

    await fetchWithCurl(lastCurl.trim())
  }

  // Helper to fetch with a curl command - uses the same approach as SlackCurlInput
  const fetchWithCurl = async (curl: string) => {
    setRefreshing(true)
    try {
      const parsed = parseSlackCurl(curl)
      if (!parsed.isValid) {
        toast.error("Invalid Slack curl command", {
          description: parsed.error || "Please check your curl command and try again. You can update it in Settings.",
        })
        // Don't show modal for validation errors, just show toast and return
        setRefreshing(false)
        return
      }

      // Extract necessary data from the curl command - SAME AS IN SlackCurlInput
      const { token, cookie, workspace } = parsed
      const url = parsed.url || ""

      // Create form data - SAME AS IN SlackCurlInput
      const formData: Record<string, string> = {}
      if (token) formData.token = token

      // Ensure we have count for emoji requests - SAME AS IN SlackCurlInput
      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }

      console.log("Making direct request to API proxy with curl data")

      // Make the request to our API endpoint - EXACT SAME CODE AS SlackCurlInput
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

      // Process the emoji data - similar to SlackCurlInput
      let emojiArray = []
      if (data.emojis && Array.isArray(data.emojis)) {
        // Handle the response from our API which returns { emojis: [...] }
        emojiArray = data.emojis
        console.log(`Found ${emojiArray.length} emojis in data.emojis`);
      } else if (data.emoji && Array.isArray(data.emoji)) {
        emojiArray = data.emoji
        console.log(`Found ${emojiArray.length} emojis in data.emoji`);
      } else if (data.slackResponse && data.slackResponse.emoji) {
        // Convert emoji object to array if needed
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

      // Log the first emoji to see its structure
      if (emojiArray.length > 0) {
        console.log('First emoji in array:', emojiArray[0]);
      }

      // Process the emoji array with consistent fields
      const recentData = emojiArray.map((emoji: any) => ({
        name: emoji.name,
        url: emoji.url,
        team_id: emoji.team_id || "",
        user_id: emoji.user_id || "",
        // IMPORTANT: Preserve the created timestamp if it exists and is not 0
        created: (emoji.created && emoji.created > 0) ? emoji.created : Math.floor(Date.now() / 1000),
        is_alias: emoji.is_alias || 0,
        alias_for: emoji.alias_for || "",
        is_bad: emoji.is_bad || false,
        user_display_name: emoji.user_display_name || "",
        can_delete: emoji.can_delete || false,
        aliases: emoji.aliases || [],
      }))

      // Log the first processed emoji to see its structure
      if (recentData.length > 0) {
        console.log('First processed emoji:', recentData[0]);
        console.log('Newest emoji (by created timestamp):', recentData.reduce((newest: any, emoji: any) =>
          emoji.created > newest.created ? emoji : newest
        ));
      }

      if (recentData && Array.isArray(recentData) && recentData.length > 0) {
        // Sort by created timestamp descending (newest first)
        const sortedData = [...recentData].sort((a, b) => (b.created || 0) - (a.created || 0));
        console.log(`About to update context with ${sortedData.length} emojis`);
        console.log('Newest 5 emojis after sorting:', sortedData.slice(0, 5).map(e => ({
          name: e.name,
          created: e.created,
          date: new Date(e.created * 1000).toISOString()
        })));
        setEmojiData(sortedData)
        const workspaceName = parsed.workspace || "slack-workspace"
        setWorkspace(workspaceName)
        setHasRealData(true)
        setSlackLoaded(true)
        console.log('Saving to localStorage...');
        safePersistEmojiDataToLocalStorage(sortedData, { source: "app-sidebar" })
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", sortedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        console.log(`Successfully loaded ${sortedData.length} emojis from ${workspaceName}`)
        console.log('Dispatching emojiDataUpdated event...');
        window.dispatchEvent(new CustomEvent("emojiDataUpdated", {
          detail: {
            emojiData: sortedData,
            workspace: workspaceName,
            timestamp: Date.now()
          }
        }))
        console.log('Event dispatched!');
      } else {
        toast.error("Failed to load emojis", {
          description: "No emoji data returned from Slack. Please check your curl command in Settings or try again later.",
        })
        setSlackLoaded(false)
        // Don't show modal for API errors, just show toast
      }
    } catch (err) {
      // Check for invalid_auth error specifically
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred."
      const isAuthError = errorMessage.includes("invalid_auth")

      toast.error(isAuthError ? "Slack Authentication Expired" : "Error refreshing emoji data", {
        description: isAuthError
          ? "Your Slack token has expired. Please get a fresh curl command from Slack and update it in Settings."
          : errorMessage || "Failed to fetch emojis from Slack. You can update your curl command in Settings.",
      })
      setSlackLoaded(false)
      // Don't show modal for fetch errors, just show toast
    } finally {
      setRefreshing(false)
    }
  }

  // Handler for modal submit
  const handleModalSubmit = async (curl: string) => {
    if (typeof window !== "undefined") {
      const trimmedCurl = curl.trim()
      localStorage.setItem("slackCurlCommand", trimmedCurl)
      setHasCurl(true)
      // Dispatch a custom event so other components (e.g., sidebar) can react
      window.dispatchEvent(new Event("slackCurlCommandUpdated"))
    }
    setModalOpen(false)
    await fetchWithCurl(curl.trim())
  }

  const handleModalClose = () => setModalOpen(false)

  const pathname = usePathname()

  // Create navigation items with indicators
  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Leaderboard",
      url: "/leaderboard",
      icon: TrophyIcon,
    },
    {
      title: "Visualizations",
      url: "/visualizations",
      icon: BarChartIcon,
    },
    {
      title: "Explorer",
      url: "/explorer",
      icon: Images,
    },
    {
      title: "My Emojis",
      url: "/my-emojis",
      icon: UserCircle,
    },
    {
      title: "Wrapped",
      url: "/wrapped",
      icon: Gift,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon,
      indicator: !hasRealData ? "error" as const : undefined,
    },
    {
      title: "Refresh",
      url: "#refresh",
      icon: RefreshCwIcon,
      action: "refresh",
    },
  ];

  // GitHub nav item (separated visually)
  const githubNavItems = [
    {
      title: "Get the app",
      url: "https://www.emojistudio.xyz/mobile",
      icon: Smartphone,
      external: true,
      badge: "NEW",
    },
    {
      title: "GitHub",
      url: "https://github.com/jweingardt12/Emoji-Studio",
      icon: GithubIcon,
      external: true,
    },
    {
      title: "Feedback",
      url: "#feedback",
      icon: MessageSquareIcon,
      action: "feedback",
    },
  ];

  // Handler for navigation (close sidebar on mobile)
  // Use Sidebar context to close the sidebar on mobile
  // Remove direct access to window.__SIDEBAR_CTX__ as it's not properly typed
  const sidebarCtx = typeof window !== "undefined" ? ((window as any).__SIDEBAR_CTX__ || null) : null;
  const { trackEmojiFilter, trackNavigation, trackFeedbackClicked } = useAnalytics();

  // Use the sidebar hook safely
  let isMobile = false;
  let setOpenMobile = (open: boolean) => { };

  try {
    // This will only work in components rendered inside the SidebarProvider
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sidebarContext = useSidebar();
    isMobile = sidebarContext.isMobile;
    setOpenMobile = sidebarContext.setOpenMobile;
  } catch { }

  const handleNavigate = (navItem?: { title: string; url: string; action?: string }) => {
    console.log('Navigation handler called with:', navItem);

    // Close mobile sidebar if on mobile
    if (isMobile) setOpenMobile(false);

    // Track the navigation event if we have a nav item
    if (navItem && navItem.url && !navItem.url.startsWith('#')) {
      try {
        console.log('About to track navigation event for:', navItem.title);

        // Use our analytics utility to track navigation
        console.log('Using trackNavigation to track page view');
        // Use the dedicated navigation tracking function
        trackNavigation(navItem.title, navItem.url);

        // Track feedback click specifically
        if (navItem.action === 'feedback') {
          trackFeedbackClicked();
        }

        console.log('Navigation tracking complete for:', navItem.title);

        // NavMain handles the actual navigation, we just track and close sidebar
      } catch (error) {
        console.error('Error in navigation tracking:', error);
      }
    }
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="pl-4 pt-4 pb-2">
          <Link
            href="/dashboard"
            onClick={() => {
              handleNavigate({ title: "Dashboard", url: "/dashboard" });
            }}
            className="flex items-center gap-2 focus:outline-none"
          >
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image src="/logo.png" alt="Emoji Studio Logo" fill className="object-contain" priority />
            </div>
            <span className="text-xl font-bold">Emoji Studio</span>
          </Link>
          {/* Connection status indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 mt-2 pl-1 cursor-default">
                  <span className={cn(
                    "h-2 w-2 rounded-full flex-shrink-0",
                    hasRealData ? "bg-green-500" : "bg-red-400"
                  )} />
                  <span className="text-[10px] text-muted-foreground truncate">
                    {hasRealData
                      ? workspace || "Connected"
                      : "Not connected"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{hasRealData
                  ? `Connected to ${workspace || "workspace"}`
                  : "Go to Settings to connect your Slack workspace"
                }</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col h-full">
        <div className="flex-grow min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-2 pb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/create"
                    prefetch={true}
                    onClick={() => {
                      handleNavigate({ title: "Create", url: "/create" });
                    }}
                    className="flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <CirclePlus className="h-4 w-4" />
                    <span>Create Emoji</span>
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
          <NavMain items={navItems} onRefresh={handleRefresh} refreshing={refreshing} slackLoaded={slackLoaded} onNavigate={handleNavigate} hasData={hasRealData || emojiData.length > 0} />
          <hr className="my-3 border-sidebar-border" />
          <NavMain items={githubNavItems} onNavigate={handleNavigate} hasData={hasRealData || emojiData.length > 0} onFeedback={() => setFeedbackModalOpen(true)} />
        </div>

        <div className="mt-auto pt-4">
          <hr className="mb-3 border-sidebar-border" />
          <p className="px-3 py-2 text-xs text-muted-foreground text-center">
            This project is neither affiliated nor endorsed by Slack in any way.
          </p>
          <MadeWithLove />
        </div>
      </SidebarContent>
      {modalOpen && <CurlCommandModal open={modalOpen} onClose={handleModalClose} onSubmit={handleModalSubmit} />}
      {feedbackModalOpen && <FeedbackModal open={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />}
    </Sidebar>
  );
}
