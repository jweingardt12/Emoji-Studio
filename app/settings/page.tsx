"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Link2, Bell, Database, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useTrack } from "@/lib/hooks/use-track"
import { useIsMobile } from "@/hooks/use-mobile"
import { NOTIFICATION_SETTINGS_CHANGED_EVENT } from "@/hooks/use-emoji-notifications"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { FeedbackModal } from "@/components/feedback-modal"
import { staggerContainer, fadeUp } from "@/lib/motion"

import { ConnectionSection } from "@/components/settings/connection-section"
import { PreferencesSection } from "@/components/settings/preferences-section"
import { DataSection } from "@/components/settings/data-section"
import { AboutSection } from "@/components/settings/about-section"

const sections = [
  { id: "connection", label: "Connection", icon: Link2 },
  { id: "preferences", label: "Preferences", icon: Bell },
  { id: "data", label: "Data", icon: Database },
  { id: "about", label: "About", icon: MessageSquare },
] as const

export default function SettingsPage() {
  const isMobile = useIsMobile()
  const track = useTrack()

  // Connection state
  const [hasSlack, setHasSlack] = useState(false)
  const [hasExtension, setHasExtension] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Notification state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationFrequency, setNotificationFrequency] = useState("daily")
  const [permissionStatus, setPermissionStatus] = useState<"granted" | "denied" | "default" | null>(null)
  const hasUserInteractedRef = useRef(false)

  // Preferences
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState(3)
  const hasMountedRef = useRef(false)

  // Modal
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)

  // Sticky nav active section
  const [activeSection, setActiveSection] = useState("connection")
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const { emojiData, hasRealData, setEmojiData, setWorkspace, setHasRealData, workspace, workspaceDisplayName, setWorkspaceDisplayName } = useEmojiData()

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return

    setHasSlack(hasSlackConnection())

    const storedThreshold = localStorage.getItem("inactivityThresholdMonths")
    if (storedThreshold) setInactivityThresholdMonths(parseInt(storedThreshold, 10))

    const storedNotifications = localStorage.getItem("notificationSettings")
    if (storedNotifications) {
      try {
        const settings = JSON.parse(storedNotifications)
        setNotificationsEnabled(settings.enabled || false)
        setNotificationFrequency(settings.frequency || "daily")
      } catch {}
    }

    if ("Notification" in window) {
      setPermissionStatus(Notification.permission)
    }

    // Check for extension
    if (sessionStorage.getItem("emojiStudioExtensionDetected") === "true") {
      setHasExtension(true)
    } else {
      const checkExtension = () => {
        if ((window as any).__EMOJI_STUDIO_EXTENSION__ || (window as any).chrome?.runtime?.id) {
          sessionStorage.setItem("emojiStudioExtensionDetected", "true")
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

  // Last sync date
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null)
  useEffect(() => {
    const ts = localStorage.getItem("lastFetchTime")
    if (ts) setLastSyncDate(new Date(ts).toLocaleDateString())
  }, [hasSlack])

  // Listen for data updates
  useEffect(() => {
    const handleUpdate = () => setHasSlack(hasSlackConnection())
    window.addEventListener("emojiDataUpdated", handleUpdate)
    return () => window.removeEventListener("emojiDataUpdated", handleUpdate)
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
      checkWindow: notificationFrequency === "realtime" ? 900 : notificationFrequency === "hourly" ? 3600 : 86400,
    }
    localStorage.setItem("notificationSettings", JSON.stringify(settings))
    // Let the notification poller pick up the change without a reload
    window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_CHANGED_EVENT))
    // Stable id so rapid toggling updates one toast instead of stacking them
    toast.success("Settings saved", { id: "notification-settings-saved" })
  }, [notificationsEnabled, notificationFrequency])

  // Single IntersectionObserver for sticky nav highlighting
  // Uses a short delay to ensure refs are attached after Framer Motion mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id)
            }
          }
        },
        { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
      )

      sections.forEach(({ id }) => {
        const el = sectionRefs.current[id]
        if (el) observer.observe(el)
      })

      return () => observer.disconnect()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!hasRealData) {
      toast.error("Connect your Slack workspace first")
      return
    }

    const extensionToken = localStorage.getItem("extensionToken")
    const extensionCookie = localStorage.getItem("extensionCookie")
    const ws = localStorage.getItem("workspace")
    const lastCurl = localStorage.getItem("slackCurlCommand")

    let curlCommand = lastCurl

    if (extensionToken && extensionCookie && ws) {
      const timestamp = Math.floor(Date.now() / 1000)
      curlCommand = `curl 'https://${ws}.slack.com/api/emoji.adminList?_x_id=generated-${timestamp}' -H 'accept: */*' -b '${extensionCookie}' --data-raw 'token=${extensionToken}&count=20000'`
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

      const { token, cookie, workspace: parsedWs, url } = parsed
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

      const processedData = emojiArray
        .map((emoji: any) => ({
          name: emoji.name,
          url: emoji.url,
          team_id: emoji.team_id || "",
          user_id: emoji.user_id || "",
          created: emoji.created > 0 ? emoji.created : Math.floor(Date.now() / 1000),
          is_alias: emoji.is_alias || 0,
          alias_for: emoji.alias_for || "",
          user_display_name: emoji.user_display_name || "",
        }))
        .sort((a: any, b: any) => b.created - a.created)

      if (processedData.length > 0) {
        setEmojiData(processedData)
        setWorkspace(parsedWs || "slack-workspace")
        setHasRealData(true)
        safePersistEmojiDataToLocalStorage(processedData, { source: "settings-page" })
        localStorage.setItem("workspace", parsedWs || "")
        localStorage.setItem("emojiCount", processedData.length.toString())
        localStorage.setItem("lastFetchTime", new Date().toISOString())
        window.dispatchEvent(
          new CustomEvent("emojiDataUpdated", {
            detail: { emojiData: processedData, workspace: parsedWs || "slack-workspace", timestamp: Date.now() },
          })
        )
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
  }, [hasRealData, setEmojiData, setWorkspace, setHasRealData])

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el
  }, [])

  return (
    <div className="flex flex-col min-h-0 py-4">
      <ChromeExtensionHandler />

      <div className="max-w-2xl mx-auto w-full px-4 lg:px-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your workspace and preferences</p>
        </div>

        {/* Sticky mini-nav */}
        <nav className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border -mx-4 px-4 py-2.5 mb-6">
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault()
                  sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" })
                  track("Settings: Navigate Section", { section: id })
                }}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-150",
                  activeSection === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </a>
            ))}
          </div>
        </nav>

        {/* All sections, staggered entrance */}
        <motion.div
          variants={staggerContainer()}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          {/* Connection */}
          <motion.section
            variants={fadeUp}
            id="connection"
            ref={setSectionRef("connection")}
            className="scroll-mt-20"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Link2 className="h-4.5 w-4.5 text-muted-foreground" />
              Connection
            </h2>
            <ConnectionSection
              hasSlack={hasSlack}
              hasExtension={hasExtension}
              refreshing={refreshing}
              workspace={workspace}
              workspaceDisplayName={workspaceDisplayName}
              setWorkspaceDisplayName={setWorkspaceDisplayName}
              emojiCount={emojiData.length}
              lastSyncDate={lastSyncDate}
              onRefresh={handleRefresh}
              isMobile={isMobile}
            />
          </motion.section>

          {/* Preferences */}
          <motion.section
            variants={fadeUp}
            id="preferences"
            ref={setSectionRef("preferences")}
            className="scroll-mt-20"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-muted-foreground" />
              Preferences
            </h2>
            <PreferencesSection
              notificationsEnabled={notificationsEnabled}
              setNotificationsEnabled={setNotificationsEnabled}
              notificationFrequency={notificationFrequency}
              setNotificationFrequency={setNotificationFrequency}
              permissionStatus={permissionStatus}
              setPermissionStatus={setPermissionStatus}
              hasExtension={hasExtension}
              inactivityThresholdMonths={inactivityThresholdMonths}
              setInactivityThresholdMonths={setInactivityThresholdMonths}
              hasUserInteractedRef={hasUserInteractedRef}
            />
          </motion.section>

          {/* Data */}
          <motion.section
            variants={fadeUp}
            id="data"
            ref={setSectionRef("data")}
            className="scroll-mt-20"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Database className="h-4.5 w-4.5 text-muted-foreground" />
              Data
            </h2>
            <DataSection />
          </motion.section>

          {/* About */}
          <motion.section
            variants={fadeUp}
            id="about"
            ref={setSectionRef("about")}
            className="scroll-mt-20"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-4.5 w-4.5 text-muted-foreground" />
              About
            </h2>
            <AboutSection onOpenFeedback={() => setFeedbackModalOpen(true)} />
          </motion.section>
        </motion.div>
      </div>

      <FeedbackModal open={feedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />
    </div>
  )
}
