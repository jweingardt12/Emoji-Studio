"use client"

import { Info, Shield, Globe, HardDrive, Zap, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoDrawerResponsive } from "@/components/info-drawer-responsive"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

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

const INCLUDED = [
  "Emoji reactions on messages in selected channels",
  "Reaction counts, trends, and leaderboards",
  "Channel-by-channel breakdown of emoji usage",
  "Who reacts the most and with which emojis",
  "Which custom emojis get the most reactions",
]

const NOT_INCLUDED = [
  "Message text, attachments, or file content",
  "Direct messages or group DMs",
  "Private channels you haven\u2019t selected",
  "Who sent the original messages",
  "Emoji used inline in message text (only reactions)",
]

const FAQ = [
  {
    question: "Why are my reaction counts different from what I see in Slack?",
    answer:
      "Emoji Studio counts reactions across all scanned messages in your selected channels and date range. Slack\u2019s own counts may differ because they include reactions from channels you didn\u2019t scan, or because messages were edited or deleted after reactions were added.",
  },
  {
    question: "Can I scan private channels?",
    answer:
      "Yes, as long as your Slack session has access to the private channel. Only channels you are a member of will appear in the channel picker.",
  },
  {
    question: "How far back can I scan?",
    answer:
      "You can scan up to 90 days of history. Longer ranges take more time due to the volume of messages and Slack\u2019s rate limits.",
  },
  {
    question: "Does this work with Slack Enterprise Grid?",
    answer:
      "It works with any Slack workspace where your session token has access. Enterprise Grid organizations with multiple workspaces will need to connect each workspace separately.",
  },
  {
    question: "Will scanning affect my Slack workspace?",
    answer:
      "No. Scanning is read-only \u2014 it only reads message reactions. It does not post messages, modify reactions, or change anything in your workspace.",
  },
]

export function HowItWorksModal() {
  return (
    <InfoDrawerResponsive
      trigger={
        <Button variant="outline" size="sm" className="gap-1.5">
          <Info className="h-3.5 w-3.5" />
          How it works
        </Button>
      }
      title="How Usage Scanning Works"
      description="Understand how Emoji Studio scans your Slack workspace and keeps your data secure."
      className="sm:max-w-6xl!"
    >
      <div className="space-y-8 text-sm">
        {/* How it works sections */}
        <div className="space-y-5">
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

        {/* What's included / not included */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="font-medium text-sm">What&apos;s included</p>
            <ul className="space-y-1.5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-sm">What&apos;s not included</p>
            <ul className="space-y-1.5">
              {NOT_INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <p className="font-medium text-sm mb-2">Frequently asked questions</p>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </InfoDrawerResponsive>
  )
}
