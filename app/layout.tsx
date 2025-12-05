import "@/app/globals.css";
import { GeistSans, GeistMono } from "geist/font";
import { ThemeProvider } from "@/components/theme-provider";
import ClientBody from "@/components/client-body";
import { EmojiDataProvider } from "@/lib/hooks/use-emoji-data";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { OpenPanelProvider } from '@/components/openpanel-provider';
import { Toaster } from "@/components/ui/sonner"
import { ThemeTracker } from "@/components/ThemeTracker";
import { GlobalExtensionListener } from "@/components/global-extension-listener";
import { NotificationManager } from "@/components/notification-manager";
import { PWALayoutWrapper } from "@/components/pwa-layout-wrapper";
import { PullToRefreshWrapper } from "@/components/pull-to-refresh-wrapper";
import { MobilePageManager } from "@/components/mobile-page-manager";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Emoji Studio" />
        <meta name="theme-color" content="#1a1a1a" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon-new.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-new.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/pwa-icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/pwa-icon-512.png" />
        <link rel="apple-touch-icon" sizes="1024x1024" href="/pwa-icon-1024.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans bg-background text-foreground animate-fade-up overflow-hidden md:overflow-auto`}>
        <OpenPanelProvider />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientBody>
            <EmojiDataProvider>
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "16rem",
                    "--sidebar-width-icon": "3rem",
                  } as React.CSSProperties
                }
                className="h-screen"
              >
                <div className="hidden md:block">
                  <AppSidebar variant="inset" />
                </div>
                <SidebarInset className="h-screen overflow-hidden flex flex-col md:ml-0 w-full">
                  {/* Header only on desktop */}
                  <div className="hidden md:block">
                    <SiteHeader className="flex-shrink-0" />
                  </div>
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="@container/main flex flex-1 flex-col gap-2 overflow-y-auto mobile-nav-padding md:pb-0 native-scroll no-horizontal-scroll">
                      <PullToRefreshWrapper>
                        <div className="flex flex-col gap-4 p-4 pt-safe md:p-6 lg:px-6">
                          <MobilePageManager>
                            {children}
                          </MobilePageManager>
                        </div>
                      </PullToRefreshWrapper>
                    </div>
                  </div>
                </SidebarInset>
              </SidebarProvider>
              <PWALayoutWrapper>
                <GlobalExtensionListener />
                <NotificationManager />
              </PWALayoutWrapper>
            </EmojiDataProvider>
            <Toaster
              position="bottom-right"
            />
            <ThemeTracker />
          </ClientBody>
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: "Emoji Studio - Slack Emoji Management",
  description: "Emoji Studio is the missing management platform for custom Slack emojis. Create, manage, analyze, and understand your company's emoji culture.",
  generator: "v0.dev",
  applicationName: "Emoji Studio",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Emoji Studio",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    images: ['/assets/screenshots/og-image.png'],
  },
}
