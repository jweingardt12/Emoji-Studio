"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RainbowButton } from "@/src/components/magicui/rainbow-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle as AlertCircleIcon, Link2 as LinkIcon, QrCode, ExternalLink, Smartphone, Copy } from "lucide-react"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { compressCurl } from "@/lib/utils/compress-curl"
import { toast } from "sonner"
import { QrScanDrawer } from "@/components/qr-scan-drawer"

export function PairToMobile() {
  const [isValidCurl, setIsValidCurl] = useState<boolean>(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [qrError, setQrError] = useState<string | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [copying, setCopying] = useState(false)
  const [compressedCode, setCompressedCode] = useState<string>("")
  const [codeSourceCurl, setCodeSourceCurl] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(true) // Default to true to avoid SSR mismatch

  // Check if we're on desktop/mobile
  useEffect(() => {
    const checkDesktop = () => {
      const matches = window.matchMedia('(min-width: 768px)').matches
      setIsDesktop(matches)
    }
    // Run immediately and set up listener
    checkDesktop()
    
    const mql = window.matchMedia('(min-width: 768px)')
    const handleChange = () => checkDesktop()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const load = async () => {
      const saved = localStorage.getItem("slackCurlCommand") || ""
      const parsed = parseSlackCurl(saved)
      const valid = !!saved && parsed.isValid && !parsed.error
      setIsValidCurl(valid)

      if (!valid || !isDesktop) {
        setQrDataUrl("")
        setCompressedCode("")
        setCodeSourceCurl(null)
        return
      }

      try {
        await generateQrPayload(false, saved)
      } catch (error) {
        console.error("Auto QR generation failed:", (error as Error)?.message || error)
      }
    }

    load()
    const handler = () => load()
    window.addEventListener("slackCurlUpdated", handler)
    return () => window.removeEventListener("slackCurlUpdated", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop])

  const ensureCompressedCode = (currentCurl?: string, forceNew = false) => {
    const storedCurl = currentCurl ?? localStorage.getItem("slackCurlCommand") ?? ""

    if (!storedCurl) {
      throw new Error("No workspace info found")
    }

    if (!forceNew && compressedCode && codeSourceCurl === storedCurl) {
      return compressedCode
    }

    const code = compressCurl(storedCurl)
    setCompressedCode(code)
    setCodeSourceCurl(storedCurl)
    return code
  }

  const generateQrPayload = async (forceNew = false, presetCurl?: string) => {
    try {
      setGenerating(true)
      setQrError(null)

      const code = ensureCompressedCode(presetCurl, forceNew)
      const QRCode = await import("qrcode")
      const dataUrl = await QRCode.toDataURL(code, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 360,
        version: undefined,
      })
      setQrDataUrl(dataUrl)
      setQrError(null)
    } catch (e: any) {
      console.error("Failed generating QR code:", e?.message || e)
      setQrError(e?.message || "QR generation failed. Click 'Regenerate QR' to retry.")
      setQrDataUrl("")
      setCompressedCode("")
      setCodeSourceCurl(null)
    } finally {
      setGenerating(false)
    }
  }

  const copyWorkspaceInfo = async () => {
    if (!("clipboard" in navigator) || typeof navigator.clipboard?.writeText !== "function") {
      toast.error("Clipboard not supported in this browser")
      return
    }

    try {
      setCopying(true)
      const code = ensureCompressedCode()
      await navigator.clipboard.writeText(code)
      toast.success("Workspace payload copied")
    } catch (error: any) {
      console.error("Failed to copy workspace info:", error?.message || error)
      toast.error(error?.message || "Failed to copy workspace info")
    } finally {
      setCopying(false)
    }
  }

  const handleScanDetected = (text: string) => {
    try {
      // First try to parse as URL (for backwards compatibility)
      let isUrl = false
      let url: URL | null = null
      
      try {
        url = new URL(text)
        isUrl = true
      } catch {
        // Not a URL, might be raw compressed data
        isUrl = false
      }
      
      if (isUrl && url) {
        // Handle URL-based QR codes (old format)
        const compressedData = url.searchParams.get("data")
        const encodedCurl = url.searchParams.get("curl")
        const sid = url.searchParams.get("sid")
        
        if (compressedData || encodedCurl || sid) {
          // Close the scanner immediately
          setScanOpen(false)
          // Navigate to the pairing URL which will auto-process
          window.location.href = url.toString()
        } else {
          toast.error("QR does not contain pairing data")
        }
      } else {
        const trimmed = text.trim()

        // Handle session codes (hex encoded, 8-48 chars)
        if (/^[a-fA-F0-9]{8,48}$/.test(trimmed)) {
          setScanOpen(false)
          const origin = window.location.origin
          window.location.href = `${origin}/pair?sid=${encodeURIComponent(trimmed)}`
          return
        }

        // Handle encrypted code (base64-url string)
        if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
          setScanOpen(false)
          const origin = window.location.origin
          window.location.href = `${origin}/pair?data=${encodeURIComponent(trimmed)}`
        } else {
          toast.error("Invalid QR code format")
        }
      }
    } catch (error) {
      console.error("Error processing QR code:", error)
      toast.error("Failed to process QR code")
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="hidden sm:block rounded-lg bg-muted p-3">
            <LinkIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 sm:hidden">
              <div className="rounded-lg bg-muted p-2">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">Pair to Desktop</h3>
            </div>
            <h3 className="font-semibold hidden sm:block">Pair to Mobile</h3>
            
            {/* Desktop description */}
            <p className="text-sm text-muted-foreground hidden md:block">
              Scan this QR with your phone to import your Slack connection.
            </p>
            
            {/* iOS TestFlight link for desktop */}
            <div className="hidden md:block">
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>Have an iPhone or iPad?</strong> Join the Emoji Studio TestFlight beta for the native iOS app experience!
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a href="https://emojistudio.xyz/mobile" target="_blank" rel="noopener noreferrer">
                        Join iOS TestFlight
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile description */}
            <p className="text-sm text-muted-foreground md:hidden">
              Scan the QR displayed on your desktop to import your Slack connection.
            </p>

            {/* Mobile: Always show scanner button */}
            <div className="w-full mt-3 md:hidden">
              <RainbowButton 
                className="w-full" 
                onClick={() => setScanOpen(true)}
                size="lg"
              >
                <QrCode className="mr-2 h-5 w-5" />
                Scan Desktop QR Code
              </RainbowButton>
              <QrScanDrawer open={scanOpen} onOpenChange={setScanOpen} onDetected={handleScanDetected} />
              <Button
                variant="outline"
                size="lg"
                className="mt-3 w-full"
                onClick={copyWorkspaceInfo}
                disabled={copying || !isValidCurl}
              >
                <Copy className="mr-2 h-5 w-5" />
                {copying ? "Copying..." : "Copy Workspace Info to Clipboard"}
              </Button>
              
              {/* iOS TestFlight link */}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Want the native iOS app? Join the TestFlight beta!
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <a href="https://emojistudio.xyz/mobile" target="_blank" rel="noopener noreferrer">
                        Join iOS TestFlight
                        <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Show QR or error based on curl validity */}
            <div className="hidden md:block">
              {isDesktop && (
              <>
                {!isValidCurl && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm">No workspace connected</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      In order to connect to Emoji Studio for mobile, connect to your Slack workspace.
                    </AlertDescription>
                  </Alert>
                )}

                {isValidCurl && (
                  <div className="flex flex-col items-center gap-3 w-full mt-4">
                    {(generating || (!qrDataUrl && !qrError)) && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-80 h-80 rounded border bg-muted animate-pulse flex items-center justify-center">
                          <p className="text-sm text-muted-foreground">Generating QR...</p>
                        </div>
                      </div>
                    )}
                    
                    {qrDataUrl && !generating && (
                      <div className="flex flex-col items-center gap-2">
                        <img src={qrDataUrl} alt="Pairing QR" className="rounded border bg-white p-2" />
                      </div>
                    )}
                    
                    {!qrDataUrl && !generating && qrError && (
                      <>
                        <Alert variant="destructive">
                          <AlertCircleIcon className="h-4 w-4" />
                          <AlertTitle>QR generation failed</AlertTitle>
                          <AlertDescription>{qrError}</AlertDescription>
                        </Alert>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => generateQrPayload(true)} 
                          disabled={generating}
                        >
                          Retry Generation
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyWorkspaceInfo}
                      disabled={copying || !isValidCurl}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copying ? "Copying..." : "Copy Workspace Info to Clipboard"}
                    </Button>
                  </div>
                )}
              </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
