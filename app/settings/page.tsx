"use client"

import { SlackCurlInput } from "@/components/slack-curl-input"
import { ChromeExtensionOption } from "@/components/chrome-extension-option"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, ChevronDown, ChevronUp, Terminal, Bell, Clock, Link2, Trophy, Database, RefreshCw, MessageSquare, Github, ExternalLink } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { openpanel } from "@/lib/safe-openpanel"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { cn } from "@/lib/utils"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { ShineBorder } from "@/src/components/magicui/shine-border"
import { useAnalytics } from "@/lib/analytics"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"

type SettingsSection = 'connection' | 'notifications' | 'preferences' | 'data' | 'actions';

// Theme Selector Component
function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex gap-1">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' }
  ]

  return (
    <div className="flex gap-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => {
            setTheme(value)
            // Haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10)
            }
          }}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
            "hover:bg-muted active:scale-95",
            theme === value 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-card border border-border"
          )}
          aria-label={label}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
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
  const [errors, setErrors] = useState<{name?: string; email?: string; message?: string}>({})
  const { trackFeedbackSubmitted, trackFeedbackSubmissionFailed, trackFeedbackModalClosed, trackFeedbackModalOpened } = useAnalytics()

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Validate form fields
  const validateForm = () => {
    const newErrors: {name?: string; email?: string; message?: string} = {}
    
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
      trackFeedbackModalOpened()
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [open, trackFeedbackModalOpened])

  const handleClose = () => {
    setIsVisible(false)
    trackFeedbackModalClosed(showSuccess)
    setTimeout(() => {
      onClose()
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
    
    if (!validateForm()) {
      return
    }
    
    setSubmitting(true)
    
    try {
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
        currentPage: "/settings",
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
      
      setShowSuccess(true)
      trackFeedbackSubmitted(feedbackType as 'bug' | 'feature', !!workspace, "/settings")
      
      setTimeout(() => {
        handleClose()
        setTimeout(() => {
          toast.success("Feedback sent! Thank you for your feedback. We'll get back to you soon.")
        }, 300)
      }, 3000)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      trackFeedbackSubmissionFailed(errorMessage)
      toast.error("Error submitting feedback. Please try again later.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null
  
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
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
              <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 bg-green-500/20"></div>
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
                if (errors.name) setErrors({...errors, name: undefined})
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
                if (errors.email) setErrors({...errors, email: undefined})
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
                if (errors.message) setErrors({...errors, message: undefined})
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

export default function SettingsPage() {
  const pathname = usePathname()
  
  // Initialize active section from URL hash or default to 'connection'
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1) as SettingsSection;
      if (hash && ['connection', 'notifications', 'preferences', 'data', 'actions'].includes(hash)) {
        return hash;
      }
    }
    return 'connection';
  });
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem("inactivityThresholdMonths")
      return storedValue ? parseInt(storedValue, 10) : 3
    }
    return 3
  })
  
  const [isManualSetupOpen, setIsManualSetupOpen] = useState(false)
  const [hasSlack, setHasSlack] = useState(false)
  
  // Notification settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationFrequency, setNotificationFrequency] = useState('daily')
  const [notificationTime, setNotificationTime] = useState('09:00')
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | null>(null)
  const [hasExtension, setHasExtension] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  
  const { emojiData, hasRealData, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  const hasMountedRef = useRef(false);
  const previousThresholdRef = useRef(inactivityThresholdMonths);
  const hasUserInteractedRef = useRef(false);
  
  // Handle hash changes for direct linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as SettingsSection;
      if (hash && ['connection', 'notifications', 'preferences', 'data', 'actions'].includes(hash)) {
        setActiveSection(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL hash when section changes
  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    window.history.replaceState(null, '', `#${section}`);
    openpanel.track('Settings: Navigate Section', { section });
  };
  
  // Load notification settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem('notificationSettings');
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings);
          setNotificationsEnabled(settings.enabled || false);
          setNotificationFrequency(settings.frequency || 'daily');
          setNotificationTime(settings.time || '09:00');
        } catch (e) {
          console.error('Failed to parse notification settings:', e);
        }
      }
    }
  }, []);
  
  // Save notification settings when they change (only after user interaction)
  useEffect(() => {
    if (!hasUserInteractedRef.current) {
      return;
    }
    
    const settings = {
      enabled: notificationsEnabled,
      frequency: notificationFrequency,
      time: notificationTime,
      checkWindow: notificationFrequency === 'realtime' ? 900 : notificationFrequency === 'hourly' ? 3600 : 86400
    };
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    // Send settings to Chrome extension if available
    if (hasExtension && typeof window !== 'undefined') {
      window.postMessage({
        type: 'UPDATE_NOTIFICATION_SETTINGS',
        settings: settings
      }, '*');
    }
    
    toast.success('Notification settings saved!');
    openpanel.track('Settings: Update Notifications', settings);
  }, [notificationsEnabled, notificationFrequency, notificationTime, hasExtension]);
  
  // Check notification permission status
  useEffect(() => {
    const checkPermission = async () => {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    };
    checkPermission();
  }, [notificationsEnabled]);
  
  // Check for Slack connection and extension
  useEffect(() => {
    setHasSlack(hasSlackConnection())
    
    // Check if we've already detected the extension in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('emojiStudioExtensionDetected') === 'true') {
      console.log('[Settings] Extension previously detected in session')
      setHasExtension(true)
      return
    }
    
    // Check if extension is installed
    const checkExtension = () => {
      console.log('[Settings] Checking for extension...')
      
      // Method 1: Check window property
      if (typeof window !== 'undefined' && (window as any).__EMOJI_STUDIO_EXTENSION__) {
        console.log('[Settings] Extension detected via window.__EMOJI_STUDIO_EXTENSION__')
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
        return true
      }
      
      // Method 2: Check if chrome.runtime is available (for injected scripts)
      if (typeof window !== 'undefined' && typeof (window as any).chrome !== 'undefined' && (window as any).chrome?.runtime?.id) {
        console.log('[Settings] Extension detected via chrome.runtime.id:', (window as any).chrome.runtime.id)
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
        return true
      }
      
      console.log('[Settings] Extension not detected')
      return false
    }
    
    // Check immediately
    checkExtension()
    
    // Check multiple times with delays
    const timeouts = [100, 500, 1000].map(delay => 
      setTimeout(() => {
        console.log(`[Settings] Rechecking for extension after ${delay}ms`)
        checkExtension()
      }, delay)
    )
    
    // Listen for extension installed event
    const handleExtensionInstalled = (event: any) => {
      console.log('[Settings] Extension detected via event:', event.detail)
      sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
      setHasExtension(true)
    }
    
    // Also listen for postMessage
    const handleMessage = (event: MessageEvent) => {
      console.log('[Settings] Received postMessage:', event.data?.type)
      if (event.data?.type === 'EMOJI_STUDIO_EXTENSION_INSTALLED') {
        console.log('[Settings] Extension detected via postMessage:', event.data.version)
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
      }
    }
    
    const handleEmojiDataUpdate = () => {
      setHasSlack(hasSlackConnection())
      checkExtension()
    }
    
    window.addEventListener('emoji-studio-extension-installed', handleExtensionInstalled)
    window.addEventListener('message', handleMessage)
    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdate)
    
    return () => {
      timeouts.forEach(clearTimeout)
      window.removeEventListener('emoji-studio-extension-installed', handleExtensionInstalled)
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdate)
    }
  }, [])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[SettingsPage] Ensuring extension listener is active');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("inactivityThresholdMonths", inactivityThresholdMonths.toString());

      if (hasMountedRef.current) {
        if (previousThresholdRef.current !== inactivityThresholdMonths) {
          toast.success("Inactive user threshold saved!");
          openpanel.track("Settings: Change Inactivity Threshold", { months: inactivityThresholdMonths });
        }
      } else {
        hasMountedRef.current = true;
      }
      previousThresholdRef.current = inactivityThresholdMonths;
    }
  }, [inactivityThresholdMonths]);

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    if (!isNaN(value) && value >= 0) {
      setInactivityThresholdMonths(value)
    }
  }

  // Handler to refresh emoji data (copied from sidebar)
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

  // Helper to fetch with a curl command (copied from sidebar)
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
        console.log(`About to update context with ${sortedData.length} emojis`);
        setEmojiData(sortedData)
        const workspaceName = parsed.workspace || "slack-workspace"
        setWorkspace(workspaceName)
        setHasRealData(true)
        localStorage.setItem("emojiData", JSON.stringify(sortedData))
        localStorage.setItem("workspace", workspaceName)
        localStorage.setItem("emojiCount", sortedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        console.log(`Successfully loaded ${sortedData.length} emojis from ${workspaceName}`)
        window.dispatchEvent(new CustomEvent("emojiDataUpdated", { 
          detail: { 
            emojiData: sortedData,
            workspace: workspaceName,
            timestamp: Date.now()
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

  const sections = [
    {
      id: 'connection' as const,
      label: 'Connection',
      icon: Link2,
      description: 'Connect your Slack workspace'
    },
    {
      id: 'notifications' as const,
      label: 'Notifications',
      icon: Bell,
      description: 'Manage notification preferences'
    },
    {
      id: 'preferences' as const,
      label: 'Preferences',
      icon: Trophy,
      description: 'Customize display settings'
    },
    {
      id: 'data' as const,
      label: 'Data Management',
      icon: Database,
      description: 'Manage cached data'
    },
    {
      id: 'actions' as const,
      label: 'Actions',
      icon: RefreshCw,
      description: 'Quick actions and links'
    }
  ];

  return (
    <div className="flex flex-col gap-2 py-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6">
      <ChromeExtensionHandler />
      <div className="px-2 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage your workspace connection, notifications, and preferences
          </p>
        </div>

        {/* Settings Layout with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Sidebar Navigation - Mobile optimized */}
          <aside className="w-full lg:w-64 lg:shrink-0">
            {/* Mobile: Horizontal scrollable pills with visual affordance */}
            <div className="lg:hidden relative">
              {/* Gradient fade indicators */}
              <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none lg:hidden" />
              <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none lg:hidden" />
              
              <nav className="flex gap-2 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide px-1">
                {sections.map((section, index) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        handleSectionChange(section.id)
                        // Haptic feedback
                        if ('vibrate' in navigator) {
                          navigator.vibrate(10)
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-full transition-all duration-200 whitespace-nowrap snap-center",
                        "min-w-fit touch-target",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary border-2 border-primary shadow-sm font-semibold"
                          : "bg-card border border-border text-foreground active:scale-95",
                        index === 0 && "ml-1",
                        index === sections.length - 1 && "mr-1"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0",
                        activeSection === section.id && "text-primary"
                      )} />
                      <span className="text-sm">{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            
            {/* Desktop: Vertical sidebar */}
            <nav className="hidden lg:flex lg:flex-col gap-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-left w-full",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="font-medium text-sm">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content Area */}
          <div className="flex-1 max-w-2xl mt-2 lg:mt-0">
            {/* Connection Section */}
            {activeSection === 'connection' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Connection</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect your Slack workspace to import and manage emojis
                  </p>
                </div>
                <div className="space-y-4">
                  {!hasSlack ? (
                    <>
                      {/* Chrome Extension Connection Card */}
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-primary/10 p-3">
                              <ChromeIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <h3 className="font-semibold">Chrome Extension (Recommended)</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  One-click authentication with the Chrome extension. The fastest way to connect your Slack workspace.
                                </p>
                              </div>
                              <Button
                                className="w-full sm:w-auto"
                                asChild
                              >
                                <a 
                                  href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2"
                                >
                                  <ChromeIcon className="h-4 w-4" />
                                  Get Chrome Extension
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Manual Setup Alternative */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-muted p-3">
                              <Terminal className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <Button
                                variant="ghost"
                                onClick={() => setIsManualSetupOpen(!isManualSetupOpen)}
                                className="w-full justify-between p-0 h-auto text-left hover:bg-transparent"
                              >
                                <div>
                                  <h3 className="font-semibold">Manual Setup</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Advanced method using browser developer tools
                                  </p>
                                </div>
                                {isManualSetupOpen ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Collapsible open={isManualSetupOpen}>
                                <CollapsibleContent>
                                  <div className="mt-4">
                                    <SlackCurlInput />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <>
                      {/* Connected state */}
                      <Card className="border-green-500/20 bg-green-500/5">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-green-500/10 p-3">
                              <Zap className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">Workspace Connected</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Your Slack workspace is synced and ready
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <ChromeExtensionOption />
                      
                      {/* Update connection option */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <h3 className="font-semibold">Update Connection</h3>
                            <p className="text-sm text-muted-foreground">
                              Refresh your authentication or connect a different workspace
                            </p>
                            <SlackCurlInput />
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Notifications</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure when and how you receive emoji notifications
                  </p>
                </div>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="mb-2">
                      <h3 className="font-semibold">New Emoji Notifications</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Get alerts when new emojis are added to your workspace. Requires the Chrome extension for background checks.
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notifications-enabled">Enable Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Receive browser notifications about new emojis
                        </p>
                      </div>
                      <Switch
                        id="notifications-enabled"
                        checked={notificationsEnabled}
                        onCheckedChange={async (checked) => {
                          openpanel.track('Settings: Notification Toggle', { enabled: checked });
                          
                          if (checked && permissionStatus !== 'granted') {
                            if ('Notification' in window) {
                              const permission = await Notification.requestPermission();
                              setPermissionStatus(permission);
                              openpanel.track('Settings: Notification Permission Request', { result: permission });
                              
                              if (permission !== 'granted') {
                                toast.error('Notification permission denied. Please enable notifications in your browser settings.');
                                return;
                              }
                            }
                          }
                          hasUserInteractedRef.current = true;
                          setNotificationsEnabled(checked);
                        }}
                      />
                    </div>
                    
                    {notificationsEnabled && (
                      <>
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
                          <p className="font-medium text-primary">How it works:</p>
                          <ul className="space-y-0.5 text-muted-foreground ml-4 list-disc">
                            <li>Chrome extension checks for new emojis in the background</li>
                            <li>Works even when Emoji Studio tabs are closed</li>
                            <li>You'll get desktop notifications when new emojis are found</li>
                            <li>Click notifications to view new emojis in Explorer</li>
                          </ul>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="notification-frequency">Check Frequency</Label>
                          <Select value={notificationFrequency} onValueChange={(value) => {
                            hasUserInteractedRef.current = true;
                            setNotificationFrequency(value);
                          }}>
                            <SelectTrigger id="notification-frequency" className="w-full sm:w-1/2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="realtime">Every 15 minutes</SelectItem>
                              <SelectItem value="hourly">Every hour</SelectItem>
                              <SelectItem value="daily">Once per day</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            How often to check for new emojis while the tab is open
                          </p>
                        </div>
                        
                        {notificationFrequency === 'daily' && (
                          <div className="space-y-2">
                            <Label htmlFor="notification-time" className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Daily Check Time
                            </Label>
                            <Input
                              id="notification-time"
                              type="time"
                              value={notificationTime}
                              onChange={(e) => {
                                hasUserInteractedRef.current = true;
                                setNotificationTime(e.target.value);
                              }}
                              className="w-full sm:w-1/2"
                            />
                            <p className="text-xs text-muted-foreground">
                              What time to check for new emojis each day (your local time)
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {!hasExtension && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          <strong>Chrome extension required:</strong> Install the Emoji Studio extension to receive background notifications.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          asChild
                        >
                          <a 
                            href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2"
                          >
                            <ChromeIcon className="h-3 w-3" />
                            Install Extension
                          </a>
                        </Button>
                      </div>
                    )}
                    
                    {!hasSlack && hasExtension && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">
                          Connect your Slack workspace to start receiving notifications about new emojis.
                        </p>
                      </div>
                    )}
                    
                    {permissionStatus === 'denied' && (
                      <div className="rounded-lg bg-destructive/10 p-3">
                        <p className="text-xs text-destructive">
                          Notification permissions are blocked. Please enable notifications in your browser settings to use this feature.
                        </p>
                      </div>
                    )}
                    
                    {notificationsEnabled && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            console.log('[Sample Notification] Button clicked');
                            openpanel.track('Settings: Sample Notification Clicked');
                            
                            if (!('Notification' in window)) {
                              toast.error('Notifications are not supported in this browser');
                              openpanel.track('Settings: Sample Notification Failed', { reason: 'not_supported' });
                              return;
                            }
                            
                            if (Notification.permission !== 'granted') {
                              toast.error('Please enable notifications first');
                              openpanel.track('Settings: Sample Notification Failed', { reason: 'permission_denied' });
                              return;
                            }
                            
                            try {
                              // Simulate finding new emojis
                              const sampleEmojis = ['party-parrot', 'celebrate', 'awesome', 'ship-it', 'rocket'];
                              const randomCount = Math.floor(Math.random() * 3) + 1;
                              const selectedEmojis = sampleEmojis.slice(0, randomCount);
                              
                              const title = randomCount === 1 
                                ? `New emoji: :${selectedEmojis[0]}:`
                                : `${randomCount} new emojis added`;
                              
                              const notification = new Notification('Emoji Studio', {
                                body: title + '\nClick to view in Explorer',
                                icon: '/logo-192.png',
                                badge: '/logo-192.png',
                                tag: `new-emojis-sample-${Date.now()}`,
                                requireInteraction: false
                              });
                              
                              notification.onclick = () => {
                                openpanel.track('Settings: Sample Notification Clicked Through');
                                // Navigate to explorer with a sample date filter
                                const sinceTimestamp = Math.floor(Date.now() / 1000 - 86400); // 24 hours ago
                                window.location.href = `/explorer?since=${sinceTimestamp}`;
                                notification.close();
                              };
                              
                              toast.success('Sample notification sent! This is what you\'ll see when new emojis are found.');
                              console.log('[Sample Notification] Created successfully');
                              openpanel.track('Settings: Sample Notification Sent', { emojiCount: randomCount });
                            } catch (error) {
                              console.error('[Sample Notification] Failed:', error);
                              toast.error('Failed to send sample notification');
                              openpanel.track('Settings: Sample Notification Error', { error: String(error) });
                            }
                          }}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Try Sample Notification
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Preferences</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize your app experience and display settings
                  </p>
                </div>
                
                {/* Theme Settings Card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold">Appearance</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customize how Emoji Studio looks on your device
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Theme</Label>
                          <p className="text-xs text-muted-foreground">
                            Choose between light, dark, or system theme
                          </p>
                        </div>
                        <ThemeSelector />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Leaderboard Settings Card */}
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold">Leaderboard Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure how the emoji leaderboard displays users
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inactivityThreshold">Inactive User Threshold (months)</Label>
                      <Input 
                        id="inactivityThreshold" 
                        type="number" 
                        value={inactivityThresholdMonths} 
                        onChange={handleThresholdChange} 
                        min="0"
                        className="w-full sm:w-1/2 md:w-1/3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Users who haven't submitted an emoji in this many months will be hidden when 'Show Inactive' is off.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Data Management Section */}
            {activeSection === 'data' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Data Management</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your cached data and storage settings
                  </p>
                </div>
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  <FetchStatsDisplay />
                  <Card>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold">Clear Local Storage</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Remove all cached data and preferences
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <p className="text-xs text-destructive">
                            Warning: This will remove all cached emoji data, workspace information, 
                            and stored preferences. You'll need to reconnect to Slack.
                          </p>
                        </div>
                        <ClearLocalStorageButton />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            
            {/* Actions Section */}
            {activeSection === 'actions' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Actions</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quick actions and useful links
                  </p>
                </div>
                
                <div className="grid gap-4 sm:gap-6">
                  {/* Refresh Data Card */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-3">
                          <RefreshCw className={cn("h-6 w-6 text-primary", refreshing && "animate-spin")} />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold">Refresh Emoji Data</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Sync the latest emojis from your Slack workspace
                            </p>
                          </div>
                          <Button
                            onClick={handleRefresh}
                            disabled={refreshing || !hasRealData}
                            className="w-full sm:w-auto"
                          >
                            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
                            {refreshing ? "Refreshing..." : "Refresh Now"}
                          </Button>
                          {!hasRealData && (
                            <p className="text-xs text-muted-foreground">
                              Connect your Slack workspace first to enable refresh
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Feedback Card */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-blue-500/10 p-3">
                          <MessageSquare className="h-6 w-6 text-blue-500" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold">Send Feedback</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Report bugs, request features, or share your thoughts
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => setFeedbackModalOpen(true)}
                            className="w-full sm:w-auto"
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Give Feedback
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* GitHub Card */}
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-gray-500/10 p-3">
                          <Github className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="font-semibold">View on GitHub</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Check out the source code, contribute, or report issues
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            asChild
                            className="w-full sm:w-auto"
                          >
                            <a 
                              href="https://github.com/jweingardt12/Emoji-Studio" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center"
                            >
                              <Github className="mr-2 h-4 w-4" />
                              Open GitHub
                              <ExternalLink className="ml-2 h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Feedback Modal */}
      {feedbackModalOpen && (
        <FeedbackModal 
          open={feedbackModalOpen} 
          onClose={() => setFeedbackModalOpen(false)} 
        />
      )}
    </div>
  )
}