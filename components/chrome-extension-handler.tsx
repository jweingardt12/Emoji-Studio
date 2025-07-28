"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { initializeExtensionListener, type SlackAuthData } from "@/lib/chrome-extension"
import { parseSlackCurl } from "@/lib/utils/parse-slack-curl"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { Emoji } from "@/lib/services/emoji-service"
import { LoadingOverlay } from "@/components/loading-overlay"
import { useOpenPanel } from '@openpanel/nextjs'
import confetti from "canvas-confetti"

export function ChromeExtensionHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setEmojiData, setWorkspace, setHasRealData } = useEmojiData()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingStage, setLoadingStage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [redirectPending, setRedirectPending] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const hasProcessed = useRef(false)
  const op = useOpenPanel()

  // Function to process extension data
  const processExtensionData = async (data: SlackAuthData) => {
    console.log('[ChromeExtensionHandler] Processing extension data:', data)
    
    if (hasProcessed.current) {
      console.log('[ChromeExtensionHandler] Already processed, ignoring duplicate')
      return
    }
    
    hasProcessed.current = true
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)
    
    try {
      setLoadingStage("Processing Chrome extension data...")
      setProgress(10)
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      // Convert extension data to curl command format
      const generateCurlFromExtensionData = (data: SlackAuthData): string => {
        const workspace = data.workspace || 'workspace'
        const timestamp = Math.floor(Date.now() / 1000)
        const xId = data.xId || `generated-${timestamp}`
        const url = `https://${workspace}.slack.com/api/emoji.adminList?_x_id=${xId}&_x_version_ts=noversion&fp=98`
        
        let curl = `curl '${url}'`
        curl += ` -H 'accept: */*'`
        curl += ` -H 'accept-language: en-US,en;q=0.9'`
        curl += ` -H 'cache-control: no-cache'`
        curl += ` -H 'content-type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'`
        
        if (data.cookie) {
          curl += ` -b '${data.cookie}'`
        }
        
        curl += ` -H 'pragma: no-cache'`
        curl += ` -H 'sec-fetch-dest: empty'`
        curl += ` -H 'sec-fetch-mode: cors'`
        curl += ` -H 'sec-fetch-site: same-origin'`
        curl += ` --data-raw $'------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="token"\\r\\n\\r\\n${data.token}\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW\\r\\nContent-Disposition: form-data; name="count"\\r\\n\\r\\n20000\\r\\n------WebKitFormBoundary7MA4YWxkTrZu0gW--\\r\\n'`
        
        return curl
      }
      
      setLoadingStage("Parsing authentication data...")
      setProgress(20)
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      const curlCommand = generateCurlFromExtensionData(data)
      console.log('[ChromeExtensionHandler] Generated curl command:', curlCommand)
      
      // Parse the curl command to extract the request details
      const parsedData = parseSlackCurl(curlCommand)
      
      if (!parsedData.isValid || parsedData.error) {
        const errorMessage = parsedData.error || "Invalid authentication data"
        op.track('chrome_extension_invalid_data', {
          error: errorMessage,
          hasToken: !!parsedData.token,
          hasCookie: !!parsedData.cookie,
          hasWorkspace: !!parsedData.workspace,
        })
        throw new Error(errorMessage)
      }
      
      setLoadingStage("Connecting to Slack workspace...")
      setProgress(40)
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      const workspace = data.workspace || "workspace"
      localStorage.setItem("slackCurlCommand", curlCommand)
      localStorage.setItem("workspace", workspace)
      setWorkspace(workspace)
      
      // Transform parsed data into the format expected by the API
      const curlRequest = {
        url: parsedData.url,
        method: "POST",
        headers: {
          Cookie: parsedData.cookie || "",
        },
        formData: {
          token: parsedData.token || "",
          count: "20000", // Ensure we get all emojis, not just first 1000
        },
      }
      
      setLoadingStage("Fetching emoji data...")
      setProgress(60)
      
      // Make the API request
      const response = await fetch("/api/slack-emojis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ curlRequest }),
      })

      const responseText = await response.text()
      console.log("[ChromeExtensionHandler] API response text:", responseText)

      if (!response.ok) {
        let errorMessage = "Failed to fetch emoji data"
        try {
          const errorData = JSON.parse(responseText)
          console.error("[ChromeExtensionHandler] API error response:", errorData)
          errorMessage = errorData.error || errorMessage
          
          op.track('chrome_extension_api_error', {
            status: response.status,
            error: errorMessage,
            workspace: workspace,
          })
        } catch {
          console.error("[ChromeExtensionHandler] Failed to parse error response:", responseText)
        }
        throw new Error(`API error: ${errorMessage}`)
      }

      setLoadingStage("Processing emoji data...")
      setProgress(80)

      let responseData: any
      try {
        responseData = JSON.parse(responseText)
      } catch (parseError) {
        console.error("[ChromeExtensionHandler] Failed to parse response:", responseText)
        throw new Error("Invalid response format from server")
      }

      if (!responseData.emojis || !Array.isArray(responseData.emojis)) {
        console.error("[ChromeExtensionHandler] Invalid data format:", responseData)
        throw new Error("Invalid emoji data format")
      }

      const typedEmojis = responseData.emojis as Emoji[]
      setProgress(90)
      
      // Update the emoji data
      setEmojiData(typedEmojis)
      setHasRealData(true)
      
      // Store in localStorage
      localStorage.setItem("emojiData", JSON.stringify(typedEmojis))
      localStorage.setItem("emojiCount", typedEmojis.length.toString())
      localStorage.setItem("lastFetchTime", new Date().toISOString())
      
      setLoadingStage(`Success! Loaded ${typedEmojis.length} emojis`)
      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 800))
      
      setSuccess(`Successfully fetched ${typedEmojis.length} emojis from ${workspace}`)
      
      // Show success state while keeping overlay visible
      setShowSuccess(true)
      
      // Keep overlay visible during confetti
      await new Promise((resolve) => setTimeout(resolve, 100))
      
      // Create custom logo confetti
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      canvas.style.position = 'fixed'
      canvas.style.top = '0'
      canvas.style.left = '0'
      canvas.style.pointerEvents = 'none'
      canvas.style.zIndex = '9999'
      document.body.appendChild(canvas)
      
      // Load logo image
      const logoImg = new Image()
      logoImg.src = '/logo.png'
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })
      
      // Particle system for logo confetti
      interface LogoParticle {
        x: number
        y: number
        vx: number
        vy: number
        size: number
        rotation: number
        rotationSpeed: number
        opacity: number
      }
      
      const particles: LogoParticle[] = []
      
      // Create particles from multiple origins
      const createBurst = (originX: number, originY: number, count: number) => {
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * Math.random())
          const velocity = 2 + Math.random() * 6 // Much slower velocity
          particles.push({
            x: originX * canvas.width,
            y: originY * canvas.height,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity - 5, // Less upward force
            size: 80 + Math.random() * 60, // Larger logos 80-140px
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05, // Slower rotation
            opacity: 1
          })
        }
      }
      
      // Create multiple bursts
      createBurst(0.5, 0.7, 15)  // Center
      createBurst(0.2, 0.7, 8)   // Left
      createBurst(0.8, 0.7, 8)   // Right
      
      let startTime = Date.now()
      const duration = 4000 // 4 seconds
      
      const animate = () => {
        if (!ctx) return
        
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        particles.forEach(particle => {
          // Update physics (slower)
          particle.x += particle.vx * 0.6
          particle.y += particle.vy * 0.6
          particle.vy += 0.2 // Lighter gravity
          particle.vx *= 0.995 // Less air resistance
          particle.rotation += particle.rotationSpeed
          particle.opacity = 1 - (progress * progress) * 0.9 // Slower fade out with easing
          
          // Draw logo
          if (particle.opacity > 0) {
            ctx.save()
            ctx.globalAlpha = particle.opacity
            ctx.translate(particle.x, particle.y)
            ctx.rotate(particle.rotation)
            ctx.drawImage(
              logoImg,
              -particle.size / 2,
              -particle.size / 2,
              particle.size,
              particle.size
            )
            ctx.restore()
          }
        })
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          document.body.removeChild(canvas)
        }
      }
      
      requestAnimationFrame(animate)
      
      // Wait for confetti animation to complete
      await new Promise((resolve) => setTimeout(resolve, 4000))
      
      // Hide overlay
      setIsLoading(false)
      setShowSuccess(false)
      setLoadingStage("")
      setProgress(0)
      
      op.track('chrome_extension_emojis_fetched', {
        emojiCount: typedEmojis.length,
        workspace: workspace,
        hasAliases: responseData.emojis.some((e: any) => e.is_alias),
      })
      
      // Remove the extension parameter from the URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('extension')
      window.history.replaceState({}, '', newUrl.toString())
      
    } catch (error) {
      console.error('[ChromeExtensionHandler] Error processing extension data:', error)
      setError(error instanceof Error ? error.message : "Unknown error occurred")
      setIsLoading(false)
      setLoadingStage("")
      setProgress(0)
    }
  }

  useEffect(() => {
    console.log('[ChromeExtensionHandler] Component mounted')
    // Check if we're coming from the extension
    const fromExtension = searchParams.get('extension') === 'true'
    console.log('[ChromeExtensionHandler] Extension parameter:', fromExtension)
    
    if (fromExtension && !hasProcessed.current) {
      console.log('[ChromeExtensionHandler] Setting up extension listener')
      
      // Show loading overlay immediately
      setIsLoading(true)
      setLoadingStage("Waiting for Chrome extension data...")
      setProgress(10)
      
      // Set a timeout in case extension doesn't respond
      const timeoutId = setTimeout(() => {
        if (!hasProcessed.current) {
          console.log('[ChromeExtensionHandler] Timeout waiting for extension data')
          setError("Connection timeout. Please make sure the Chrome extension is installed and try again.")
          setIsLoading(false)
          setLoadingStage("")
          setProgress(0)
        }
      }, 10000) // 10 second timeout
      
      // Initialize Chrome extension listener
      initializeExtensionListener(
        (data: SlackAuthData) => {
          console.log('[ChromeExtensionHandler] Received data from extension:', data)
          // Clear the timeout
          clearTimeout(timeoutId)
          // Process immediately if we haven't already
          if (!hasProcessed.current) {
            processExtensionData(data)
          }
        },
        () => {
          console.log('[ChromeExtensionHandler] Clear data request from extension')
          // Clear all data when requested by extension
          localStorage.clear()
          sessionStorage.clear()
          setEmojiData([])
          setHasRealData(false)
          setWorkspace("")
          // Reload to ensure clean state
          window.location.href = "/settings"
        }
      )
    }
  }, [searchParams])

  return (
    <>
      <LoadingOverlay
        isOpen={isLoading}
        progress={progress}
        loadingStage={loadingStage}
        isSuccess={showSuccess}
      />
      {error && !isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-md rounded-lg border bg-card p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-destructive">Error</h3>
            <p className="mb-4 text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => {
                setError(null)
                // Remove the extension parameter and redirect to settings
                window.location.href = "/settings"
              }}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Settings
            </button>
          </div>
        </div>
      )}
    </>
  )
}