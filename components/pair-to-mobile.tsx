"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RainbowButton } from "@/src/components/magicui/rainbow-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle as AlertCircleIcon, Link2 as LinkIcon, QrCode } from "lucide-react"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { toast } from "sonner"
import { QrScanDrawer } from "@/components/qr-scan-drawer"

export function PairToMobile() {
  const [curl, setCurl] = useState<string>("")
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
      setCurl(saved)
      const parsed = parseSlackCurl(saved)
      const valid = !!saved && parsed.isValid && !parsed.error
      setIsValidCurl(valid)
      
      // Generate QR on desktop when we have a valid curl
      if (valid && isDesktop && !qrDataUrl && !generating) {
        await generateQrSession()
      } else if (!valid || !isDesktop) {
        setQrDataUrl("")
      }
    }
    load()
    const handler = () => load()
    window.addEventListener("slackCurlUpdated", handler)
    return () => window.removeEventListener("slackCurlUpdated", handler)
  }, [isDesktop, qrDataUrl, generating])

  const generateQrSession = async () => {
    try {
      setGenerating(true)
      setQrError(null)
      
      // Get the current curl command
      const currentCurl = localStorage.getItem("slackCurlCommand") || ""
      if (!currentCurl) {
        throw new Error("No curl command found")
      }
      
      // Encode the curl command directly in the QR code
      // Use base64 encoding to make it URL-safe
      const encodedCurl = btoa(currentCurl)
      
      // Determine the correct origin based on environment
      let origin = ""
      if (typeof window !== "undefined") {
        const currentOrigin = window.location.origin
        const hostname = window.location.hostname
        
        // Check if we're in production (not localhost/127.0.0.1)
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          // Production or already using network IP
          origin = currentOrigin
        } else {
          // Development mode - need to use network IP for QR code
          // First check if there's an environment variable set
          const devIP = process.env.NEXT_PUBLIC_DEV_IP || '192.168.86.71'
          const protocol = window.location.protocol
          const port = window.location.port
          origin = `${protocol}//${devIP}${port ? ':' + port : ''}`
          console.log('Development mode - QR Code URL using network IP:', origin)
        }
      }
      
      // Create URL with the curl command encoded directly
      const url = `${origin}/pair?curl=${encodeURIComponent(encodedCurl)}`
      const { default: QRCode } = await import("qrcode")
      const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 240 })
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
      const url = new URL(text)
      const encodedCurl = url.searchParams.get("curl")
      const sid = url.searchParams.get("sid") // Fallback for old QR codes
      
      if (encodedCurl || sid) {
        // Close the scanner immediately
        setScanOpen(false)
        // Navigate to the pairing URL which will auto-process
        window.location.href = url.toString()
      } else {
        toast.error("QR does not contain pairing data")
      }
    } catch {
      toast.error("Invalid QR content")
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
            </div>

            {/* Desktop: Show QR or error based on curl validity */}
            <div className="hidden md:block">
              {isDesktop && (
              <>
                {!isValidCurl && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm">Missing valid curl</AlertTitle>
                    <AlertDescription className="text-xs mt-1">
                      Paste a valid Slack curl command in Manual Setup above first.
                    </AlertDescription>
                  </Alert>
                )}

                {isValidCurl && (
                  <div className="flex flex-col items-center gap-3 w-full mt-4">
                    {generating && !qrDataUrl && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-60 h-60 rounded border bg-muted animate-pulse flex items-center justify-center">
                          <p className="text-sm text-muted-foreground">Generating QR...</p>
                        </div>
                      </div>
                    )}
                    
                    {qrDataUrl && (
                      <div className="flex flex-col items-center gap-2">
                        <img src={qrDataUrl} alt="Pairing QR" className="rounded border bg-white p-2" />
                        {/* Show development mode notice if on localhost */}
                        {typeof window !== "undefined" && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                          <p className="text-xs text-muted-foreground text-center max-w-xs">
                            Development mode: QR code uses network IP {process.env.NEXT_PUBLIC_DEV_IP || '192.168.86.71'}
                          </p>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => generateQrSession()} 
                          disabled={generating}
                        >
                          Regenerate QR
                        </Button>
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
