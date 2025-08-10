import "@/app/globals.css";
import { GeistSans, GeistMono } from "geist/font";
import { ThemeProvider } from "@/components/theme-provider";
import ClientBody from "@/components/client-body";
import { EmojiDataProvider } from "@/lib/hooks/use-emoji-data";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { OpenPanelComponent } from '@openpanel/nextjs';
import { Toaster } from "@/components/ui/sonner"
import { ThemeTracker } from "@/components/ThemeTracker";
import { GlobalExtensionListener } from "@/components/global-extension-listener";
import { NotificationManager } from "@/components/notification-manager";
import { PWALayoutWrapper } from "@/components/pwa-layout-wrapper";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans bg-background text-foreground animate-fade-up overflow-hidden`}>
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
              <SidebarProvider
                style={
                  {
                    "--sidebar-width": "16rem",
                    "--sidebar-width-icon": "3rem",
                  } as React.CSSProperties
                }
                className="h-screen"
              >
                <AppSidebar variant="inset" className="hidden md:flex" />
                <SidebarInset className="h-screen overflow-hidden flex flex-col md:ml-0">
                  <SiteHeader className="flex-shrink-0" />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="@container/main flex flex-1 flex-col gap-2 overflow-y-auto mobile-nav-padding md:pb-0">
                      <div className="flex flex-col gap-4 p-4 md:p-6 lg:px-6">
                        {children}
                      </div>
                    </div>
                  </div>
                </SidebarInset>
              </SidebarProvider>
              <PWALayoutWrapper>
                <GlobalExtensionListener />
                <NotificationManager />
              </PWALayoutWrapper>
            </EmojiDataProvider>
            <Toaster />
            <ThemeTracker />
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
