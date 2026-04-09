"use client"

import Link from "next/link"
import {
  Activity,
  Paintbrush,
  Zap,
  Sparkles,
  Chrome,
  Smartphone,
  Gift,
  BarChart3,
  Shield,
  Accessibility,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface WhatsNewModalProps {
  open: boolean
  onClose: () => void
}

const features = [
  {
    icon: Activity,
    title: "Usage Analytics",
    description:
      "Scan channels to see how your emojis are used as reactions — top emojis, top reactors, channel breakdowns, and shareable stat cards.",
    color: "text-[var(--chart-1)]",
    bg: "bg-chart-1/10",
    ring: "ring-chart-1/15",
  },
  {
    icon: Paintbrush,
    title: "Design System Overhaul",
    description:
      "Tailwind CSS v4, shadcn/ui Luma preset, oklch colors, and Framer Motion spring animations across every page.",
    color: "text-[var(--chart-4)]",
    bg: "bg-chart-4/10",
    ring: "ring-chart-4/15",
  },
  {
    icon: Chrome,
    title: "Chrome Extension v2",
    description:
      "Bulk emoji reactions, emoji info tooltips on hover, rainbow sync button, cart system, and a settings tab.",
    color: "text-[var(--chart-2)]",
    bg: "bg-chart-2/10",
    ring: "ring-chart-2/15",
  },
  {
    icon: Smartphone,
    title: "iOS App",
    description:
      "Native iOS app on the App Store — browse emojis, view Wrapped, and pair via QR code.",
    color: "text-[var(--chart-5)]",
    bg: "bg-chart-5/10",
    ring: "ring-chart-5/15",
  },
  {
    icon: Gift,
    title: "Emoji Wrapped",
    description:
      "Spotify Wrapped-style annual review — 10+ animated slides, interactive quiz, shareable cards.",
    color: "text-[var(--chart-3)]",
    bg: "bg-chart-3/10",
    ring: "ring-chart-3/15",
  },
  {
    icon: BarChart3,
    title: "Dashboard Refresh",
    description:
      "Bento grid layout, animated counters, hero metric card, and leaderboard-first ordering.",
    color: "text-[var(--chart-1)]",
    bg: "bg-chart-1/10",
    ring: "ring-chart-1/15",
  },
  {
    icon: Zap,
    title: "2× Faster",
    description:
      "50–70% faster Visualizations load, 60–80% faster time range changes, 40% less memory.",
    color: "text-[var(--chart-3)]",
    bg: "bg-chart-3/10",
    ring: "ring-chart-3/15",
  },
  {
    icon: Shield,
    title: "Security",
    description:
      "Rate limiting on API routes, URL validation, sanitized error responses, and Next.js security patches.",
    color: "text-[var(--chart-4)]",
    bg: "bg-chart-4/10",
    ring: "ring-chart-4/15",
  },
  {
    icon: Accessibility,
    title: "Accessibility",
    description:
      "WCAG audit — motion preferences, contrast fixes, 44px touch targets, aria-labels, and semantic tokens.",
    color: "text-[var(--chart-2)]",
    bg: "bg-chart-2/10",
    ring: "ring-chart-2/15",
  },
]

export function WhatsNewModal({ open, onClose }: WhatsNewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden rounded-xl max-h-[85vh]">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-linear-to-br from-chart-1/5 via-transparent to-chart-4/5 pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-2.5 mb-1.5">
              <Sparkles className="h-5 w-5 text-[var(--chart-3)]" aria-hidden="true" />
              <DialogTitle className="text-xl font-bold tracking-tight text-balance">
                What's New in 2.0
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-pretty leading-relaxed">
              The biggest update yet — usage analytics, a new design system, Chrome extension overhaul, and the full Emoji Studio ecosystem across web, extension, and iOS.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Feature list */}
        <ScrollArea className="max-h-[50vh]">
          <div className="px-6 py-4 space-y-3.5" role="list" aria-label="New features">
            {features.map(({ icon: Icon, title, description, color, bg, ring }) => (
              <div key={title} className="flex gap-3.5 items-start" role="listitem">
                <div className={`shrink-0 rounded-lg p-2 ring-1 ${bg} ${ring}`}>
                  <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold leading-none">{title}</p>
                  <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Links */}
        <div className="px-6 py-3 border-t flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <a
            href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Chrome className="h-3.5 w-3.5" />
            Chrome Web Store
          </a>
          <span className="text-border">|</span>
          <a
            href="https://apps.apple.com/us/app/emoji-studio-for-slack/id6751079971"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Smartphone className="h-3.5 w-3.5" />
            App Store
          </a>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/reactions" onClick={onClose}>
              Explore Usage
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
