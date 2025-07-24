"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Check if opened from extension
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('extension') === 'true') {
      // Redirect to settings page with extension parameter
      router.push("/settings?extension=true")
    } else {
      router.push("/dashboard")
    }
  }, [router])
  
  return null
}