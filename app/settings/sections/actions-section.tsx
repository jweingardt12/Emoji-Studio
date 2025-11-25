"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, MessageSquare, Github, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionsSectionProps {
  refreshing: boolean
  hasRealData: boolean
  onRefresh: () => void
  onFeedbackOpen: () => void
}

export function ActionsSection({
  refreshing,
  hasRealData,
  onRefresh,
  onFeedbackOpen,
}: ActionsSectionProps) {
  return (
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
                  onClick={onRefresh}
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
                  onClick={onFeedbackOpen}
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
  )
}
