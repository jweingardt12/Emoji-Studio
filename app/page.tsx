"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Check if opened from extension
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('extension') === 'true') {
      // Redirect to dashboard with extension parameter to show processing
      router.push("/dashboard?extension=true")
    } else {
      router.push("/dashboard")
    }
  }, [router])
  
  return null
}