"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Smartphone, Monitor, Check } from "lucide-react"

export function PWASection() {
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold">Install App</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Install Emoji Studio as a mobile or desktop app
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* PWA Install Instructions */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Install on Mobile</h3>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">iOS App:</p>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Download the native Emoji Studio app from the App Store for the best iOS experience.
                        </p>
                        <a
                          href="https://apps.apple.com/us/app/emoji-studio-for-slack/id6751079971?itscg=30200&itsct=apps_box_badge&mttnsubad=6751079971"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          <Smartphone className="h-4 w-4" />
                          View on App Store
                        </a>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Android (Chrome):</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                        <li>Tap the menu button (three dots)</li>
                        <li>Tap "Install app" or "Add to Home Screen"</li>
                        <li>Follow the prompts to install</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Install on Desktop</h3>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Chrome/Edge:</p>
                      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                        <li>Look for the install icon in the address bar</li>
                        <li>Click "Install Emoji Studio"</li>
                        <li>The app will open in its own window</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Features */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">App Features</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-500/10 p-1">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Works Offline</p>
                  <p className="text-xs text-muted-foreground">View cached emojis without internet</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-500/10 p-1">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Persistent Data</p>
                  <p className="text-xs text-muted-foreground">Your data is saved locally and persists across sessions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-500/10 p-1">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Native App Experience</p>
                  <p className="text-xs text-muted-foreground">Full-screen mode with no browser UI</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-500/10 p-1">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Quick Access</p>
                  <p className="text-xs text-muted-foreground">Launch from home screen or app drawer</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
