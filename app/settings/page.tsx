"use client"

import { SlackCurlInput } from "@/components/slack-curl-input"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Zap, Terminal, Bell, Link2, Database, RefreshCw, MessageSquare, Github, ExternalLink, Smartphone, Check, ChevronRight, Clock, Sun, Moon, Monitor } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useTrack } from "@/lib/hooks/use-track"
import { Button } from "@/components/ui/button"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { cn } from "@/lib/utils"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { useTheme } from "next-themes"
import { useIsMobile } from "@/hooks/use-mobile"
import { PairToMobile } from "@/components/pair-to-mobile"
import { FeedbackModal } from "@/components/feedback-modal"
import { Badge } from "@/components/ui/badge"

type SettingsSection = 'connection' | 'preferences' | 'data' | 'about';

// Compact Theme Selector
function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="flex gap-1"><div className="w-9 h-9 rounded-lg bg-muted animate-pulse" /></div>
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
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-all",
            theme === value
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
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

// Setting Row Component
function SettingRow({ label, description, children, className }: {
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", className)}>
      <div className="space-y-0.5 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const isMobile = useIsMobile()
  const track = useTrack()

  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1) as SettingsSection
      if (['connection', 'preferences', 'data', 'about'].includes(hash)) return hash
    }
    return 'connection'
  })

  // Connection state
  const [hasSlack, setHasSlack] = useState(false)
  const [hasExtension, setHasExtension] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showManualSetup, setShowManualSetup] = useState(false)

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationFrequency, setNotificationFrequency] = useState('daily')
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | null>(null)
  const hasUserInteractedRef = useRef(false)

  // Preferences
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState(3)
  const hasMountedRef = useRef(false)

  // Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)

  const { emojiData, hasRealData, setEmojiData, setWorkspace, setHasRealData } = useEmojiData()

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return

    setHasSlack(hasSlackConnection())

    const storedThreshold = localStorage.getItem("inactivityThresholdMonths")
    if (storedThreshold) setInactivityThresholdMonths(parseInt(storedThreshold, 10))

    const storedNotifications = localStorage.getItem('notificationSettings')
    if (storedNotifications) {
      try {
        const settings = JSON.parse(storedNotifications)
        setNotificationsEnabled(settings.enabled || false)
        setNotificationFrequency(settings.frequency || 'daily')
      } catch (e) {}
    }

    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }

    // Check for extension
    if (sessionStorage.getItem('emojiStudioExtensionDetected') === 'true') {
      setHasExtension(true)
    } else {
      const checkExtension = () => {
        if ((window as any).__EMOJI_STUDIO_EXTENSION__ || (window as any).chrome?.runtime?.id) {
          sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
          setHasExtension(true)
          return true
        }
        return false
      }
      checkExtension()
      setTimeout(checkExtension, 500)
    }

    hasMountedRef.current = true
  }, [])

  // Listen for data updates
  useEffect(() => {
    const handleUpdate = () => setHasSlack(hasSlackConnection())
    window.addEventListener('emojiDataUpdated', handleUpdate)
    return () => window.removeEventListener('emojiDataUpdated', handleUpdate)
  }, [])

  // Save inactivity threshold
  useEffect(() => {
    if (!hasMountedRef.current) return
    localStorage.setItem("inactivityThresholdMonths", inactivityThresholdMonths.toString())
  }, [inactivityThresholdMonths])

  // Save notification settings
  useEffect(() => {
    if (!hasUserInteractedRef.current) return
    const settings = {
      enabled: notificationsEnabled,
      frequency: notificationFrequency,
      checkWindow: notificationFrequency === 'realtime' ? 900 : notificationFrequency === 'hourly' ? 3600 : 86400
    }
    localStorage.setItem('notificationSettings', JSON.stringify(settings))
    toast.success('Settings saved')
  }, [notificationsEnabled, notificationFrequency])

  // Handle section change
  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section)
    window.history.replaceState(null, '', `#${section}`)
    track('Settings: Navigate Section', { section })
  }

  // Refresh handler
  const handleRefresh = async () => {
    if (!hasRealData) {
      toast.error("Connect your Slack workspace first")
      return
    }

    const extensionToken = localStorage.getItem("extensionToken")
    const extensionCookie = localStorage.getItem("extensionCookie")
    const workspace = localStorage.getItem("workspace")
    const lastCurl = localStorage.getItem("slackCurlCommand")

    let curlCommand = lastCurl

    if (extensionToken && extensionCookie && workspace) {
      const timestamp = Math.floor(Date.now() / 1000)
      curlCommand = `curl 'https://${workspace}.slack.com/api/emoji.adminList?_x_id=generated-${timestamp}' -H 'accept: */*' -b '${extensionCookie}' --data-raw 'token=${extensionToken}&count=20000'`
    }

    if (!curlCommand?.trim()) {
      toast.error("No Slack connection found")
      return
    }

    setRefreshing(true)
    try {
      const parsed = parseSlackCurl(curlCommand)
      if (!parsed.isValid) {
        toast.error(parsed.error || "Invalid connection")
        return
      }

      const { token, cookie, workspace: ws, url } = parsed
      const formData: Record<string, string> = {}
      if (token) formData.token = token
      formData.count = "20000"

      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      if (!response.ok) throw new Error(await response.text())

      const data = await response.json()
      let emojiArray = data.emojis || data.emoji || []

      if (data.slackResponse?.emoji) {
        const emojiObj = data.slackResponse.emoji
        if (typeof emojiObj === "object" && !Array.isArray(emojiObj)) {
          emojiArray = Object.entries(emojiObj).map(([name, url]) => ({
            name, url, is_alias: 0, user_id: "", created: Math.floor(Date.now() / 1000), user_display_name: "",
          }))
        } else if (Array.isArray(emojiObj)) {
          emojiArray = emojiObj
        }
      }

      const processedData = emojiArray.map((emoji: any) => ({
        name: emoji.name,
        url: emoji.url,
        team_id: emoji.team_id || "",
        user_id: emoji.user_id || "",
        created: emoji.created > 0 ? emoji.created : Math.floor(Date.now() / 1000),
        is_alias: emoji.is_alias || 0,
        alias_for: emoji.alias_for || "",
        user_display_name: emoji.user_display_name || "",
      })).sort((a: any, b: any) => b.created - a.created)

      if (processedData.length > 0) {
        setEmojiData(processedData)
        setWorkspace(ws || "slack-workspace")
        setHasRealData(true)
        safePersistEmojiDataToLocalStorage(processedData, { source: "settings-page" })
        localStorage.setItem("workspace", ws || "")
        localStorage.setItem("emojiCount", processedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        window.dispatchEvent(new CustomEvent("emojiDataUpdated"))
        toast.success(`Refreshed ${processedData.length} emojis`)
      } else {
        toast.error("No emoji data returned")
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"
      toast.error(msg.includes("invalid_auth") ? "Token expired. Please reconnect." : msg)
    } finally {
      setRefreshing(false)
    }
  }

  const sections = [
    { id: 'connection' as const, label: 'Connection', icon: Link2 },
    { id: 'preferences' as const, label: 'Preferences', icon: Bell },
    { id: 'data' as const, label: 'Data', icon: Database },
    { id: 'about' as const, label: 'About', icon: MessageSquare },
  ]

  return (
    <div className="flex flex-col min-h-0 py-4">
      <ChromeExtensionHandler />

      <div className="px-4 lg:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your workspace and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Navigation */}
          <nav className="lg:w-48 flex-shrink-0">
            <div className={cn(
              "flex gap-1",
              isMobile ? "overflow-x-auto pb-2 -mx-4 px-4" : "flex-col"
            )}>
              {sections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {section.label}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 max-w-2xl space-y-6">
            {/* Connection Section */}
            {activeSection === 'connection' && (
              <div className="space-y-4 animate-in fade-in-0 duration-200">
                {/* Status Card */}
                <Card className={hasSlack ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "rounded-full p-2",
                        hasSlack ? "bg-green-500/20" : "bg-amber-500/20"
                      )}>
                        {hasSlack ? (
                          <Zap className="h-5 w-5 text-green-500" />
                        ) : (
                          <Link2 className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {hasSlack ? "Connected" : "Not Connected"}
                          </span>
                          {hasSlack && (
                            <Badge variant="secondary" className="text-xs">
                              {localStorage.getItem("workspace") || "Workspace"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {hasSlack ? "Your Slack workspace is synced" : "Connect to import emojis"}
                        </p>
                      </div>
                      {hasSlack && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRefresh}
                          disabled={refreshing}
                        >
                          <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
                          Sync
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Connection Options */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Connect Workspace</CardTitle>
                    <CardDescription>Choose a method to connect your Slack workspace</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Chrome Extension */}
                    <a
                      href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <ChromeIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Chrome Extension</span>
                          <Badge variant="secondary" className="text-xs">Recommended</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">One-click setup in your browser</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* Pair to Mobile (shown on desktop) / Pair from Desktop (shown on mobile) */}
                    {isMobile ? (
                      <PairToMobile />
                    ) : (
                      <PairToMobile />
                    )}

                    {/* Manual Setup */}
                    <button
                      onClick={() => setShowManualSetup(!showManualSetup)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors w-full text-left"
                    >
                      <div className="rounded-lg bg-muted p-2">
                        <Terminal className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-sm">Manual Setup</span>
                        <p className="text-xs text-muted-foreground">Use a cURL command from DevTools</p>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        showManualSetup && "rotate-90"
                      )} />
                    </button>

                    {showManualSetup && (
                      <div className="pl-4 pt-2">
                        <SlackCurlInput />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="space-y-4 animate-in fade-in-0 duration-200">
                {/* Appearance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Appearance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SettingRow label="Theme" description="Choose your color scheme">
                      <ThemeSelector />
                    </SettingRow>
                  </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Notifications</CardTitle>
                    <CardDescription>Get alerts when new emojis are added</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-0 divide-y">
                    <SettingRow label="Enable notifications" description="Browser notifications for new emojis">
                      <Switch
                        checked={notificationsEnabled}
                        onCheckedChange={async (checked) => {
                          if (checked && permissionStatus !== 'granted') {
                            const permission = await Notification.requestPermission()
                            setPermissionStatus(permission)
                            if (permission !== 'granted') {
                              toast.error('Notifications blocked by browser')
                              return
                            }
                          }
                          hasUserInteractedRef.current = true
                          setNotificationsEnabled(checked)
                        }}
                      />
                    </SettingRow>

                    {notificationsEnabled && (
                      <SettingRow label="Check frequency" description="How often to check for new emojis">
                        <Select
                          value={notificationFrequency}
                          onValueChange={(v) => {
                            hasUserInteractedRef.current = true
                            setNotificationFrequency(v)
                          }}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="realtime">15 min</SelectItem>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                          </SelectContent>
                        </Select>
                      </SettingRow>
                    )}

                    {!hasExtension && notificationsEnabled && (
                      <div className="py-3">
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Install the Chrome extension for background notifications
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Leaderboard */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Leaderboard</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SettingRow
                      label="Inactive threshold"
                      description="Hide users inactive for this many months"
                    >
                      <Input
                        type="number"
                        value={inactivityThresholdMonths}
                        onChange={(e) => setInactivityThresholdMonths(parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-20 h-8"
                      />
                    </SettingRow>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Data Section */}
            {activeSection === 'data' && (
              <div className="space-y-4 animate-in fade-in-0 duration-200">
                <FetchStatsDisplay />

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Clear Data</CardTitle>
                    <CardDescription>Remove all cached data and settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 mb-4">
                      <p className="text-xs text-destructive">
                        This will remove all cached emojis, workspace data, and preferences. You'll need to reconnect to Slack.
                      </p>
                    </div>
                    <ClearLocalStorageButton />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* About Section */}
            {activeSection === 'about' && (
              <div className="space-y-4 animate-in fade-in-0 duration-200">
                {/* App Info */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <img src="/logo-192.png" alt="Emoji Studio" className="h-12 w-12 rounded-xl" />
                      <div>
                        <h3 className="font-semibold">Emoji Studio</h3>
                        <p className="text-xs text-muted-foreground">Manage your Slack emojis</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardContent className="p-0 divide-y">
                    <button
                      onClick={() => setFeedbackModalOpen(true)}
                      className="flex items-center gap-3 p-4 w-full hover:bg-muted/50 transition-colors"
                    >
                      <MessageSquare className="h-5 w-5 text-blue-500" />
                      <div className="flex-1 text-left">
                        <span className="font-medium text-sm">Send Feedback</span>
                        <p className="text-xs text-muted-foreground">Report bugs or request features</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>

                    <a
                      href="https://github.com/jweingardt12/Emoji-Studio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <Github className="h-5 w-5" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">View on GitHub</span>
                        <p className="text-xs text-muted-foreground">Star, contribute, or report issues</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>

                    <a
                      href="https://apps.apple.com/us/app/emoji-studio-for-slack/id6751079971"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <Smartphone className="h-5 w-5 text-gray-500" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">iOS App</span>
                        <p className="text-xs text-muted-foreground">Get the native app from App Store</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      <FeedbackModal open={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />
    </div>
  )
}
