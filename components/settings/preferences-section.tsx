"use client"

import { useEffect, useState } from "react"
import { Sun, Moon, Monitor } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
            "flex items-center justify-center w-9 h-9 rounded-lg transition-[color,background-color] duration-150",
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
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground pt-1 pb-0">
      {children}
    </p>
  )
}

interface PreferencesSectionProps {
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void
  notificationFrequency: string
  setNotificationFrequency: (freq: string) => void
  permissionStatus: 'granted' | 'denied' | 'default' | null
  setPermissionStatus: (status: 'granted' | 'denied' | 'default' | null) => void
  hasExtension: boolean
  inactivityThresholdMonths: number
  setInactivityThresholdMonths: (months: number) => void
  hasUserInteractedRef: React.MutableRefObject<boolean>
}

export function PreferencesSection({
  notificationsEnabled,
  setNotificationsEnabled,
  notificationFrequency,
  setNotificationFrequency,
  permissionStatus,
  setPermissionStatus,
  hasExtension,
  inactivityThresholdMonths,
  setInactivityThresholdMonths,
  hasUserInteractedRef,
}: PreferencesSectionProps) {
  return (
    <Card size="sm" className="py-3">
      <CardContent className="p-0 divide-y divide-border/50">
        {/* Appearance */}
        <div className="px-5 py-1">
          <SettingRow label="Theme" description="Choose your color scheme">
            <ThemeSelector />
          </SettingRow>
        </div>

        {/* Notifications */}
        <div className="px-5 py-1">
          <SectionLabel>Notifications</SectionLabel>
          <SettingRow label="Enable notifications" description="Browser notifications for new emojis">
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={async (checked) => {
                if (checked && permissionStatus !== 'granted') {
                  const permission = await Notification.requestPermission()
                  setPermissionStatus(permission)
                  if (permission !== 'granted') return
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
            <p className="text-xs text-amber-600 dark:text-amber-400 pb-2">
              Install the Chrome extension for background notifications
            </p>
          )}
        </div>

        {/* Leaderboard */}
        <div className="px-5 py-1">
          <SectionLabel>Leaderboard</SectionLabel>
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
        </div>
      </CardContent>
    </Card>
  )
}
