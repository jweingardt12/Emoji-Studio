"use client"

import { Info, Shield, Globe, HardDrive, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoDrawerResponsive } from "@/components/info-drawer-responsive"

const SECTIONS = [
  {
    icon: Zap,
    color: "bg-primary/10 text-primary",
    title: "How it works",
    body: (
      <>
        Usage scanning reads message history from the Slack channels you select using the
        Slack <code className="text-xs bg-muted px-1 py-0.5 rounded">conversations.history</code> API.
        It looks at emoji reactions on messages and aggregates them into charts
        and leaderboards &mdash; it does not read or store message content.
      </>
    ),
  },
  {
    icon: Shield,
    color: "bg-green-500/10 text-green-500",
    title: "Your credentials",
    body: (
      <>
        Authentication uses the same Slack session you set up in Settings.
        Your token is stored only in your browser&apos;s local storage and is never
        sent to any third-party server. API calls are proxied through a
        server-side route that <strong>only</strong> allows
        {" "}<code className="text-xs bg-muted px-1 py-0.5 rounded">conversations.list</code> and
        {" "}<code className="text-xs bg-muted px-1 py-0.5 rounded">conversations.history</code> &mdash;
        no other Slack endpoints are reachable.
      </>
    ),
  },
  {
    icon: HardDrive,
    color: "bg-blue-500/10 text-blue-500",
    title: "Data storage",
    body: (
      <>
        All reaction data is processed entirely in your browser. Scan results are
        cached locally so you don&apos;t have to re-scan every time. Nothing is uploaded
        to any external server or database &mdash; your data stays on your device.
      </>
    ),
  },
  {
    icon: Globe,
    color: "bg-orange-500/10 text-orange-500",
    title: "Rate limiting",
    body: (
      <>
        Scans are rate-limited to avoid hitting Slack&apos;s API limits. Each channel
        is scanned sequentially with a delay between requests. Larger channels or
        longer date ranges will take more time.
      </>
    ),
  },
]

export function HowItWorksModal() {
  return (
    <InfoDrawerResponsive
      trigger={
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Info className="h-4 w-4" />
          <span className="sr-only">How this works</span>
        </Button>
      }
      title="How Usage Scanning Works"
      description="Understand how Emoji Studio scans your Slack workspace and keeps your data secure."
    >
      <div className="space-y-6 text-sm">
        {SECTIONS.map((section) => (
          <div key={section.title} className="flex gap-3">
            <div className={`rounded-lg p-2 h-fit shrink-0 ${section.color}`}>
              <section.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">{section.title}</p>
              <p className="text-muted-foreground mt-1">{section.body}</p>
            </div>
          </div>
        ))}
      </div>
    </InfoDrawerResponsive>
  )
}
