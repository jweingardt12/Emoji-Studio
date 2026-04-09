"use client"

import { useState } from "react"
import Link from "next/link"
import { Zap, Link2, Terminal, ChevronRight, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { SlackCurlInput } from "@/components/slack-curl-input"
import { PairToMobile } from "@/components/pair-to-mobile"
import { toast } from "sonner"
import { useTrack } from "@/lib/hooks/use-track"
import { getWorkspaceDisplayName } from "@/lib/utils/workspace"

interface ConnectionSectionProps {
  hasSlack: boolean
  hasExtension: boolean
  refreshing: boolean
  workspace: string | null
  workspaceDisplayName: string
  setWorkspaceDisplayName: (name: string) => void
  emojiCount: number
  lastSyncDate: string | null
  onRefresh: () => void
  isMobile: boolean
}

export function ConnectionSection({
  hasSlack,
  hasExtension,
  refreshing,
  workspace,
  workspaceDisplayName,
  setWorkspaceDisplayName,
  emojiCount,
  lastSyncDate,
  onRefresh,
  isMobile,
}: ConnectionSectionProps) {
  const [showManualSetup, setShowManualSetup] = useState(false)
  const track = useTrack()

  return (
    <div className="space-y-4">
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
                    {getWorkspaceDisplayName(workspaceDisplayName, workspace)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {hasSlack
                  ? `${emojiCount.toLocaleString()} emojis synced${lastSyncDate ? ` · Last sync: ${lastSyncDate}` : ''}`
                  : "Connect to import emojis"
                }
              </p>
            </div>
            {hasSlack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
                Sync
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workspace Name */}
      {hasSlack && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Workspace Name</CardTitle>
            <CardDescription>Customize how your workspace name appears in share images</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Input
                value={workspaceDisplayName}
                onChange={(e) => setWorkspaceDisplayName(e.target.value)}
                onBlur={() => {
                  if (workspaceDisplayName.trim()) {
                    toast.success('Workspace name updated')
                    track('Settings: Update Workspace Display Name')
                  }
                }}
                placeholder={getWorkspaceDisplayName(null, workspace)}
                className="flex-1"
              />
              {workspaceDisplayName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setWorkspaceDisplayName("")
                    toast.success('Using default workspace name')
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
            {workspace && (
              <p className="text-xs text-muted-foreground mt-2">
                Slack workspace ID: {workspace}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connect Workspace</CardTitle>
          <CardDescription>Choose a method to connect your Slack workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
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

          <PairToMobile />

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
  )
}
