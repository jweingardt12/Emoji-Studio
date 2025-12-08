"use client"

import { useState } from "react"
import { Chrome, Sparkles, Mail, Check } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { useTrack } from "@/lib/hooks/use-track"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { RainbowButton } from "@/src/components/magicui/rainbow-button"
import { GradientText } from "@/components/ui/gradient-text"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

const CHROME_EXTENSION_URL = "https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa"

interface ConnectWorkspaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectWorkspaceModal({ open, onOpenChange }: ConnectWorkspaceModalProps) {
  const track = useTrack()
  const isMobile = useIsMobile()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleChromeClick = () => {
    track("wrapped_connect_modal_chrome_clicked", { year: new Date().getFullYear() })
    window.open(CHROME_EXTENSION_URL, "_blank")
    onOpenChange(false)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
    track("wrapped_connect_modal_email_submitted", { email, year: new Date().getFullYear() })

    try {
      const response = await fetch("https://cloud.activepieces.com/api/v1/webhooks/npaUNTnqNEkH05cg06hhx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          timestamp: new Date().toISOString(),
          source: "wrapped-connect-modal-mobile",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit")
      }

      track("wrapped_connect_modal_email_success", { email })
      setShowSuccess(true)

      // Close modal after showing success
      setTimeout(() => {
        onOpenChange(false)
        // Reset state after closing
        setTimeout(() => {
          setEmail("")
          setShowSuccess(false)
        }, 300)
      }, 3000)
    } catch (err) {
      console.error("Error submitting email:", err)
      track("wrapped_connect_modal_email_error", { error: err instanceof Error ? err.message : "Unknown error" })
      toast.error("Failed to send email. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      track("wrapped_connect_modal_dismissed", { year: new Date().getFullYear() })
      // Reset state when closing
      setTimeout(() => {
        setEmail("")
        setError("")
        setShowSuccess(false)
      }, 300)
    }
    onOpenChange(newOpen)
  }

  // Desktop content - Chrome extension button
  const desktopContent = (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      {/* Icon */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur-xl opacity-50" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <GradientText
          as="h2"
          colors={["#8b5cf6", "#ec4899", "#f97316", "#8b5cf6"]}
          className="text-2xl font-bold"
          animationSpeed={4}
        >
          Connect Your Workspace
        </GradientText>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          To generate your Wrapped, we need to connect to your Slack workspace and sync your emoji data.
        </p>
      </div>

      {/* CTA Button */}
      <RainbowButton
        size="lg"
        onClick={handleChromeClick}
        className="w-full max-w-xs"
      >
        <Chrome className="w-5 h-5 mr-2" />
        Get Chrome Extension
      </RainbowButton>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Free &bull; Takes 30 seconds to set up
      </p>
    </div>
  )

  // Mobile content - Email capture
  const mobileContent = (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      {/* Icon */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full blur-xl opacity-50" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <GradientText
          as="h2"
          colors={["#8b5cf6", "#ec4899", "#f97316", "#8b5cf6"]}
          className="text-2xl font-bold"
          animationSpeed={4}
        >
          Connect Your Workspace
        </GradientText>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Wrapped works best on desktop. We&apos;ll email you the Chrome extension link to set up when you&apos;re at your computer.
        </p>
      </div>

      {showSuccess ? (
        // Success state
        <div className="flex flex-col items-center space-y-3 py-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 bg-green-500/20" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
              <Check className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium">Email sent!</p>
          <p className="text-xs text-muted-foreground">
            Check your inbox for the extension link.
          </p>
        </div>
      ) : (
        // Email form
        <form onSubmit={handleEmailSubmit} className="w-full max-w-xs space-y-3">
          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
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
              <p className="text-sm text-destructive mt-1 text-left">{error}</p>
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
      )}

      {/* Helper text */}
      {!showSuccess && (
        <p className="text-xs text-muted-foreground">
          Free &bull; Takes 30 seconds to set up on desktop
        </p>
      )}
    </div>
  )

  // Don't render until we know if mobile or not (prevents hydration mismatch)
  if (isMobile === null) return null

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="px-6 pb-8">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Connect Your Workspace</DrawerTitle>
            <DrawerDescription>Connect your Slack workspace to generate your Wrapped</DrawerDescription>
          </DrawerHeader>
          {mobileContent}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Connect Your Workspace</DialogTitle>
          <DialogDescription>Connect your Slack workspace to generate your Wrapped</DialogDescription>
        </DialogHeader>
        {desktopContent}
      </DialogContent>
    </Dialog>
  )
}
