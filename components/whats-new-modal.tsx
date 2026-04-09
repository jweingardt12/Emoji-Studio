"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Activity, Paintbrush, Zap, Sparkles } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const STORAGE_KEY = "dismissed-whats-new-2.0"

const features = [
  {
    icon: Activity,
    title: "Usage Analytics",
    description: "Scan channels to see how your emojis are used as reactions\u2009\u2014\u2009top emojis, top reactors, channel breakdowns.",
    color: "text-[hsl(var(--chart-1))]",
    bg: "bg-[hsl(var(--chart-1)/0.1)]",
    ring: "ring-[hsl(var(--chart-1)/0.15)]",
  },
  {
    icon: Paintbrush,
    title: "Refreshed UI",
    description: "Every page redesigned for a cleaner, more polished experience with better dark mode and accessibility.",
    color: "text-[hsl(var(--chart-4))]",
    bg: "bg-[hsl(var(--chart-4)/0.1)]",
    ring: "ring-[hsl(var(--chart-4)/0.15)]",
  },
  {
    icon: Zap,
    title: "2\u00d7 Faster",
    description: "Visualizations load in half the time with lower memory usage and optimized rendering.",
    color: "text-[hsl(var(--chart-3))]",
    bg: "bg-[hsl(var(--chart-3)/0.1)]",
    ring: "ring-[hsl(var(--chart-3)/0.15)]",
  },
]

export function WhatsNewModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so the modal feels intentional, not jarring
        const timer = setTimeout(() => setOpen(true), 600)
        return () => clearTimeout(timer)
      }
    } catch {}
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {}
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) dismiss() }}>
      <DialogContent className="sm:max-w-[420px] gap-0 p-0 overflow-hidden rounded-xl">
        {/* Header with accent gradient */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--chart-1)/0.06)] via-transparent to-[hsl(var(--chart-4)/0.06)] pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-2.5 mb-1.5">
              <Sparkles className="h-5 w-5 text-[hsl(var(--chart-3))]" aria-hidden="true" />
              <DialogTitle className="text-xl font-bold tracking-tight text-balance">
                What's New in 2.0
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm text-pretty leading-relaxed">
              A major update with new features, a refreshed look, and faster performance.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Feature list */}
        <div className="px-6 py-5 space-y-4" role="list" aria-label="New features">
          {features.map(({ icon: Icon, title, description, color, bg, ring }) => (
            <div key={title} className="flex gap-3.5 items-start" role="listitem">
              <div className={`flex-shrink-0 rounded-lg p-2 ring-1 ${bg} ${ring}`}>
                <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold leading-none">{title}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground text-pretty">{description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 sm:justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/reactions" onClick={dismiss}>
              Explore Usage
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
