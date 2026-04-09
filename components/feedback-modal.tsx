"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useAnalytics } from "@/lib/analytics"
import { toast } from "sonner"
import { X } from "lucide-react"

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [feedbackType, setFeedbackType] = useState("feature")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errors, setErrors] = useState<{name?: string; email?: string; message?: string}>({})
  const { trackFeedbackSubmitted, trackFeedbackSubmissionFailed, trackFeedbackModalClosed, trackFeedbackModalOpened } = useAnalytics()

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateForm = () => {
    const newErrors: {name?: string; email?: string; message?: string} = {}

    if (!name.trim()) {
      newErrors.name = "Name is required"
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters"
    }

    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!message.trim()) {
      newErrors.message = "Message is required"
    } else if (message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters"
    } else if (message.trim().length > 1000) {
      newErrors.message = "Message must be less than 1000 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  useEffect(() => {
    if (open) {
      trackFeedbackModalOpened()
      const timer = setTimeout(() => setIsVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [open, trackFeedbackModalOpened])

  const handleClose = () => {
    setIsVisible(false)
    trackFeedbackModalClosed(showSuccess)
    setTimeout(() => {
      onClose()
      setName("")
      setEmail("")
      setFeedbackType("feature")
      setMessage("")
      setErrors({})
      setShowSuccess(false)
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitting(true)

    try {
      const workspace = localStorage.getItem("workspace") || null
      const emojiData = localStorage.getItem("emojiData")
      let emojiCount = 0

      if (emojiData) {
        try {
          const parsedData = JSON.parse(emojiData)
          emojiCount = Array.isArray(parsedData) ? parsedData.length : 0
        } catch (e) {
          console.error("Error parsing emoji data:", e)
        }
      }

      const feedbackData = {
        name,
        email,
        feedbackType,
        message,
        timestamp: new Date().toISOString(),
        source: "emoji-studio-app",
        currentPage: "/settings",
        ...(workspace && {
          workspace,
          emojiCount
        })
      }

      const response = await fetch("https://cloud.activepieces.com/api/v1/webhooks/XWehbc587ULYJx3eoWxZz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setShowSuccess(true)
      trackFeedbackSubmitted(feedbackType as 'bug' | 'feature', !!workspace, "/settings")

      setTimeout(() => {
        handleClose()
        setTimeout(() => {
          toast.success("Feedback sent! Thank you for your feedback.")
        }, 300)
      }, 2000)
    } catch (error) {
      console.error("Error submitting feedback:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      trackFeedbackSubmissionFailed(errorMessage)
      toast.error("Error submitting feedback. Please try again later.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`relative bg-card rounded-xl border border-border shadow-lg w-full max-w-lg mx-4 transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        <div className="relative p-6 max-h-[85vh] overflow-y-auto">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-md hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 bg-green-500/20" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold">Message sent!</h2>
              <p className="text-sm text-muted-foreground">We'll get back to you soon.</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1">Send Feedback</h2>
              <p className="text-sm text-muted-foreground mb-4">We'd love to hear from you</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-xs">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (errors.name) setErrors({...errors, name: undefined})
                      }}
                      placeholder="Your name"
                      className={`h-9 ${errors.name ? "border-destructive" : ""}`}
                    />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (errors.email) setErrors({...errors, email: undefined})
                      }}
                      placeholder="your@email.com"
                      className={`h-9 ${errors.email ? "border-destructive" : ""}`}
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Type</Label>
                  <RadioGroup value={feedbackType} onValueChange={setFeedbackType} className="flex gap-4 mt-1">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="feature" id="feature" />
                      <Label htmlFor="feature" className="font-normal cursor-pointer text-sm">Feature Request</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bug" id="bug" />
                      <Label htmlFor="bug" className="font-normal cursor-pointer text-sm">Bug Report</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label htmlFor="message" className="text-xs">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      if (errors.message) setErrors({...errors, message: undefined})
                    }}
                    placeholder={feedbackType === "bug" ? "Describe the issue..." : "Describe the feature..."}
                    rows={4}
                    className={errors.message ? "border-destructive" : ""}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                    <p className="text-xs text-muted-foreground ml-auto">{message.length}/1000</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? "Sending..." : "Send"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
