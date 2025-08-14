"use client"

import { useEffect, useRef, useState } from "react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle as AlertCircleIcon, Camera, Loader2, X } from "lucide-react"
import { openpanel } from "@/lib/safe-openpanel"

export function QrScanDrawer({ open, onOpenChange, onDetected }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onDetected: (text: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const jsQRRef = useRef<any>(null)

  useEffect(() => {
    // Check for native BarcodeDetector support
    const hasBarcodeDetector = 'BarcodeDetector' in window
    setSupported(hasBarcodeDetector)
    
    // Pre-load jsQR for iOS/fallback
    if (!hasBarcodeDetector) {
      import("jsqr").then(module => {
        jsQRRef.current = module.default
        console.log("jsQR loaded for fallback scanner")
      })
    }
  }, [])

  useEffect(() => {
    if (!open) {
      stop()
      setCameraStatus('idle')
      setError(null)
      return
    }
    // Track QR scanner opened
    openpanel.track("Mobile QR Scanner: Opened", {
      supported: supported,
      fallback: !supported
    })
    // Start immediately - iOS requires user gesture to be recent
    start()
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const start = async () => {
    setError(null)
    setCameraStatus('requesting')
    
    try {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1'
      
      if (!isSecure) {
        throw new Error('Camera access requires HTTPS. Please use HTTPS or localhost.')
      }

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported. Please use a modern browser.')
      }

      if (!videoRef.current) {
        console.error("Video element not ready")
        // Wait a bit for video element to be ready
        await new Promise(resolve => setTimeout(resolve, 100))
        if (!videoRef.current) return
      }

      // Start with simple constraints for better iOS compatibility
      let stream: MediaStream
      try {
        // Try environment camera first
        console.log("Requesting camera access with environment facing mode...")
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        })
      } catch (e) {
        // Fallback to any camera
        console.log("Fallback to any available camera...")
        stream = await navigator.mediaDevices.getUserMedia({ video: true })
      }
      
      if (!videoRef.current) return // Check again after async operation
      
      streamRef.current = stream
      videoRef.current.srcObject = stream
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        if (!videoRef.current) return resolve(undefined)
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(resolve).catch(console.error)
        }
      })
      
      setCameraStatus('active')
      console.log("Camera started successfully")
      
      // Track camera access granted
      openpanel.track("Mobile QR Scanner: Camera Access Granted", {
        usingFallback: !supported,
        facingMode: "environment"
      })

      if ((window as any).BarcodeDetector) {
        console.log("Using native BarcodeDetector")
        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
        const tick = async () => {
          try {
            if (!videoRef.current) return
            const codes = await detector.detect(videoRef.current)
            if (codes && codes.length > 0) {
              const text = codes[0].rawValue || codes[0].raw || codes[0].value || ""
              if (text) {
                console.log("QR code detected:", text)
                openpanel.track("Mobile QR Scanner: Code Detected", {
                  method: "native",
                  contentType: text.includes("sid=") ? "pairing" : "other"
                })
                onDetected(text)
                onOpenChange(false)
                return
              }
            }
          } catch (err) {
            console.error("BarcodeDetector error:", err)
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Fallback for iOS Safari and other browsers
        console.log("Using jsQR fallback scanner")
        setUsingFallback(true)
        
        // Ensure jsQR is loaded
        if (!jsQRRef.current) {
          const module = await import("jsqr")
          jsQRRef.current = module.default
        }
        
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas")
        }
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) {
          throw new Error("Failed to get canvas context")
        }
        ctxRef.current = ctx

        const tick = () => {
          try {
            const video = videoRef.current
            if (!video || !video.videoWidth || !video.videoHeight) {
              rafRef.current = requestAnimationFrame(tick)
              return
            }
            
            // Resize canvas if needed
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth
              canvas.height = video.videoHeight
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            
            // Use jsQR to scan
            const code = jsQRRef.current(imageData.data, canvas.width, canvas.height, {
              inversionAttempts: "dontInvert"
            })
            
            if (code && code.data) {
              console.log("QR code detected via jsQR:", code.data)
              openpanel.track("Mobile QR Scanner: Code Detected", {
                method: "jsQR",
                contentType: code.data.includes("sid=") ? "pairing" : "other"
              })
              onDetected(code.data)
              onOpenChange(false)
              return
            }
          } catch (err) {
            console.error("jsQR scanning error:", err)
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        
        // Start scanning after a brief delay to ensure video is ready
        setTimeout(() => {
          rafRef.current = requestAnimationFrame(tick)
        }, 500)
      }
    } catch (e: any) {
      console.error("Camera error:", e)
      setCameraStatus('error')
      
      // Track camera access failure
      openpanel.track("Mobile QR Scanner: Camera Access Failed", {
        errorType: e.name,
        errorMessage: e.message
      })
      
      // Provide more helpful error messages
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow camera access and try again.")
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError("No camera found. Please ensure your device has a camera.")
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        setError("Camera is already in use. Please close other apps using the camera.")
      } else {
        setError(e?.message || "Failed to access camera. Please check permissions.")
      }
    }
  }

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative">
          <DrawerTitle>Scan QR Code</DrawerTitle>
          <DrawerDescription>
            {cameraStatus === 'requesting' && "Requesting camera access..."}
            {cameraStatus === 'active' && (usingFallback ? "Point your camera at the QR code" : "Point your camera at the QR code")}
            {cameraStatus === 'error' && "Camera access failed"}
            {cameraStatus === 'idle' && "Initializing camera..."}
          </DrawerDescription>
          <DrawerClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DrawerClose>
        </DrawerHeader>
        
        <div className="px-4 pb-4 overflow-y-auto">
          {/* Camera permission request state */}
          {cameraStatus === 'requesting' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="rounded-full bg-primary/10 p-4">
                <Camera className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Camera Permission Required</p>
                <p className="text-xs text-muted-foreground">
                  Please allow camera access when prompted
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {cameraStatus === 'idle' && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Camera Access Failed</AlertTitle>
              <AlertDescription className="mt-2">
                <div className="space-y-2">
                  <p>{error}</p>
                  {error.includes("HTTPS") && (
                    <div className="text-xs space-y-1 mt-2">
                      <p className="font-medium">Camera requires a secure connection:</p>
                      <ul className="list-disc list-inside space-y-1 opacity-90">
                        <li>Use HTTPS instead of HTTP</li>
                        <li>Or access via localhost for testing</li>
                      </ul>
                    </div>
                  )}
                  {error.includes("permission") && (
                    <div className="text-xs space-y-1 mt-2">
                      <p className="font-medium">To enable camera access on iOS:</p>
                      <ol className="list-decimal list-inside space-y-1 opacity-90">
                        <li>Go to Settings → Safari</li>
                        <li>Tap "Camera" under Settings for Websites</li>
                        <li>Select "Ask" or "Allow"</li>
                        <li>Refresh and try again</li>
                      </ol>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Video feed - Always render but conditionally show */}
          <div className={`relative w-full aspect-[4/3] overflow-hidden rounded-lg border bg-black ${
            cameraStatus === 'idle' || cameraStatus === 'error' ? 'hidden' : ''
          }`}>
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover" 
              muted 
              playsInline 
              autoPlay
            />
            {cameraStatus === 'active' && (
              <>
                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white/50 rounded-lg">
                      <div className="w-full h-full border-2 border-white rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
                {/* Scanning indicator */}
                {usingFallback && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Scanning...
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => {
            openpanel.track("Mobile QR Scanner: Cancelled", {
              cameraStatus: cameraStatus
            })
            onOpenChange(false)
          }}>Cancel</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}