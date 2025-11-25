"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Smartphone, Check, Link2, Bell, Trophy, Database, RefreshCw } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { openpanel } from "@/lib/safe-openpanel"
import { Button } from "@/components/ui/button"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import { cn } from "@/lib/utils"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { useIsMobile } from "@/hooks/use-mobile"
import { FeedbackModal } from "@/components/feedback-modal"

// Import section components
import {
  ConnectionSection,
  NotificationsSection,
  PreferencesSection,
  PWASection,
  DataSection,
  ActionsSection,
} from "./sections"

type SettingsSection = 'connection' | 'notifications' | 'preferences' | 'data' | 'actions' | 'pwa';

export default function SettingsPage() {
  const isMobile = useIsMobile()
  const [showPWAWelcome, setShowPWAWelcome] = useState(false)

  // Check if it's a first-time PWA user
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('pwa') === 'first') {
      setShowPWAWelcome(true)
      // Remove the query parameter from URL
      window.history.replaceState({}, '', '/settings')
    }
  }, [])

  // Initialize active section from URL hash or default to 'connection'
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1) as SettingsSection;
      if (hash && ['connection', 'notifications', 'preferences', 'data', 'actions', 'pwa'].includes(hash)) {
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

  const [hasSlack, setHasSlack] = useState(false)

  // Notification settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationFrequency, setNotificationFrequency] = useState('daily')
  const [notificationTime, setNotificationTime] = useState('09:00')
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | null>(null)
  const [hasExtension, setHasExtension] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)

  const { hasRealData, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  const hasMountedRef = useRef(false);
  const previousThresholdRef = useRef(inactivityThresholdMonths);
  const hasUserInteractedRef = useRef(false);

  // Handle hash changes for direct linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as SettingsSection;
      if (hash && ['connection', 'notifications', 'preferences', 'data', 'actions', 'pwa'].includes(hash)) {
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

    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
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
      setHasExtension(true)
      return
    }

    // Check if extension is installed
    const checkExtension = () => {
      // Method 1: Check window property
      if (typeof window !== 'undefined' && (window as any).__EMOJI_STUDIO_EXTENSION__) {
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
        return true
      }

      // Method 2: Check if chrome.runtime is available (for injected scripts)
      if (typeof window !== 'undefined' && typeof (window as any).chrome !== 'undefined' && (window as any).chrome?.runtime?.id) {
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
        return true
      }

      return false
    }

    // Check immediately
    checkExtension()

    // Check multiple times with delays
    const timeouts = [100, 500, 1000].map(delay =>
      setTimeout(() => {
        checkExtension()
      }, delay)
    )

    // Listen for extension installed event
    const handleExtensionInstalled = () => {
      sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
      setHasExtension(true)
    }

    // Also listen for postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'EMOJI_STUDIO_EXTENSION_INSTALLED') {
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

  // Handler to refresh emoji data
  const handleRefresh = async () => {
    if (!hasRealData) {
      return
    }

    // Check for extension auth data first
    const extensionToken = typeof window !== "undefined" ? localStorage.getItem("extensionToken") : null
    const extensionCookie = typeof window !== "undefined" ? localStorage.getItem("extensionCookie") : null
    const workspace = typeof window !== "undefined" ? localStorage.getItem("workspace") : null

    if (extensionToken && extensionCookie && workspace) {
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

    if (!lastCurl || !lastCurl.trim()) {
      toast.error("No Slack connection found. Please connect your workspace first.")
      return
    }

    await fetchWithCurl(lastCurl.trim())
  }

  // Helper to fetch with a curl command
  const fetchWithCurl = async (curl: string) => {
    setRefreshing(true)
    try {
      const parsed = parseSlackCurl(curl)
      if (!parsed.isValid) {
        toast.error(parsed.error || "Invalid Slack curl command. Please check your connection.")
        setRefreshing(false)
        return
      }

      const { token, cookie } = parsed
      const url = parsed.url || ""

      const formData: Record<string, string> = {}
      if (token) formData.token = token

      if (!formData["count"] && url.includes("emoji")) {
        formData["count"] = "20000"
      }

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

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Error from Slack API: ${errorText}`)
      }

      const data = await response.json()

      let emojiArray = []
      if (data.emojis && Array.isArray(data.emojis)) {
        emojiArray = data.emojis
      } else if (data.emoji && Array.isArray(data.emoji)) {
        emojiArray = data.emoji
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
        } else if (Array.isArray(emojiObj)) {
          emojiArray = emojiObj;
        }
      }

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
        const sortedData = [...recentData].sort((a, b) => (b.created || 0) - (a.created || 0));
        setEmojiData(sortedData)
        const workspaceName = parsed.workspace || "slack-workspace"
        setWorkspace(workspaceName)
        setHasRealData(true)
        safePersistEmojiDataToLocalStorage(sortedData, { source: "settings-page" })
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
        toast.success(`Successfully refreshed ${sortedData.length} emojis!`)
      } else {
        toast.error("No emoji data returned from Slack. Please check your connection.")
      }
    } catch (err) {
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
      id: 'pwa' as const,
      label: 'Install App',
      icon: Smartphone,
      description: 'Install as mobile/desktop app'
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

      {/* PWA Welcome Message for first-time users */}
      {showPWAWelcome && (
        <div className="mx-3 sm:mx-4 lg:mx-6 mb-4">
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-primary/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <h2 className="text-lg font-semibold">Welcome to Emoji Studio Mobile!</h2>
                  <p className="text-sm text-muted-foreground">
                    To get started, you'll need to sync with your desktop browser. Choose one of these options below:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 mt-3">
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Pair with Desktop:</strong> Scan a QR code from your desktop browser</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Chrome Extension:</strong> Install our extension for automatic sync</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span><strong>Manual Setup:</strong> Copy a cURL command from Slack</span>
                    </li>
                  </ul>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPWAWelcome(false)}
                    className="mt-3"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="px-3 sm:px-4 lg:px-6">
        {/* Header */}
        <div className={`${isMobile ? 'pt-4 pb-3' : 'mb-4 sm:mb-6 lg:mb-8'}`}>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Settings
          </h1>
          {!isMobile && (
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Manage your workspace connection, notifications, and preferences
            </p>
          )}
        </div>

        {/* Settings Layout with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Sidebar Navigation - Mobile optimized */}
          <aside className="w-full lg:w-64 lg:shrink-0">
            {/* Mobile: Horizontal scrollable pills */}
            <div className="lg:hidden relative">
              <nav className="flex gap-1 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide px-3">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionChange(section.id)}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap snap-center",
                        "min-w-fit text-[11px]",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary border border-primary/30 shadow-sm font-medium"
                          : "bg-card/80 border border-border/50 text-muted-foreground active:scale-95"
                      )}
                    >
                      <Icon className={cn(
                        "h-3 w-3 shrink-0",
                        activeSection === section.id && "text-primary"
                      )} />
                      <span>{section.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Desktop: Vertical sidebar with descriptions */}
            <nav className="hidden lg:flex lg:flex-col gap-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 rounded-lg transition-all duration-200 text-left w-full group",
                      activeSection === section.id
                        ? "bg-primary/10 shadow-sm"
                        : "hover:bg-muted"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 shrink-0 mt-0.5",
                      activeSection === section.id
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "font-medium text-sm block",
                        activeSection === section.id
                          ? "text-primary"
                          : "text-foreground"
                      )}>
                        {section.label}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {section.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content Area */}
          <div className="flex-1 max-w-2xl mt-2 lg:mt-0">
            {/* Connection Section */}
            {activeSection === 'connection' && (
              <ConnectionSection hasSlack={hasSlack} isMobile={isMobile} />
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <NotificationsSection
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
                notificationFrequency={notificationFrequency}
                setNotificationFrequency={setNotificationFrequency}
                notificationTime={notificationTime}
                setNotificationTime={setNotificationTime}
                permissionStatus={permissionStatus}
                setPermissionStatus={setPermissionStatus}
                hasExtension={hasExtension}
                hasSlack={hasSlack}
                hasUserInteractedRef={hasUserInteractedRef}
              />
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <PreferencesSection
                inactivityThresholdMonths={inactivityThresholdMonths}
                onThresholdChange={handleThresholdChange}
              />
            )}

            {/* PWA Install Section */}
            {activeSection === 'pwa' && (
              <PWASection />
            )}

            {/* Data Management Section */}
            {activeSection === 'data' && (
              <DataSection />
            )}

            {/* Actions Section */}
            {activeSection === 'actions' && (
              <ActionsSection
                refreshing={refreshing}
                hasRealData={hasRealData}
                onRefresh={handleRefresh}
                onFeedbackOpen={() => setFeedbackModalOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {feedbackModalOpen && (
        <FeedbackModal
          open={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          currentPage="/settings"
        />
      )}
    </div>
  )
}
