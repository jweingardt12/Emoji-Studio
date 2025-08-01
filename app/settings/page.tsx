"use client"

import { SlackCurlInput } from "@/components/slack-curl-input"
import { ChromeExtensionOption } from "@/components/chrome-extension-option"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsIcon, Zap, ChevronDown, ChevronUp, Terminal, Sparkles } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { openpanel } from "@/lib/safe-openpanel"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import Marquee from "@/components/ui/marquee"
import { cn } from "@/lib/utils"

// Sample emoji tiles for the background
const emojiTiles = [
  { name: "party", src: "🎉" },
  { name: "fire", src: "🔥" },
  { name: "rocket", src: "🚀" },
  { name: "heart", src: "❤️" },
  { name: "star", src: "⭐" },
  { name: "smile", src: "😊" },
  { name: "laugh", src: "😂" },
  { name: "cool", src: "😎" },
  { name: "thinking", src: "🤔" },
  { name: "celebrate", src: "🎊" },
  { name: "rainbow", src: "🌈" },
  { name: "pizza", src: "🍕" },
  { name: "coffee", src: "☕" },
  { name: "thumbsup", src: "👍" },
  { name: "clap", src: "👏" },
  { name: "muscle", src: "💪" },
  { name: "sparkles", src: "✨" },
  { name: "money", src: "💰" },
  { name: "gift", src: "🎁" },
  { name: "trophy", src: "🏆" },
];

const EmojiCard = ({ emoji }: { emoji: { name: string; src: string } }) => {
  return (
    <div
      className={cn(
        "relative size-16 cursor-pointer overflow-hidden rounded-xl border p-3",
        "bg-white/40 backdrop-blur-[1px] [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-white/10 dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <span className="text-2xl">{emoji.src}</span>
    </div>
  );
};

export default function SettingsPage() {
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem("inactivityThresholdMonths")
      return storedValue ? parseInt(storedValue, 10) : 3 // Default to 3 months
    }
    return 3 // Default for SSR
  })
  
  const [isManualSetupOpen, setIsManualSetupOpen] = useState(false)
  const [hasSlack, setHasSlack] = useState(false)

  const hasMountedRef = useRef(false);
  const previousThresholdRef = useRef(inactivityThresholdMonths);
  
  // Check for Slack connection
  useEffect(() => {
    setHasSlack(hasSlackConnection())
    
    // Listen for emoji data updates to refresh connection status
    const handleEmojiDataUpdate = () => {
      setHasSlack(hasSlackConnection())
    }
    
    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdate)
    
    return () => {
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdate)
    }
  }, [])
  
  // Initialize the extension listener on the settings page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // The ChromeExtensionOption component handles this, but we want to ensure
      // the listener is always active when on settings page
      console.log('[SettingsPage] Ensuring extension listener is active');
    }
  }, []);

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
            {!hasSlack ? (
              <>
                {/* Chrome Extension Hero Section - Shown when not connected */}
                <div className="relative overflow-hidden rounded-xl">
                  {/* Scrolling emoji background */}
                  <div className="absolute inset-0 flex w-full flex-col items-center justify-center overflow-hidden">
                    <Marquee
                      pauseOnHover
                      className="[--duration:20s]"
                      repeat={3}
                    >
                      {emojiTiles.slice(0, 10).map((emoji, idx) => (
                        <EmojiCard key={idx} emoji={emoji} />
                      ))}
                    </Marquee>
                    <Marquee
                      reverse
                      pauseOnHover
                      className="[--duration:30s]"
                      repeat={3}
                    >
                      {emojiTiles.slice(10, 20).map((emoji, idx) => (
                        <EmojiCard key={idx} emoji={emoji} />
                      ))}
                    </Marquee>
                    <Marquee
                      pauseOnHover
                      className="[--duration:25s]"
                      repeat={3}
                    >
                      {emojiTiles.slice(0, 10).map((emoji, idx) => (
                        <EmojiCard key={idx} emoji={emoji} />
                      ))}
                    </Marquee>
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="relative px-6 py-16 sm:px-10 sm:py-24 lg:py-32 backdrop-blur-[2px]">
                    <div className="mx-auto max-w-2xl text-center">
                      <div className="mb-6 inline-flex items-center rounded-full bg-blue-500/10 backdrop-blur-sm px-3 py-1 text-sm">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium text-blue-600 dark:text-blue-400">Recommended!</span>
                      </div>
                      
                      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        Connect Your Slack Workspace
                      </h2>
                      
                      <p className="mx-auto max-w-xl text-lg text-muted-foreground mb-8">
                        Get the Chrome extension for one-click authentication. Import, manage, and analyze all your Slack emojis instantly.
                      </p>
                      
                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                          size="lg"
                          className="min-w-[200px] shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90"
                          asChild
                        >
                          <a 
                            href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2"
                          >
                            <ChromeIcon className="h-5 w-5 text-blue-500" />
                            Get Chrome Extension
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Setup - Collapsible Alternative */}
                <Card className="border-muted/50">
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
              </>
            ) : (
              <>
                {/* When connected, show the regular connection options */}
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Slack Workspace Connection
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your Slack workspace is connected. You can update your connection or use manual setup.
                    </p>
                  </div>
                  
                  <ChromeExtensionOption />
                </div>

                {/* Manual Setup - Always visible when connected */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      Manual Setup
                    </CardTitle>
                    <CardDescription>
                      Alternative method using browser developer tools
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SlackCurlInput />
                  </CardContent>
                </Card>
              </>
            )}

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
