"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex gap-1">
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
        <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
      </div>
    )
  }

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' }
  ]

  return (
    <div className="flex gap-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => {
            setTheme(value)
            // Haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10)
            }
          }}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg transition-all",
            "hover:bg-muted active:scale-95",
            theme === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-card border border-border"
          )}
          aria-label={label}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}
