"use client"

import { SlackCurlInput } from "@/components/slack-curl-input"
import { ChromeExtensionOption } from "@/components/chrome-extension-option"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsIcon, Zap, ChevronDown, ChevronUp, Terminal } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { openpanel } from "@/lib/safe-openpanel"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"

export default function SettingsPage() {
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem("inactivityThresholdMonths")
      return storedValue ? parseInt(storedValue, 10) : 3 // Default to 3 months
    }
    return 3 // Default for SSR
  })
  
  const [isManualSetupOpen, setIsManualSetupOpen] = useState(false)

  const hasMountedRef = useRef(false);
  const previousThresholdRef = useRef(inactivityThresholdMonths);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("inactivityThresholdMonths", inactivityThresholdMonths.toString());

      if (hasMountedRef.current) {
        // Only show toast if the value has actually changed since the last effect run
        if (previousThresholdRef.current !== inactivityThresholdMonths) {
          toast.success("Inactive user threshold saved!");
          openpanel.track("Settings: Change Inactivity Threshold", { months: inactivityThresholdMonths });
        }
      } else {
        // On the very first run (or first part of Strict Mode double call), mark as mounted.
        hasMountedRef.current = true;
      }
      // Update the previous value for the next effect run
      previousThresholdRef.current = inactivityThresholdMonths;
    }
  }, [inactivityThresholdMonths]);

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    if (!isNaN(value) && value >= 0) {
      setInactivityThresholdMonths(value)
    }
  }

  return (
    <div className="flex flex-col gap-2 py-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6">
      <div className="px-2 sm:px-4 lg:px-6">
        <div className="rounded-xl bg-card border border-border shadow p-2 sm:p-4">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Settings</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Configure your emoji dashboard preferences and data sources.
            </p>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* Chrome Extension - Primary Method */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Connect Your Slack Workspace
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect to your Slack workspace to fetch and manage your custom emojis.
                </p>
              </div>
              
              <ChromeExtensionOption />
            </div>

            {/* Manual Setup - Collapsible Alternative */}
            <Card>
              <CardHeader className="pb-3">
                <Button
                  variant="ghost"
                  onClick={() => setIsManualSetupOpen(!isManualSetupOpen)}
                  className="flex w-full items-center justify-between p-0 text-left hover:bg-transparent"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-sm font-medium">Manual Setup (Advanced)</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Use browser developer tools to manually copy authentication data
                      </CardDescription>
                    </div>
                  </div>
                  {isManualSetupOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </CardHeader>
              <Collapsible open={isManualSetupOpen}>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <SlackCurlInput />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Leaderboard Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leaderboard Settings</CardTitle>
                <CardDescription>
                  Configure settings related to the emoji leaderboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
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
            
            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
            </div>
            
            {/* Data Management Grid */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Fetch Statistics */}
              <FetchStatsDisplay />
              
              {/* Storage Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Storage Management</CardTitle>
                  <CardDescription>
                    Clear all locally stored data including emoji information and settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 sm:p-4 border rounded-lg bg-muted/50">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        This action will remove all cached emoji data, workspace information, 
                        and stored preferences. You'll need to reconnect to Slack to restore data.
                      </p>
                    </div>
                    <ClearLocalStorageButton />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
