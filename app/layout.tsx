import "@/app/globals.css";
import { GeistSans, GeistMono } from "geist/font";
import { ThemeProvider } from "@/components/theme-provider";
import ClientBody from "@/components/client-body";
import { EmojiDataProvider } from "@/lib/hooks/use-emoji-data";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { DashboardOverlay } from "@/components/dashboard-overlay";
import { OpenPanelComponent } from '@openpanel/nextjs';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans bg-background text-foreground animate-fade-up h-full`}>
        <OpenPanelComponent
          clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!}
          trackScreenViews={true}
          trackAttributes={true}
          trackOutgoingLinks={true}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientBody>
            <EmojiDataProvider>
              <SidebarProvider>
                <AppSidebar variant="inset" />
                <SidebarInset className="p-0 h-screen flex flex-col">
                  <SiteHeader className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" />
                  <div className="flex flex-1 flex-col px-4 pb-4 overflow-y-auto">
                    <div className="@container/main flex flex-1 flex-col gap-2">{children}</div>
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </EmojiDataProvider>
          </ClientBody>
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "Emoji Studio - Analytics for Slack Emojis",
  description: "Emoji Studio is the missing analytics platform for custom Slack emojis. See leaderboards, visualizations, and insights into company culture.",
  generator: "v0.dev",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    images: ['/assets/screenshots/og-image.png'],
  },
}
