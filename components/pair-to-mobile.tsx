"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RainbowButton } from "@/src/components/magicui/rainbow-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle as AlertCircleIcon, Link2 as LinkIcon, QrCode, ExternalLink, Smartphone } from "lucide-react"
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
      
      // Generate QR on desktop when we have a valid curl
      if (valid && isDesktop) {
        // Only generate if we don't have a QR yet
        if (!qrDataUrl) {
          await generateQrSession()
        }
      } else {
        // Clear QR if invalid or on mobile
        setQrDataUrl("")
      }
    }
    load()
    const handler = () => load()
    window.addEventListener("slackCurlUpdated", handler)
    return () => window.removeEventListener("slackCurlUpdated", handler)
  }, [isDesktop]) // Only depend on isDesktop, not qrDataUrl or generating

  const generateQrSession = async () => {
    try {
      setGenerating(true)
      setQrError(null)
      
      // Get the current curl command
      const currentCurl = localStorage.getItem("slackCurlCommand") || ""
      if (!currentCurl) {
        throw new Error("No curl command found")
      }
      
      // Compress the curl command to just essential data
      const compressed = compressCurl(currentCurl)
      console.log('Compressed curl data length:', compressed.length, 'vs original:', currentCurl.length)
      
      // QR code contains ONLY the compressed data
      console.log('QR Code data length:', compressed.length)
      
      // Import qrcode library
      const QRCode = await import("qrcode")
      const dataUrl = await QRCode.toDataURL(compressed, { 
        errorCorrectionLevel: 'M', // Medium error correction for better balance
        margin: 2, 
        width: 400, // Larger size for easier scanning
        version: undefined // Let it auto-select the best version
      })
      setQrDataUrl(dataUrl)
      setQrError(null)
    } catch (e: any) {
      console.error("Failed generating QR code:", e?.message || e)
      setQrError("QR generation failed. Click 'Regenerate QR' to retry.")
      setQrDataUrl("")
    } finally {
      setGenerating(false)
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
        // Handle raw compressed data (new simplified format)
        // Verify it looks like our compressed format (base64-like string)
        if (/^[A-Za-z0-9_-]+$/.test(text)) {
          // Close the scanner immediately
          setScanOpen(false)
          
          // Get the origin for navigation
          const origin = window.location.origin
          
          // Navigate to the pairing page with the compressed data
          window.location.href = `${origin}/pair?data=${encodeURIComponent(text)}`
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
                          onClick={() => generateQrSession()} 
                          disabled={generating}
                        >
                          Retry Generation
                        </Button>
                      </>
                    )}
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
