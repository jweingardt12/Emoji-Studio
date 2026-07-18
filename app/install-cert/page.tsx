"use client"

import { useEffect, useState } from "react"

export default function InstallCertPage() {
  // Show the visitor's actual dev host instead of a hardcoded LAN IP.
  const [devUrl, setDevUrl] = useState("https://<your-local-ip>:3001")
  useEffect(() => {
    if (window.location.hostname) {
      setDevUrl(`https://${window.location.hostname}:3001`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2 text-foreground">
          📱 Install mkcert Root CA for iOS
        </h1>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <p className="text-amber-600 dark:text-amber-400 text-sm">
            ⚠️ This is the mkcert Root CA certificate for local development only. Only install if you're developing Emoji Studio.
          </p>
        </div>

        <p className="mb-6 text-muted-foreground">
          To use HTTPS on your iOS device, you need to install and trust the development certificate:
        </p>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </span>
              <strong className="text-foreground">Download Root CA Certificate</strong>
            </div>
            <p className="text-sm text-muted-foreground mb-3 ml-10">
              Click the button below to download the mkcert Root CA:
            </p>
            <div className="ml-10">
              <a
                href="/api/cert"
                className="inline-block px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                download
              >
                Download mkcert Root CA
              </a>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </span>
              <strong className="text-foreground">Install Profile</strong>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              After downloading, go to{" "}
              <strong>Settings → General → VPN &amp; Device Management</strong>
            </p>
            <p className="text-sm text-muted-foreground ml-10 mt-2">
              You'll see a downloaded profile. Tap it and install it.
            </p>
          </div>

          <div className="bg-red-500/10 rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </span>
              <strong className="text-foreground">Trust Certificate (CRITICAL STEP)</strong>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 font-semibold ml-10">
              ⚠️ This step is often missed but is REQUIRED for HTTPS to work!
            </p>
            <p className="text-sm text-muted-foreground ml-10 mt-2">
              Go to{" "}
              <strong>Settings → General → About → Certificate Trust Settings</strong>
            </p>
            <p className="text-sm text-muted-foreground ml-10 mt-2">
              Toggle ON "Enable full trust" for the <strong>mkcert certificate from your development machine</strong>
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-2">
              <span className="shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                4
              </span>
              <strong className="text-foreground">Access via HTTPS</strong>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              After completing all steps above, restart Safari and access:
            </p>
            <code className="block ml-10 mt-2 bg-muted px-3 py-2 rounded text-sm text-foreground">
              {devUrl}
            </code>
            <p className="text-xs text-muted-foreground ml-10 mt-2">
              Note: You must complete the trust step in Certificate Trust Settings
            </p>
          </div>
        </div>

        <p className="mt-8 text-muted-foreground text-xs">
          Note: This is a self-signed certificate for development only. Never install untrusted certificates from unknown sources.
        </p>
      </div>
    </div>
  )
}
