"use client"

import type * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  Activity,
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
  Sparkles,
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
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { FeedbackModal } from "@/components/feedback-modal"
import { WhatsNewModal } from "@/components/whats-new-modal"

// Curl command modal using proper Dialog component
function CurlCommandModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (curl: string) => void }) {
  const [curl, setCurl] = useState("")
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Slack cURL Command</DialogTitle>
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

import { useSidebar } from "@/components/ui/sidebar";
import { useAnalytics } from "@/lib/analytics";
import { useRouter } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [hasCurl, setHasCurl] = useState<boolean>(false)
  const [slackLoaded, setSlackLoaded] = useState<boolean>(false)
  const { emojiData, hasRealData, workspace } = useEmojiData()

  // initialize on client mount and track emoji data changes
  useEffect(() => {
    function updateCurlState() {
      if (typeof window !== "undefined") {
        const storedCurl = localStorage.getItem("slackCurlCommand")
        const storedData = localStorage.getItem("emojiData")
        setHasCurl(!!storedCurl)
        setSlackLoaded(!!storedData && storedData !== "[]" && JSON.parse(storedData).length > 0)

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
      return
    }

    // Check for extension auth data first
    const extensionToken = typeof window !== "undefined" ? localStorage.getItem("extensionToken") : null
    const extensionCookie = typeof window !== "undefined" ? localStorage.getItem("extensionCookie") : null
    const workspace = typeof window !== "undefined" ? localStorage.getItem("workspace") : null

    if (extensionToken && extensionCookie && workspace) {
      // We have extension auth data, construct a curl command from it
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
        throw new Error(`Error from Slack API: ${errorText}`)
      }

      const data = await response.json()

      // Process the emoji data - similar to SlackCurlInput
      let emojiArray = []
      if (data.emojis && Array.isArray(data.emojis)) {
        // Handle the response from our API which returns { emojis: [...] }
        emojiArray = data.emojis
      } else if (data.emoji && Array.isArray(data.emoji)) {
        emojiArray = data.emoji
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
        // IMPORTANT: Preserve the created timestamp if it exists and is not 0
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
        setSlackLoaded(true)
        safePersistEmojiDataToLocalStorage(sortedData, { source: "app-sidebar" })
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
      title: "Usage",
      url: "/reactions",
      icon: Activity,
      badge: "NEW",
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
      title: "What's New",
      url: "#whats-new",
      icon: Sparkles,
      action: "whatsNew",
      shimmer: true,
    },
    {
      title: "Get the app",
      url: "https://www.emojistudio.xyz/mobile",
      icon: Smartphone,
      external: true,
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

  const { trackEmojiFilter, trackNavigation, trackFeedbackClicked } = useAnalytics();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavigate = (navItem?: { title: string; url: string; action?: string }) => {
    // Close mobile sidebar if on mobile
    if (isMobile) setOpenMobile(false);

    // Track the navigation event if we have a nav item
    if (navItem && navItem.url && !navItem.url.startsWith('#')) {
      try {
        // Use the dedicated navigation tracking function
        trackNavigation(navItem.title, navItem.url);

        // Track feedback click specifically
        if (navItem.action === 'feedback') {
          trackFeedbackClicked();
        }

        // NavMain handles the actual navigation, we just track and close sidebar
      } catch (error) {
      }
    }
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="px-4 pt-4 pb-2">
          <Link
            href="/dashboard"
            onClick={() => {
              handleNavigate({ title: "Dashboard", url: "/dashboard" });
            }}
            className="flex items-center gap-2.5 focus:outline-hidden"
          >
            <Image src="/logo.png" alt="Emoji Studio Logo" width={36} height={36} className="shrink-0 rounded-lg" priority />
            <div className="flex flex-col min-w-0">
              <span className="text-base font-bold leading-tight tracking-tight">Emoji Studio</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      "text-[11px] leading-tight truncate max-w-[140px] font-medium",
                      hasRealData ? "text-muted-foreground" : "text-destructive/70"
                    )}>
                      {hasRealData
                        ? workspace || "Connected"
                        : "Not connected"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{hasRealData
                      ? `Connected to ${workspace || "workspace"}`
                      : "Go to Settings to connect"
                    }</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col h-full">
        <div className="grow min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-2 pb-2">
            <Link
              href="/create"
              prefetch={true}
              onClick={() => {
                handleNavigate({ title: "Create", url: "/create" });
              }}
              className="flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2.5 text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]"
            >
              <CirclePlus className="h-4 w-4" aria-hidden="true" />
              <span>Create Emoji</span>
            </Link>
          </div>
          <NavMain items={navItems} onRefresh={handleRefresh} refreshing={refreshing} slackLoaded={slackLoaded} onNavigate={handleNavigate} hasData={hasRealData || emojiData.length > 0} />
          <hr className="my-3 border-sidebar-border" />
          <NavMain items={githubNavItems} onNavigate={handleNavigate} hasData={hasRealData || emojiData.length > 0} onFeedback={() => setFeedbackModalOpen(true)} onWhatsNew={() => setWhatsNewOpen(true)} />
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
      {whatsNewOpen && <WhatsNewModal open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />}
    </Sidebar>
  );
}
