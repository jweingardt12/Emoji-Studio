"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// Use any type to bypass the type checking issues with Recharts
export const RechartsTooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false }) as any
export const RechartsLegend = dynamic(() => import("recharts").then(mod => mod.Legend), { ssr: false }) as any

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
