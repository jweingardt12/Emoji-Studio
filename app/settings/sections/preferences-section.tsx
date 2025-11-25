"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ThemeSelector } from "@/components/theme-selector"

interface PreferencesSectionProps {
  inactivityThresholdMonths: number
  onThresholdChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function PreferencesSection({
  inactivityThresholdMonths,
  onThresholdChange,
}: PreferencesSectionProps) {
  return (
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
              onChange={onThresholdChange}
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
  )
}
