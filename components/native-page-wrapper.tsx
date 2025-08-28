"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface NativePageWrapperProps {
  children: ReactNode
  className?: string
}

export function NativePageWrapper({ children, className }: NativePageWrapperProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    setIsTransitioning(true)
    
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setIsTransitioning(false)
    }, 150)

    return () => clearTimeout(timer)
  }, [pathname, children])

  return (
    <div 
      className={cn(
        "transition-all duration-300 ease-out",
        isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0",
        className
      )}
    >
      {displayChildren}
    </div>
  )
}