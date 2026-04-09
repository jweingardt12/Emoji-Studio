"use client"

import { useState, useRef, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAnalytics } from "@/lib/analytics"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [feedbackType, setFeedbackType] = useState<"feature" | "bug">("feature")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errors, setErrors] = useState<{name?: string; email?: string; message?: string}>({})
  const { trackFeedbackSubmitted, trackFeedbackSubmissionFailed, trackFeedbackModalClosed, trackFeedbackModalOpened } = useAnalytics()
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (successTimerRef.current) clearTimeout(successTimerRef.current) }, [])

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const validateForm = () => {
    const newErrors: {name?: string; email?: string; message?: string} = {}
    if (!name.trim()) newErrors.name = "Required"
    else if (name.trim().length < 2) newErrors.name = "Too short"
    if (!email.trim()) newErrors.email = "Required"
    else if (!validateEmail(email)) newErrors.email = "Invalid email"
    if (!message.trim()) newErrors.message = "Required"
    else if (message.trim().length < 10) newErrors.message = "At least 10 characters"
    else if (message.trim().length > 1000) newErrors.message = "Too long"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setName("")
    setEmail("")
    setFeedbackType("feature")
    setMessage("")
    setErrors({})
    setShowSuccess(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      trackFeedbackModalOpened()
    } else {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      trackFeedbackModalClosed(showSuccess)
      resetForm()
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setSubmitting(true)
    try {
      const workspace = localStorage.getItem("workspace") || null
      const emojiCount = parseInt(localStorage.getItem("emojiCount") || "0", 10) || 0

      const response = await fetch("/api/webhook-relay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "feedback",
          name, email, feedbackType, message,
          timestamp: new Date().toISOString(),
          source: "emoji-studio-app",
          currentPage: window.location.pathname,
          ...(workspace && { workspace, emojiCount }),
        }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      setShowSuccess(true)
      trackFeedbackSubmitted(feedbackType, !!workspace, window.location.pathname)

      successTimerRef.current = setTimeout(() => {
        handleOpenChange(false)
        setTimeout(() => toast.success("Feedback sent! Thank you."), 300)
      }, 2000)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      trackFeedbackSubmissionFailed(msg)
      toast.error("Error submitting feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full h-14 w-14 bg-green-500/20" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-green-500">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">Message sent!</p>
              <p className="text-sm text-muted-foreground mt-1">We'll get back to you soon.</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send Feedback</DialogTitle>
              <DialogDescription>We'd love to hear from you</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-name" className="text-xs">Name</Label>
                  <Input
                    id="feedback-name"
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({...errors, name: undefined}) }}
                    placeholder="Your name"
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-email" className="text-xs">Email</Label>
                  <Input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({...errors, email: undefined}) }}
                    placeholder="your@email.com"
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
                  {(["feature", "bug"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFeedbackType(type)}
                      className={cn(
                        "flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                        feedbackType === type
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type === "feature" ? "Feature Request" : "Bug Report"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedback-message" className="text-xs">Message</Label>
                <Textarea
                  id="feedback-message"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); if (errors.message) setErrors({...errors, message: undefined}) }}
                  placeholder={feedbackType === "bug" ? "Describe the issue..." : "Describe the feature..."}
                  rows={4}
                  className={errors.message ? "border-destructive" : ""}
                />
                <div className="flex justify-between items-center">
                  {errors.message ? <p className="text-xs text-destructive">{errors.message}</p> : <span />}
                  <p className="text-xs text-muted-foreground tabular-nums">{message.length}/1000</p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Sending..." : "Send"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
