"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Import Recharts components dynamically with proper typing
// Use type assertion to handle the type incompatibility issues
export const RechartsTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip) as any,
  { ssr: false }
)

export const RechartsLegend = dynamic(
  () => import("recharts").then((mod) => mod.Legend) as any,
  { ssr: false }
)

// Client-only wrapper component
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return null
  }

  return <>{children}</>
}
