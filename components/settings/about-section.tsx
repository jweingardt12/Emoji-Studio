"use client"

import { MessageSquare, Github, ExternalLink, Smartphone, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface AboutSectionProps {
  onOpenFeedback: () => void
}

export function AboutSection({ onOpenFeedback }: AboutSectionProps) {
  return (
    <div className="space-y-4">
      {/* App Info */}
      <Card size="sm" className="py-2">
        <CardContent className="px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/logo-192.png" alt="Emoji Studio" width={48} height={48} className="h-12 w-12 rounded-xl" />
            <div>
              <h3 className="font-semibold">Emoji Studio</h3>
              <p className="text-xs text-muted-foreground">Manage your Slack emojis</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card size="sm" className="py-0">
        <CardContent className="p-0 divide-y divide-border/50">
          <button
            onClick={onOpenFeedback}
            className="flex items-center gap-3 px-4 py-3 w-full hover:bg-muted/50 transition-colors"
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
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
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
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
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
  )
}
