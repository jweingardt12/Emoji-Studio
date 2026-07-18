import type { Metadata } from "next"
import { WrappedLayoutWrapper } from "@/components/wrapped/wrapped-layout-wrapper"

export const metadata: Metadata = {
  metadataBase: new URL("https://emojistudio.xyz"),
  title: "Emoji Wrapped 2025 - Your Year in Slack Emojis | Emoji Studio",
  description:
    "Discover your Slack workspace's emoji story. See top creators, busiest days, trending emojis, and fun stats from your year in custom emojis. Share your Wrapped with your team!",
  keywords: [
    "Slack emoji",
    "emoji wrapped",
    "Slack analytics",
    "emoji statistics",
    "workspace culture",
    "team emoji",
    "year in review",
    "Slack workspace",
  ],
  openGraph: {
    title: "Emoji Wrapped 2025 - Your Year in Slack Emojis",
    description:
      "Discover your Slack workspace's emoji story. See top creators, busiest days, trending emojis, and fun stats. Share your Wrapped with your team!",
    type: "website",
    url: "https://emojistudio.xyz/wrapped",
    siteName: "Emoji Studio",
    images: [
      {
        url: "/assets/wrapped-og.png",
        width: 1200,
        height: 630,
        alt: "Emoji Wrapped 2025 - Your Year in Slack Emojis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Emoji Wrapped 2025 - Your Year in Slack Emojis",
    description:
      "Discover your Slack workspace's emoji story. See top creators, busiest days, and fun stats!",
    images: ["/assets/wrapped-og.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function WrappedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Wrapped Typography: Clash Display + General Sans from Fontshare.
          Loaded here (not in the root layout) because only /wrapped uses
          these families. The `precedence` prop makes React 19 hoist and
          manage the stylesheet in <head> — no media-swap hack needed. */}
      <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        precedence="default"
        href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@400,500,600,700&display=swap"
      />
      <WrappedLayoutWrapper>{children}</WrappedLayoutWrapper>
    </>
  )
}
