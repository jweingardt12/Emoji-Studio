"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle as AlertCircleIcon, Camera, Loader2 } from "lucide-react"

export function QrScanDialog({ open, onOpenChange, onDetected }: {
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
        // Try to polyfill for older browsers
        const getUserMedia = (navigator as any).getUserMedia || 
                           (navigator as any).webkitGetUserMedia || 
                           (navigator as any).mozGetUserMedia || 
                           (navigator as any).msGetUserMedia

        if (!getUserMedia) {
          throw new Error('Camera API not supported. Please use a modern browser like Safari, Chrome, or Firefox.')
        }

        // Use legacy API
        await new Promise((resolve, reject) => {
          getUserMedia.call(navigator, { video: true }, 
            (stream: MediaStream) => {
              if (videoRef.current) {
                streamRef.current = stream
                videoRef.current.srcObject = stream
                resolve(stream)
              }
            },
            reject
          )
        })
      } else {
        // Modern API
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
      }
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        if (!videoRef.current) return resolve(undefined)
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(resolve).catch(console.error)
        }
      })
      
      setCameraStatus('active')
      console.log("Camera started successfully")

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
      
      // Provide more helpful error messages
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow camera access and try again.")
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError("No camera found. Please ensure your device has a camera.")
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        setError("Camera is already in use. Please close other apps using the camera.")
      } else if (e.name === 'OverconstrainedError' || e.name === 'ConstraintNotSatisfiedError') {
        setError("Camera doesn't support required settings. Trying with default settings...")
        // Retry with simpler constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          if (videoRef.current) {
            streamRef.current = stream
            videoRef.current.srcObject = stream
            await videoRef.current.play()
            setCameraStatus('active')
            // Restart scanning with basic settings
            start()
          }
        } catch (retryError) {
          setError("Failed to access camera. Please check your browser settings.")
        }
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
          <DialogDescription>
            {cameraStatus === 'requesting' && "Requesting camera access..."}
            {cameraStatus === 'active' && (usingFallback ? "Scanning for QR codes... (using compatibility mode)" : "Point your camera at the QR code")}
            {cameraStatus === 'error' && "Camera access failed"}
            {cameraStatus === 'idle' && "Initializing camera..."}
          </DialogDescription>
        </DialogHeader>
        
        {/* Camera permission request state */}
        {cameraStatus === 'requesting' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Camera className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Camera Permission Required</p>
              <p className="text-xs text-muted-foreground">
                Please allow camera access when prompted to scan QR codes
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
                    <p className="font-medium">Camera access requires a secure connection:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                      <li>Use HTTPS instead of HTTP</li>
                      <li>Or access via localhost for testing</li>
                      <li>iOS Safari blocks camera on non-secure sites</li>
                    </ul>
                  </div>
                )}
                {error.includes("permission") && (
                  <div className="text-xs space-y-1 mt-2">
                    <p className="font-medium">To enable camera access:</p>
                    <ol className="list-decimal list-inside space-y-1 opacity-90">
                      <li>Tap the address bar</li>
                      <li>Look for camera/site settings</li>
                      <li>Allow camera access</li>
                      <li>Refresh and try again</li>
                    </ol>
                  </div>
                )}
                {error.includes("not supported") && (
                  <div className="text-xs space-y-1 mt-2">
                    <p className="font-medium">Your browser doesn't support camera access:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                      <li>Update to the latest version</li>
                      <li>Try Safari, Chrome, or Firefox</li>
                      <li>Ensure JavaScript is enabled</li>
                    </ul>
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
            style={{ transform: 'scaleX(-1)' }} // Mirror the video for better UX
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
                  Compatibility mode
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
