"use client"

import { useState, useEffect, useRef } from "react"
import { X, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTrack } from "@/lib/hooks/use-track"
import { toast } from "sonner"

interface EmailExtensionModalProps {
  open: boolean
  onClose: () => void
}

export function EmailExtensionModal({ open, onClose }: EmailExtensionModalProps) {
  const track = useTrack()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isVisible, setIsVisible] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY
      const originalBody = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
      }
      const originalHtmlOverflow = document.documentElement.style.overflow

      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = "100%"

      inputRef.current?.focus({ preventScroll: true })
      const timer = setTimeout(() => setIsVisible(true), 10)

      return () => {
        clearTimeout(timer)
        document.body.style.overflow = originalBody.overflow
        document.documentElement.style.overflow = originalHtmlOverflow
        document.body.style.position = originalBody.position
        document.body.style.top = originalBody.top
        document.body.style.width = originalBody.width
        window.scrollTo(0, scrollY)
      }
    }

    setIsVisible(false)
  }, [open])

  const handleClose = () => {
    setIsVisible(false)
    track("email_extension_modal_closed", { method: "manual_close", success: showSuccess })
    // Wait for fade out animation before actually closing
    setTimeout(() => {
      onClose()
      // Reset form after closing
      setEmail("")
      setError("")
      setShowSuccess(false)
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email) {
      setError("Email is required")
      return
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }

    setLoading(true)
    track("email_extension_requested", { email, source: "wrapped-landing" })

    try {
      const response = await fetch("https://cloud.activepieces.com/api/v1/webhooks/npaUNTnqNEkH05cg06hhx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          timestamp: new Date().toISOString(),
          source: "emoji-studio-wrapped-mobile",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit")
      }

      track("email_extension_success", { email })

      // Show success state
      setShowSuccess(true)

      // Close modal after 5 seconds
      setTimeout(() => {
        handleClose()
      }, 5000)
    } catch (err) {
      console.error("Error submitting email:", err)
      track("email_extension_error", { error: err instanceof Error ? err.message : "Unknown error" })
      toast.error("Failed to send email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={() => {
          track("email_extension_modal_closed", { method: "backdrop_click" })
          handleClose()
        }}
      />
      <div className={`relative bg-background border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 bg-green-500/20"></div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                <svg className="h-8 w-8 text-white animate-[scale-in_0.3s_ease-out]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold animate-[fade-in_0.4s_ease-out_0.2s_both]">Email sent!</h2>
            <p className="text-sm text-muted-foreground animate-[fade-in_0.4s_ease-out_0.3s_both] text-center px-4">
              Check your inbox for the Chrome extension link and download it when you&apos;re back at your computer.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={() => {
                track("email_extension_modal_closed", { method: "close_button" })
                handleClose()
              }}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Get Chrome Extension Link</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ll send you a link to install the Emoji Studio Chrome extension on your desktop.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError("")
                    }}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive mt-1">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Extension Link"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
