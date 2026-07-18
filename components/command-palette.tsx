"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  Activity,
  BarChart3,
  Gift,
  ImagePlus,
  Images,
  LayoutDashboard,
  Moon,
  Settings,
  Sparkles,
  Sun,
  Trophy,
  UserCircle,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useEmojiData } from "@/lib/hooks/use-emoji-data"
import { useDemoLoader } from "@/lib/hooks/use-demo-loader"
import { useTrack } from "@/lib/hooks/use-track"

const PAGES = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Usage", url: "/reactions", icon: Activity },
  { title: "Leaderboard", url: "/leaderboard", icon: Trophy },
  { title: "Visualizations", url: "/visualizations", icon: BarChart3 },
  { title: "Explorer", url: "/explorer", icon: Images },
  { title: "My Emojis", url: "/my-emojis", icon: UserCircle },
  { title: "Create Emoji", url: "/create", icon: ImagePlus },
  { title: "Wrapped", url: "/wrapped", icon: Gift },
  { title: "Settings", url: "/settings", icon: Settings },
]

const MAX_EMOJI_RESULTS = 8

/** Event that opens the palette from anywhere (e.g. the header search button). */
export const OPEN_COMMAND_PALETTE_EVENT = "open-command-palette"

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))
}

/**
 * Global Cmd/Ctrl+K palette: jump to any page, search the workspace's
 * emojis and copy their :name: code, toggle the theme, or load demo data.
 * Filtering is done manually (shouldFilter={false}) so thousands of emojis
 * are never mounted as items — only the top matches for the current query.
 */
export function CommandPalette() {
  const router = useRouter()
  const track = useTrack()
  const { resolvedTheme, setTheme } = useTheme()
  const { emojiData, hasRealData } = useEmojiData()
  const { loadDemoData, isLoadingDemo } = useDemoLoader({ source: "command-palette" })

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => {
          if (!prev) track("Command Palette: Opened")
          return !prev
        })
      }
    }
    const onOpenEvent = () => {
      track("Command Palette: Opened")
      setOpen(true)
    }
    // Capture phase so the palette wins over page-level Cmd+K handlers.
    window.addEventListener("keydown", onKeyDown, { capture: true })
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent)
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent)
    }
  }, [track])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) setQuery("")
  }, [])

  const normalizedQuery = query.trim().toLowerCase()

  const pageMatches = useMemo(() => {
    if (!normalizedQuery) return PAGES
    return PAGES.filter((p) => p.title.toLowerCase().includes(normalizedQuery))
  }, [normalizedQuery])

  const emojiMatches = useMemo(() => {
    if (normalizedQuery.length < 2 || emojiData.length === 0) return []
    const starts: typeof emojiData = []
    const contains: typeof emojiData = []
    for (const emoji of emojiData) {
      if (emoji.is_alias) continue
      const name = emoji.name.toLowerCase()
      if (name.startsWith(normalizedQuery)) {
        starts.push(emoji)
      } else if (name.includes(normalizedQuery)) {
        contains.push(emoji)
      }
      if (starts.length >= MAX_EMOJI_RESULTS) break
    }
    return [...starts, ...contains].slice(0, MAX_EMOJI_RESULTS)
  }, [normalizedQuery, emojiData])

  const runAndClose = useCallback((fn: () => void) => {
    setOpen(false)
    setQuery("")
    fn()
  }, [])

  const copyEmojiCode = useCallback(
    async (name: string) => {
      try {
        await navigator.clipboard.writeText(`:${name}:`)
        toast.success(`Copied :${name}:`)
      } catch {
        toast.error("Couldn't copy to clipboard")
      }
      track("Command Palette: Copy Emoji", { name })
    },
    [track]
  )

  const themeActionMatches =
    !normalizedQuery || "toggle theme dark light mode".includes(normalizedQuery)
  const demoActionMatches =
    !hasRealData && (!normalizedQuery || "try demo data load sample".includes(normalizedQuery))

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Command palette"
      description="Jump to a page, search emojis, or run an action"
    >
      <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search emojis or jump to a page…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {emojiMatches.length > 0 && (
          <CommandGroup heading="Emojis — Enter to copy">
            {emojiMatches.map((emoji) => (
              <CommandItem
                key={emoji.name}
                value={`emoji-${emoji.name}`}
                onSelect={() => runAndClose(() => copyEmojiCode(emoji.name))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={emoji.url}
                  alt=""
                  loading="lazy"
                  className="h-5 w-5 object-contain"
                />
                <span className="font-mono text-sm">:{emoji.name}:</span>
                {emoji.user_display_name && (
                  <span className="ml-auto text-xs text-muted-foreground truncate max-w-32">
                    {emoji.user_display_name}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {pageMatches.length > 0 && (
          <>
            {emojiMatches.length > 0 && <CommandSeparator />}
            <CommandGroup heading="Pages">
              {pageMatches.map((page) => (
                <CommandItem
                  key={page.url}
                  value={`page-${page.url}`}
                  onSelect={() =>
                    runAndClose(() => {
                      track("Command Palette: Navigate", { to: page.url })
                      router.push(page.url)
                    })
                  }
                >
                  <page.icon className="h-4 w-4" aria-hidden="true" />
                  {page.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {(themeActionMatches || demoActionMatches) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Actions">
              {themeActionMatches && (
                <CommandItem
                  value="action-toggle-theme"
                  onSelect={() =>
                    runAndClose(() => {
                      const next = resolvedTheme === "dark" ? "light" : "dark"
                      setTheme(next)
                      track("Command Palette: Toggle Theme", { to: next })
                    })
                  }
                >
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                  Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
                </CommandItem>
              )}
              {demoActionMatches && (
                <CommandItem
                  value="action-load-demo"
                  disabled={isLoadingDemo}
                  onSelect={() => runAndClose(() => void loadDemoData())}
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Try demo data
                </CommandItem>
              )}
            </CommandGroup>
          </>
        )}
      </CommandList>
      </Command>
    </CommandDialog>
  )
}
