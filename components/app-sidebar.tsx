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
} from "lucide-react"

import { NavMain } from "./nav-main"
import { TrophyIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { InfoIcon } from "lucide-react";

import { useState, useEffect } from "react"
import { fetchSlackEmojis } from "@/lib/services/emoji-service"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { useToast } from "@/components/ui/use-toast"

// Simple Modal implementation
function Modal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (curl: string) => void }) {
  const [curl, setCurl] = useState("")
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-2">Enter Slack Curl Command</h2>
        <textarea
          className="w-full border rounded p-2 mb-4 text-sm bg-background"
          rows={5}
          placeholder="Paste your Slack curl command here..."
          value={curl}
          onChange={(e) => setCurl(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <button className="px-4 py-1 rounded bg-muted" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="px-4 py-1 rounded bg-primary text-white disabled:opacity-60"
            onClick={() => {
              if (curl.trim()) onSubmit(curl.trim())
            }}
            disabled={!curl.trim()}
            type="button"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

import { useSidebar } from "@/components/ui/sidebar";
import { useAnalytics } from "@/lib/analytics";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [hasCurl, setHasCurl] = useState<boolean>(false)
  const [slackLoaded, setSlackLoaded] = useState<boolean>(false)
  const { emojiData, hasRealData } = useEmojiData()

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
    
    // Always get the latest curl command from localStorage when refresh is clicked
    // This ensures we use any curl command that was saved in the settings page
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
        toast({
          title: "Invalid Slack curl command",
          description: parsed.error || "Please check your curl command and try again. You can update it in Settings.",
          variant: "destructive",
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
      if (data.emoji && Array.isArray(data.emoji)) {
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
        }
      }
      
      // Process the emoji array with consistent fields
      const recentData = emojiArray.map((emoji: any) => ({
        name: emoji.name,
        url: emoji.url,
        team_id: emoji.team_id || "",
        user_id: emoji.user_id || "",
        created: emoji.created || Math.floor(Date.now() / 1000),
        is_alias: emoji.is_alias || 0,
        is_bad: emoji.is_bad || false,
        user_display_name: emoji.user_display_name || "",
        can_delete: emoji.can_delete || false,
        aliases: emoji.aliases || [],
      }))
      if (recentData && Array.isArray(recentData) && recentData.length > 0) {
        setEmojiData(recentData)
        const workspaceName = parsed.workspace || "slack-workspace"
        setWorkspace(workspaceName)
        setHasRealData(true)
        setSlackLoaded(true)
        localStorage.setItem("emojiData", JSON.stringify(recentData))
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", recentData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        console.log(`Successfully loaded ${recentData.length} emojis from ${workspaceName}`)
        window.dispatchEvent(new CustomEvent("emojiDataUpdated"))
      } else {
        toast({
          title: "Failed to load emojis",
          description: "No emoji data returned from Slack. Please check your curl command in Settings or try again later.",
          variant: "destructive",
        })
        setSlackLoaded(false)
        // Don't show modal for API errors, just show toast
      }
    } catch (err) {
      // Check for invalid_auth error specifically
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred."
      const isAuthError = errorMessage.includes("invalid_auth")
      
      toast({
        title: isAuthError ? "Slack Authentication Expired" : "Error refreshing emoji data",
        description: isAuthError 
          ? "Your Slack token has expired. Please get a fresh curl command from Slack and update it in Settings." 
          : errorMessage || "Failed to fetch emojis from Slack. You can update your curl command in Settings.",
        variant: "destructive",
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

  // About nav item (separated visually)
  const aboutNavItems = [
    {
      title: "About",
      url: "/about",
      icon: InfoIcon,
    },
    {
      title: "GitHub",
      url: "https://github.com/jweingardt12/Emoji-Studio",
      icon: GithubIcon,
      external: true,
    },
  ];

  // Handler for navigation (close sidebar on mobile)
  // Use Sidebar context to close the sidebar on mobile
  // Remove direct access to window.__SIDEBAR_CTX__ as it's not properly typed
  const sidebarCtx = typeof window !== "undefined" ? ((window as any).__SIDEBAR_CTX__ || null) : null;
  const { trackEmojiFilter, trackNavigation } = useAnalytics();
  
  let handleNavigate = () => {};
  try {
    // This will only work in components rendered inside the SidebarProvider
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { isMobile, setOpenMobile } = useSidebar();
    
    // Update to track navigation events with better debugging
    handleNavigate = (navItem?: { title: string; url: string }) => { 
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
          
          console.log('Navigation tracking complete for:', navItem.title);
        } catch (error) {
          console.error('Error tracking navigation:', error);
        }
      }
    };
  } catch {}

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="pl-4 pt-4 pb-2 hidden md:block">
          <Link href="/dashboard" className="flex items-center gap-2 focus:outline-none">
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image src="/logo.png" alt="Emoji Studio Logo" fill className="object-contain" priority />
            </div>
            <span className="text-xl font-bold">Emoji Studio</span>
          </Link>
        </div>
        <div className="h-4 md:hidden"></div>
      </SidebarHeader>
      <SidebarContent className="flex flex-col h-full">
        <div className="flex-grow min-h-0 overflow-y-auto overscroll-contain">
          <NavMain items={navItems} onRefresh={handleRefresh} refreshing={refreshing} slackLoaded={slackLoaded} onNavigate={handleNavigate} />
          <hr className="my-3 border-muted" />
          <NavMain items={aboutNavItems} onNavigate={handleNavigate} />
        </div>
        
        <div className="mt-auto pt-4">
          <hr className="mb-3 border-muted" />
          <p className="px-3 py-2 text-xs text-muted-foreground text-center">
            This project is not affiliated or endorsed by Slack in any way.
          </p>
        </div>
      </SidebarContent>
      {modalOpen && <Modal open={modalOpen} onClose={handleModalClose} onSubmit={handleModalSubmit} />}
    </Sidebar>
  );
}
