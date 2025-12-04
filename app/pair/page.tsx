"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { decompressCurl } from "@/lib/utils/compress-curl"
import { decryptCurlCode } from "@/lib/utils/pairing-crypto"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { QrScanDrawer } from "@/components/qr-scan-drawer"
import { emojiStorage, settingsStorage } from "@/lib/storage/indexed-db"
import { safePersistEmojiDataToLocalStorage } from "@/lib/storage/safe-emoji-local-storage"
import { useTrack } from "@/lib/hooks/use-track"

export default function PairPage() {
  const router = useRouter()
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const track = useTrack()
  const [scanOpen, setScanOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [processingPairing, setProcessingPairing] = useState(false)
  const [hasImported, setHasImported] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const compressedData = params.get("data")
    const encodedCurl = params.get("curl") // Fallback for old format
    const sid = params.get("sid") // Fallback for session-based format
    
    if (compressedData && !processingPairing) {
      setProcessingPairing(true)
      track("Mobile QR Pairing: Started", {
        source: "compressed_data"
      })

      ;(async () => {
        try {
          let curl: string
          try {
            curl = await decryptCurlCode(compressedData)
            console.log("Decrypted curl command successfully")
          } catch (decryptError) {
            console.warn("Failed to decrypt pairing code, attempting legacy decode:", decryptError)
            curl = decompressCurl(compressedData)
            console.log("Decompressed legacy curl command successfully")
          }
          await handleCurlImport(curl)
        } catch (error) {
          console.error("Failed to process pairing data:", error)
          toast.error("Invalid QR code data")
          router.replace("/settings#connection")
        } finally {
          setProcessingPairing(false)
        }
      })()
    } else if (encodedCurl && !processingPairing) {
      // Old format - direct base64 encoded curl
      setProcessingPairing(true)
      track("Mobile QR Pairing: Started", {
        source: "direct_curl"
      })
      
      try {
        // Decode the base64 encoded curl
        const curl = atob(decodeURIComponent(encodedCurl))
        handleCurlImport(curl)
      } catch (error) {
        console.error("Failed to decode curl:", error)
        toast.error("Invalid QR code data")
        router.replace("/settings#connection")
      }
    } else if (sid && !processingPairing) {
      // Session-based format - try to claim it
      setProcessingPairing(true)
      track("Mobile QR Pairing: Started", {
        source: "session_id"
      })
      claimAndImport(sid)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCurlImport = async (curl: string) => {
    // Prevent duplicate imports
    if (hasImported) return
    
    try {
      const parsed = parseSlackCurl(curl)
      if (!parsed.isValid) throw new Error(parsed.error || "Invalid cURL")

      localStorage.setItem("slackCurlCommand", curl)
      if (parsed.workspace) localStorage.setItem("workspace", parsed.workspace)

      // Auto-fetch emojis
      const url = parsed.url || ""
      const formData: Record<string, string> = {}
      if (parsed.token) formData.token = parsed.token
      if (!formData["count"] && url.includes("emoji")) formData["count"] = "20000"

      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curlRequest: {
            url,
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              ...(parsed.cookie ? { Cookie: parsed.cookie } : {}),
            },
            formData,
          },
        }),
      })
      const text = await response.text()
      if (!response.ok) throw new Error(text || "Slack API error")
      const data = JSON.parse(text)
      const emojis = Array.isArray(data.emojis) ? data.emojis : []
      if (!emojis.length) throw new Error("No emoji data returned")
      
      setEmojiData(emojis)
      setHasRealData(true)
      
      // Save to hybrid storage
      await emojiStorage.saveEmojis(emojis)
      await settingsStorage.saveSetting("workspace", parsed.workspace || "slack-workspace")
      await settingsStorage.saveSetting("emojiCount", emojis.length)
      await settingsStorage.saveSetting("lastFetchTime", new Date().toISOString())
      
      // Keep localStorage for backwards compatibility
      safePersistEmojiDataToLocalStorage(emojis, { source: "pair-page" })
      localStorage.setItem("emojiCount", String(emojis.length))
      localStorage.setItem("lastFetchTime", new Date().toISOString())
      
      setWorkspace(parsed.workspace || "slack-workspace")
      
      // Track successful import
      track("Mobile QR Pairing: Import Success", {
        workspace: parsed.workspace || "unknown",
        emojiCount: emojis.length
      })
      
      // Don't show toast here - the dashboard will handle showing sync status
      router.replace("/dashboard")
    } catch (e: any) {
      track("Mobile QR Pairing: Import Failed", {
        error: e.message || "Unknown error"
      })
      toast.error(e.message || "Failed to import curl")
      router.replace("/settings#connection")
    }
  }

  const claimAndImport = async (sid: string) => {
    if (hasImported) return // Prevent duplicate claims
    
    setSubmitting(true)
    let successfulClaim = false
    
    try {
      // Add a small delay to ensure the pairing session is fully created
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const res = await fetch("/api/pair/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sid }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Don't show "not_found" error as it might be a timing issue
        if ((data.reason === "not_found" || data.reason === "expired") && !hasImported && !successfulClaim) {
          // Retry once after a delay
          await new Promise(resolve => setTimeout(resolve, 1000))
          const retryRes = await fetch("/api/pair/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: sid }),
          })
          const retryData = await retryRes.json()
          if (!retryRes.ok) {
            console.error("Pairing claim failed after retry:", retryData)
            throw new Error(retryData.error || "Pairing failed")
          }
          successfulClaim = true
          setHasImported(true) // Set immediately to prevent duplicate processing
          
          track("Mobile QR Pairing: Claim Success", {
            sessionId: sid,
            retry: true
          })
          
          await handleCurlImport(retryData.curl)
          return
        }
        throw new Error(data.error || "Pairing failed")
      }
      successfulClaim = true
      setHasImported(true) // Set immediately to prevent duplicate processing
      
      track("Mobile QR Pairing: Claim Success", {
        sessionId: sid
      })
      
      await handleCurlImport(data.curl)
    } catch (err: any) {
      if (!hasImported && !successfulClaim) {
        track("Mobile QR Pairing: Claim Failed", {
          sessionId: sid,
          error: err.message || "Unknown error"
        })
        toast.error(err.message || "Pairing failed")
      }
      setSubmitting(false)
    }
  }

  const handleScanDetected = (text: string) => {
    try {
      const url = new URL(text)
      const encodedCurl = url.searchParams.get("curl")
      const sid = url.searchParams.get("sid") // Fallback for old QR codes
      
      if (encodedCurl) {
        track("Mobile QR Pairing: QR Scanned", {
          type: "direct_curl"
        })
        
        try {
          // Decode the base64 encoded curl
          const curl = atob(decodeURIComponent(encodedCurl))
          setScanOpen(false) // Close scanner
          handleCurlImport(curl)
        } catch (error) {
          console.error("Failed to decode curl from QR:", error)
          toast.error("Invalid QR code data")
        }
        return
      } else if (sid) {
        track("Mobile QR Pairing: QR Scanned", {
          type: "session_id"
        })
        setScanOpen(false) // Close scanner
        claimAndImport(sid)
        return
      }
      
      track("Mobile QR Pairing: Invalid QR", {
        reason: "no_data"
      })
      toast.error("QR does not contain pairing data")
    } catch {
      if (/^[A-Za-z0-9_-]+$/.test(text)) {
        track("Mobile QR Pairing: QR Scanned", {
          type: "encrypted_code"
        })
        setScanOpen(false)
        router.push(`/pair?data=${encodeURIComponent(text)}`)
        return
      }

      track("Mobile QR Pairing: Invalid QR", {
        reason: "invalid_content"
      })
      toast.error("Invalid QR content")
    }
  }

  // Show loading state if we're processing a pairing from URL
  if (processingPairing || submitting) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Pairing Device</CardTitle>
            <CardDescription>Connecting to your Slack workspace...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                {submitting ? "Importing workspace data..." : "Establishing connection..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Only show the scan button if we're not auto-processing
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pair this device</CardTitle>
          <CardDescription>Scan the QR code shown on your desktop.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 mb-4">
            <Button variant="outline" onClick={() => {
              track("Mobile QR Pairing: Open Scanner", {})
              setScanOpen(true)
            }}>
              Pair to Desktop (Scan QR)
            </Button>
          </div>
        </CardContent>
      </Card>
      <QrScanDrawer open={scanOpen} onOpenChange={setScanOpen} onDetected={handleScanDetected} />
    </div>
  )
}
