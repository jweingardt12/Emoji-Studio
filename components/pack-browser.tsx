"use client"

/**
 * Pack Browser Component
 * Browse and select emojis from external packs (Slackmojis, etc.)
 * Based on iOS SlackmojisPickerView patterns
 *
 * Now refactored for composability - can be embedded directly into pages
 *
 * Improvements:
 * - Full keyboard navigation (arrow keys, Enter, Escape)
 * - ARIA labels for accessibility
 * - Larger tap targets for mobile (44x44px minimum)
 * - Loading states with visual feedback
 * - Favorites system with localStorage persistence
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import { Search, Grid3x3, List, Loader2, Download, X, CheckCircle2, AlertCircle, Edit2, Send, TrendingUp, Clock, Laugh, Cat, Bird, Sparkles, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { toast } from "sonner"
import { packDiscovery } from "@/lib/services/pack-discovery"
import type { PackEmoji } from "@/lib/types/emoji-pack"
import { cn } from "@/lib/utils"
import { isEmojiNameAvailable } from "@/lib/services/emoji-service"

type Tab = "favorites" | "popular" | "recent" | "memes" | "blobcats" | "partyparrots" | "bufo"
type NameStatus = "checking" | "available" | "taken"

// Favorites storage key
const FAVORITES_STORAGE_KEY = "emoji-pack-favorites"

// Load favorites from localStorage
const loadFavorites = (): Set<string> => {
  if (typeof window === "undefined") return new Set()
  try {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (saved) {
      return new Set(JSON.parse(saved))
    }
  } catch (error) {
    console.error("Failed to load favorites:", error)
  }
  return new Set()
}

// Save favorites to localStorage
const saveFavorites = (favorites: Set<string>) => {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)))
  } catch (error) {
    console.error("Failed to save favorites:", error)
  }
}

const gridContainerVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
}

const gridItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  enter: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -12,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
}

const listContainerVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.16, ease: 'easeIn' as const },
  },
}

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: 12 },
  enter: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: 0.16, ease: 'easeIn' as const },
  },
}

// Custom hook for pack browser state management
export function usePackBrowser(maxSelection: number = 20, existingEmojis: any[] = []) {
  const [selectedTab, setSelectedTab] = useState<Tab>("popular")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSearching, setIsSearching] = useState(false)

  // Pack data
  const [popularEmojis, setPopularEmojis] = useState<PackEmoji[]>([])
  const [recentEmojis, setRecentEmojis] = useState<PackEmoji[]>([])
  const [memesEmojis, setMemesEmojis] = useState<PackEmoji[]>([])
  const [blobcatsEmojis, setBlobcatsEmojis] = useState<PackEmoji[]>([])
  const [partyparrotsEmojis, setPartyparrotsEmojis] = useState<PackEmoji[]>([])
  const [bufoEmojis, setBufoEmojis] = useState<PackEmoji[]>([])
  const [searchResults, setSearchResults] = useState<PackEmoji[]>([])
  const [loading, setLoading] = useState(false)

  // Favorites
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => loadFavorites())
  const [favoriteEmojis, setFavoriteEmojis] = useState<PackEmoji[]>([])

  // Name availability status for selected emojis
  const [nameStatuses, setNameStatuses] = useState<Map<string, NameStatus>>(new Map())
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [customNames, setCustomNames] = useState<Map<string, string>>(new Map()) // Track edited names

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Load initial packs and restore selections
  useEffect(() => {
    loadPacks()

    // Restore selections from localStorage
    try {
      const savedSelections = localStorage.getItem('pack-browser-selections')
      if (savedSelections) {
        const { ids, customNames: savedCustomNames } = JSON.parse(savedSelections)
        if (ids && Array.isArray(ids)) {
          setSelectedIds(new Set(ids))
        }
        if (savedCustomNames) {
          setCustomNames(new Map(Object.entries(savedCustomNames)))
        }
      }
    } catch (error) {
      console.error('Failed to restore selections:', error)
    }
  }, [])

  // Save selections to localStorage whenever they change
  useEffect(() => {
    try {
      const data = {
        ids: Array.from(selectedIds),
        customNames: Object.fromEntries(customNames)
      }
      localStorage.setItem('pack-browser-selections', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save selections:', error)
    }
  }, [selectedIds, customNames])

  // Load pack when tab changes
  useEffect(() => {
    loadPackForTab(selectedTab)
  }, [selectedTab])

  // Check name availability for selected emojis, including edits
  useEffect(() => {
    const selectedEmojis = getSelectedEmojis()

    if (selectedEmojis.length === 0) {
      setNameStatuses(new Map())
      return
    }

    const currentKeys = new Set(selectedEmojis.map((e) => `${e.id}|${e.name}`))

    // Skip name checking if no workspace/emojis are connected
    if (!existingEmojis || existingEmojis.length === 0) {
      setNameStatuses(new Map())
      return
    }

    // Reset to checking while we validate (ensures re-check after edits)
    setNameStatuses(() => {
      const next = new Map<string, NameStatus>()
      selectedEmojis.forEach((emoji) => {
        const key = `${emoji.id}|${emoji.name}`
        next.set(key, "checking")
      })
      return next
    })

    let cancelled = false

    const checkNames = async () => {
      await Promise.all(
        selectedEmojis.map(async (emoji) => {
          const key = `${emoji.id}|${emoji.name}`
          const displayName = customNames.get(key) || emoji.name

          try {
            const available = await isEmojiNameAvailable(displayName, existingEmojis)
            if (cancelled) return

            setNameStatuses((prev) => {
              if (!currentKeys.has(key)) return prev
              const next = new Map(prev)
              next.set(key, available ? "available" : "taken")
              return next
            })
          } catch (error) {
            console.error(`Failed to check ${displayName}:`, error)
            if (cancelled) return

            setNameStatuses((prev) => {
              if (!currentKeys.has(key)) return prev
              const next = new Map(prev)
              next.set(key, "available")
              return next
            })
          }
        })
      )
    }

    checkNames()

    return () => {
      cancelled = true
    }
  }, [selectedIds, existingEmojis, customNames])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadPacks = async () => {
    setLoading(true)
    try {
      const popular = await packDiscovery.fetchSlackmojisPopular()
      setPopularEmojis(popular)
    } catch (error) {
      toast.error("Failed to load emoji packs")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadPackForTab = async (tab: Tab) => {
    if (tab === "popular" && popularEmojis.length > 0) return
    if (tab === "recent" && recentEmojis.length > 0) return
    if (tab === "memes" && memesEmojis.length > 0) return
    if (tab === "blobcats" && blobcatsEmojis.length > 0) return
    if (tab === "partyparrots" && partyparrotsEmojis.length > 0) return
    if (tab === "bufo" && bufoEmojis.length > 0) return

    setLoading(true)
    try {
      let emojis: PackEmoji[] = []
      switch (tab) {
        case "popular":
          emojis = await packDiscovery.fetchSlackmojisPopular()
          setPopularEmojis(emojis)
          break
        case "recent":
          emojis = await packDiscovery.fetchSlackmojisRecent()
          setRecentEmojis(emojis)
          break
        case "memes":
          emojis = await packDiscovery.fetchSlackmojisMemes()
          setMemesEmojis(emojis)
          break
        case "blobcats":
          emojis = await packDiscovery.fetchSlackmojisBlobCats()
          setBlobcatsEmojis(emojis)
          break
        case "partyparrots":
          emojis = await packDiscovery.fetchSlackmojisPartyParrots()
          setPartyparrotsEmojis(emojis)
          break
        case "bufo":
          emojis = await packDiscovery.fetchBufo()
          setBufoEmojis(emojis)
          break
      }
    } catch (error) {
      toast.error(`Failed to load ${tab} pack`)
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const performSearch = async (query: string) => {
    setIsSearching(true)
    setLoading(true)
    try {
      // Search across all packs instead of just Slackmojis
      const results = await packDiscovery.searchAllPacks(query)
      setSearchResults(results || [])
    } catch (error) {
      toast.error("Search failed")
      console.error(error)
      setSearchResults([]) // Set empty array on error
    } finally {
      setLoading(false)
      setIsSearching(false)
    }
  }

  // Update favorite emojis when favorites change or packs load
  useEffect(() => {
    const allEmojis = [
      ...popularEmojis,
      ...recentEmojis,
      ...memesEmojis,
      ...blobcatsEmojis,
      ...partyparrotsEmojis,
      ...bufoEmojis,
    ]

    const favs = allEmojis.filter((emoji) => {
      const key = `${emoji.id}|${emoji.name}`
      return favoriteIds.has(key)
    })

    // Deduplicate
    const seen = new Set<string>()
    const uniqueFavs = favs.filter((emoji) => {
      const key = `${emoji.id}|${emoji.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setFavoriteEmojis(uniqueFavs)
  }, [favoriteIds, popularEmojis, recentEmojis, memesEmojis, blobcatsEmojis, partyparrotsEmojis, bufoEmojis])

  // Toggle favorite
  const toggleFavorite = useCallback((emoji: PackEmoji) => {
    const key = `${emoji.id}|${emoji.name}`
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        toast.success(`Removed from favorites`)
      } else {
        next.add(key)
        toast.success(`Added to favorites`)
      }
      saveFavorites(next)
      return next
    })
  }, [])

  // Check if emoji is favorited
  const isFavorite = useCallback((emoji: PackEmoji): boolean => {
    const key = `${emoji.id}|${emoji.name}`
    return favoriteIds.has(key)
  }, [favoriteIds])

  const currentEmojis = useMemo(() => {
    if (searchQuery.trim()) return searchResults
    if (selectedTab === "favorites") return favoriteEmojis
    if (selectedTab === "popular") return popularEmojis
    if (selectedTab === "recent") return recentEmojis
    if (selectedTab === "memes") return memesEmojis
    if (selectedTab === "blobcats") return blobcatsEmojis
    if (selectedTab === "partyparrots") return partyparrotsEmojis
    if (selectedTab === "bufo") return bufoEmojis
    return []
  }, [selectedTab, searchQuery, popularEmojis, recentEmojis, memesEmojis, blobcatsEmojis, partyparrotsEmojis, bufoEmojis, searchResults, favoriteEmojis])

  const toggleSelection = (emoji: PackEmoji) => {
    const key = `${emoji.id}|${emoji.name}`
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        if (next.size >= maxSelection) {
          toast.error(`Maximum ${maxSelection} emojis per selection`)
          return prev
        }
        next.add(key)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setNameStatuses(new Map())
  }

  const getSelectedEmojis = (): PackEmoji[] => {
    const allEmojis = [
      ...popularEmojis,
      ...recentEmojis,
      ...memesEmojis,
      ...blobcatsEmojis,
      ...partyparrotsEmojis,
      ...bufoEmojis,
      ...searchResults,
    ]

    const seen = new Set<string>()

    return allEmojis.filter((emoji) => {
      const key = `${emoji.id}|${emoji.name}`
      if (!selectedIds.has(key) || seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  const removeFromSelection = (emoji: PackEmoji) => {
    const key = `${emoji.id}|${emoji.name}`
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  // Function to save a custom name
  const saveCustomName = (key: string, newName: string) => {
    if (newName && newName !== key.split('|')[1]) {
      setCustomNames(prev => {
        const next = new Map(prev)
        next.set(key, newName)
        return next
      })
    }
  }

  // Function to get the effective name (custom or original)
  const getEffectiveName = (emoji: PackEmoji): string => {
    const key = `${emoji.id}|${emoji.name}`
    return customNames.get(key) || emoji.name
  }

  // Clear selections and localStorage
  const clearSelectionsAndStorage = () => {
    setSelectedIds(new Set())
    setCustomNames(new Map())
    try {
      localStorage.removeItem('pack-browser-selections')
    } catch (error) {
      console.error('Failed to clear selections from localStorage:', error)
    }
  }

  return {
    // State
    selectedTab,
    setSelectedTab,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    selectedIds,
    currentEmojis,
    loading,
    isSearching,
    nameStatuses,
    editingName,
    setEditingName,
    editingValue,
    setEditingValue,
    customNames,
    saveCustomName,
    getEffectiveName,
    clearSelectionsAndStorage,

    // Favorites
    favoriteIds,
    favoriteEmojis,
    toggleFavorite,
    isFavorite,

    // Keyboard navigation
    focusedIndex,
    setFocusedIndex,

    // Computed
    selectedEmojis: getSelectedEmojis(),

    // Actions
    toggleSelection,
    clearSelection,
    removeFromSelection,
    getSelectedEmojis,
  }
}

// Composable components

interface PackBrowserTabsProps {
  selectedTab: Tab
  onSelectTab: (tab: Tab) => void
  searchQuery: string
  favoritesCount?: number
}

export function PackBrowserTabs({ selectedTab, onSelectTab, searchQuery, favoritesCount = 0 }: PackBrowserTabsProps) {
  if (searchQuery) return null

  const tabs: { id: Tab; label: string; emoji: string; badge?: number }[] = [
    { id: "favorites", label: "Favorites", emoji: "❤️", badge: favoritesCount },
    { id: "popular", label: "Popular", emoji: "🔥" },
    { id: "recent", label: "Recent", emoji: "🕒" },
    { id: "memes", label: "Memes", emoji: "😂" },
    { id: "blobcats", label: "Blob Cats", emoji: "🐱" },
    { id: "partyparrots", label: "Parrots", emoji: "🦜" },
    { id: "bufo", label: "Bufo", emoji: "🐸" },
  ]

  return (
    <div
      className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar"
      role="tablist"
      aria-label="Emoji pack categories"
    >
      <div className="flex p-1 bg-muted/50 rounded-xl w-max min-w-full sm:min-w-0">
        {tabs.map((tab) => {
          const isSelected = selectedTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              role="tab"
              aria-selected={isSelected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[44px]",
                isSelected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {isSelected && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm border border-border/50"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-base leading-none">{tab.emoji}</span>
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-primary/20 text-primary rounded-full">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface PackEmojiGridProps {
  emojis: PackEmoji[]
  loading: boolean
  viewMode: "grid" | "list"
  selectedIds: Set<string>
  onToggleSelection: (emoji: PackEmoji) => void
  onToggleFavorite?: (emoji: PackEmoji) => void
  isFavorite?: (emoji: PackEmoji) => boolean
  isSearching?: boolean
  focusedIndex?: number
  onFocusedIndexChange?: (index: number) => void
}

export function PackEmojiGrid({
  emojis,
  loading,
  viewMode,
  selectedIds,
  onToggleSelection,
  onToggleFavorite,
  isFavorite,
  isSearching = false,
  focusedIndex = -1,
  onFocusedIndexChange
}: PackEmojiGridProps) {
  const isGridView = viewMode === "grid"
  const gridRef = useRef<HTMLDivElement>(null)

  // Calculate columns for keyboard navigation
  const getColumnsCount = () => {
    if (!isGridView) return 1
    // Match the grid classes
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1280) return 6
      if (window.innerWidth >= 768) return 5
      if (window.innerWidth >= 640) return 4
      return 3
    }
    return 4
  }

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!onFocusedIndexChange) return

    const cols = getColumnsCount()
    const total = emojis.length

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault()
        onFocusedIndexChange(Math.min(focusedIndex + 1, total - 1))
        break
      case "ArrowLeft":
        e.preventDefault()
        onFocusedIndexChange(Math.max(focusedIndex - 1, 0))
        break
      case "ArrowDown":
        e.preventDefault()
        onFocusedIndexChange(Math.min(focusedIndex + cols, total - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        onFocusedIndexChange(Math.max(focusedIndex - cols, 0))
        break
      case "Enter":
      case " ":
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < total) {
          onToggleSelection(emojis[focusedIndex])
        }
        break
      case "f":
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < total && onToggleFavorite) {
          onToggleFavorite(emojis[focusedIndex])
        }
        break
      case "Home":
        e.preventDefault()
        onFocusedIndexChange(0)
        break
      case "End":
        e.preventDefault()
        onFocusedIndexChange(total - 1)
        break
    }
  }, [emojis, focusedIndex, onFocusedIndexChange, onToggleSelection, onToggleFavorite])

  // Show searching indicator
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="font-medium">Searching...</p>
      </div>
    )
  }

  if (loading && emojis.length === 0) {
    return (
      <div className={cn(
        "grid gap-4",
        isGridView
          ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6"
          : "grid-cols-1"
      )}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse bg-muted/50 rounded-xl",
              isGridView ? "aspect-square" : "h-16"
            )}
          />
        ))}
      </div>
    )
  }

  if (emojis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 opacity-50" />
        </div>
        <p className="font-medium">No emojis found</p>
        <p className="text-sm opacity-70">Try searching for something else</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {isGridView ? (
        <motion.div
          ref={gridRef}
          key="grid"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 p-1"
          variants={gridContainerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          layout
          role="grid"
          aria-label="Emoji grid"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <AnimatePresence mode="popLayout">
            {emojis.map((emoji, index) => {
              const key = `${emoji.id}|${emoji.name}`
              const isSelected = selectedIds.has(key)
              const isFav = isFavorite?.(emoji) ?? false
              const isFocused = index === focusedIndex

              return (
                <motion.div
                  layout
                  key={key}
                  variants={gridItemVariants}
                  initial="hidden"
                  animate="enter"
                  exit="exit"
                  transition={{ delay: Math.min(index * 0.025, 0.25) }}
                  role="gridcell"
                  className={cn(
                    "group relative flex flex-col items-center justify-center aspect-square rounded-xl border transition-all duration-200 min-h-[80px]",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
                      : "border-transparent bg-card hover:bg-accent/50 hover:border-border hover:shadow-sm",
                    isFocused && "ring-2 ring-ring ring-offset-2"
                  )}
                >
                  {/* Main click area - minimum 44x44 tap target */}
                  <button
                    type="button"
                    onClick={() => onToggleSelection(emoji)}
                    aria-label={`Select emoji ${emoji.name}${isSelected ? " (selected)" : ""}`}
                    aria-pressed={isSelected}
                    className="absolute inset-0 w-full h-full min-h-[44px] min-w-[44px] z-10 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />

                  {/* Favorite button - 44x44 tap target */}
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite(emoji)
                      }}
                      aria-label={isFav ? `Remove ${emoji.name} from favorites` : `Add ${emoji.name} to favorites`}
                      aria-pressed={isFav}
                      className={cn(
                        "absolute top-0 left-0 w-11 h-11 flex items-center justify-center z-20 transition-all duration-200 rounded-tl-xl",
                        isFav
                          ? "text-red-500"
                          : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      )}
                    >
                      <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
                    </button>
                  )}

                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 mb-6 pointer-events-none">
                    <img
                      src={emoji.imageURL}
                      alt=""
                      className="max-w-full max-h-full object-contain drop-shadow-sm"
                      loading="lazy"
                    />
                  </div>

                  <div className={cn(
                    "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200 shadow-sm z-10 pointer-events-none",
                    isSelected
                      ? "bg-primary text-primary-foreground scale-100 opacity-100"
                      : "bg-muted text-muted-foreground scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                  )}>
                    {isSelected ? <CheckCircle2 className="w-4 h-4" /> : "+"}
                  </div>

                  <div className="absolute bottom-2 left-1 right-1 pointer-events-none">
                    <p className="text-[10px] text-center text-muted-foreground font-medium truncate px-1.5 py-0.5 bg-muted/30 rounded-md">
                      :{emoji.name}:
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          key="list"
          className="space-y-2"
          variants={listContainerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          layout
          role="listbox"
          aria-label="Emoji list"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <AnimatePresence mode="popLayout">
            {emojis.map((emoji, index) => {
              const key = `${emoji.id}|${emoji.name}`
              const isSelected = selectedIds.has(key)
              const isFav = isFavorite?.(emoji) ?? false
              const isFocused = index === focusedIndex

              return (
                <motion.div
                  layout
                  key={key}
                  variants={listItemVariants}
                  initial="hidden"
                  animate="enter"
                  exit="exit"
                  transition={{ delay: Math.min(index * 0.02, 0.18) }}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "group w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-200 min-h-[56px]",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent bg-card hover:border-border hover:shadow-sm",
                    isFocused && "ring-2 ring-ring ring-offset-2"
                  )}
                >
                  {/* Favorite button - 44x44 tap target */}
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleFavorite(emoji)
                      }}
                      aria-label={isFav ? `Remove ${emoji.name} from favorites` : `Add ${emoji.name} to favorites`}
                      aria-pressed={isFav}
                      className={cn(
                        "w-11 h-11 flex items-center justify-center transition-all duration-200 rounded-lg flex-shrink-0",
                        isFav
                          ? "text-red-500"
                          : "text-muted-foreground/40 hover:text-red-500"
                      )}
                    >
                      <Heart className={cn("w-5 h-5", isFav && "fill-current")} />
                    </button>
                  )}

                  {/* Main click area */}
                  <button
                    type="button"
                    onClick={() => onToggleSelection(emoji)}
                    aria-label={`Select emoji ${emoji.name}${isSelected ? " (selected)" : ""}`}
                    className="flex-1 flex items-center gap-4 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                  >
                    <div className="w-11 h-11 flex items-center justify-center bg-muted/30 rounded-lg flex-shrink-0">
                      <img
                        src={emoji.imageURL}
                        alt=""
                        className="w-8 h-8 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="flex-1 text-left font-medium text-sm">
                      :{emoji.name}:
                    </span>
                  </button>

                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground/30"
                  )}>
                    {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface PackSelectionSidebarProps {
  selectedEmojis: PackEmoji[]
  maxSelection: number
  nameStatuses: Map<string, NameStatus>
  editingName: string | null
  editingValue: string
  onSetEditingName: (name: string | null) => void
  onSetEditingValue: (value: string) => void
  onSaveCustomName?: (key: string, newName: string) => void
  customNames?: Map<string, string>
  onRemove: (emoji: PackEmoji) => void
  onClear: () => void
  onDownload: () => void
  onSendToSlack?: () => void
  hasSlackConnection?: boolean
  downloadProgress?: {
    stage: "downloading" | "finalizing"
    completed: number
    total: number
  } | null
  uploadProgress?: {
    completed: number
    failed: number
    total: number
    stage: "uploading" | "complete"
  } | null
  isDemoMode?: boolean
}

export function PackSelectionSidebar({
  selectedEmojis,
  maxSelection,
  nameStatuses,
  editingName,
  editingValue,
  onSetEditingName,
  onSetEditingValue,
  onSaveCustomName,
  customNames,
  onRemove,
  onClear,
  onDownload,
  onSendToSlack,
  hasSlackConnection = false,
  downloadProgress,
  uploadProgress,
  isDemoMode = false,
}: PackSelectionSidebarProps) {
  const hasNameChecking = nameStatuses.size > 0
  const takenCount = Array.from(nameStatuses.values()).filter((s) => s === "taken").length
  const checkingCount = Array.from(nameStatuses.values()).filter((s) => s === "checking").length
  // Allow download if: has emojis
  const canDownload = selectedEmojis.length > 0
  // Allow send to Slack if: has emojis AND has connection AND (no name checking OR all names are available)
  const canSendToSlack = selectedEmojis.length > 0 && hasSlackConnection && (!hasNameChecking || (takenCount === 0 && checkingCount === 0))

  return (
    <div className="w-full h-full flex flex-col min-h-0 xl:rounded-xl xl:border xl:shadow bg-card">
      <div className="p-4 sm:p-5 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm" id="selected-emojis-heading">Selected Emojis</h3>
          {selectedEmojis.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-9 min-w-[80px] text-xs"
              aria-label="Clear all selected emojis"
            >
              Clear All
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {selectedEmojis.length}/{maxSelection} selected
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-4">
        {selectedEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground p-4">
            <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 rotate-3">
              <Sparkles className="h-10 w-10 opacity-20" />
            </div>
            <h4 className="font-medium text-foreground mb-1">No emojis selected</h4>
            <p className="text-xs max-w-[200px]">
              Browse the packs and click on emojis to add them to your collection
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {selectedEmojis.map((emoji, index) => {
                const key = `${emoji.id}|${emoji.name}`
                const status = nameStatuses.get(key)
                const isEditing = editingName === key
                const hasNameChecking = nameStatuses.size > 0

                return (
                  <motion.div
                    layout
                    key={key}
                    variants={listItemVariants}
                    initial="hidden"
                    animate="enter"
                    exit="exit"
                    transition={{ delay: Math.min(index * 0.03, 0.2) }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group min-w-0 overflow-hidden bg-card shadow-sm hover:shadow-md hover:border-primary/20",
                      hasNameChecking && status === "taken" && "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20",
                      hasNameChecking && status === "available" && "border-green-500/30 bg-green-50/10"
                    )}
                  >
                    <img
                      src={emoji.imageURL}
                      alt={emoji.name}
                      className="w-12 h-12 object-contain flex-shrink-0"
                      loading="lazy"
                    />

                    <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={editingValue}
                          onChange={(e) => {
                            const sanitized = e.target.value
                              .toLowerCase()
                              .replace(/\s+/g, "-")
                              .replace(/_/g, "-")
                              .replace(/[^a-z0-9-]/g, "")
                            onSetEditingValue(sanitized)
                          }}
                          onBlur={() => {
                            if (editingValue && onSaveCustomName) {
                              onSaveCustomName(key, editingValue)
                            }
                            onSetEditingName(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editingValue && onSaveCustomName) {
                                onSaveCustomName(key, editingValue)
                              }
                              onSetEditingName(null)
                            }
                            if (e.key === "Escape") {
                              onSetEditingName(null)
                              onSetEditingValue("")
                            }
                          }}
                          className="h-9 w-full min-w-0 max-w-full text-xs font-mono"
                          aria-label={`Edit name for ${emoji.name}`}
                        />
                      ) : (
                        <>
                          <span
                            className="flex-1 min-w-0 break-all text-xs font-mono leading-snug"
                            title={customNames?.get(key) || emoji.name}
                          >
                            :{customNames?.get(key) || emoji.name}:
                          </span>
                          <button
                            onClick={() => {
                              const displayName = customNames?.get(key) || emoji.name
                              onSetEditingName(key)
                              onSetEditingValue(displayName)
                            }}
                            aria-label={`Edit name for ${emoji.name}`}
                            className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <Edit2 className="h-4 w-4 opacity-40 group-hover:opacity-70 transition-opacity" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasNameChecking && status === "checking" && (
                        <div className="w-8 h-8 flex items-center justify-center" aria-label="Checking name availability">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {hasNameChecking && status === "available" && (
                        <div className="w-8 h-8 flex items-center justify-center" aria-label="Name is available">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      )}
                      {hasNameChecking && status === "taken" && (
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <button className="w-8 h-8 flex items-center justify-center" aria-label="Name is taken - click for details">
                              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 cursor-help" />
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64 text-xs">
                            This name is already taken in your workspace. Click the pencil to edit it before continuing.
                          </HoverCardContent>
                        </HoverCard>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-11 w-11 opacity-60 hover:opacity-100 transition-opacity"
                        onClick={() => onRemove(emoji)}
                        aria-label={`Remove ${emoji.name} from selection`}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </ScrollArea>

      <div className="p-4 sm:p-5 border-t space-y-2">
        {/* Action buttons */}
        <div className="space-y-2">
          <Button
            onClick={onDownload}
            disabled={!canDownload || !!downloadProgress}
            className="w-full min-h-[44px]"
            variant="outline"
            aria-label={`Download ${selectedEmojis.length} emoji${selectedEmojis.length !== 1 ? "s" : ""} as ZIP`}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>

          <Button
            onClick={onSendToSlack}
            disabled={!canSendToSlack || !!uploadProgress}
            className="w-full min-h-[44px]"
            aria-label={`Upload ${selectedEmojis.length} emoji${selectedEmojis.length !== 1 ? "s" : ""} to Slack`}
          >
            <Send className="mr-2 h-4 w-4" />
            Send to Slack
          </Button>
        </div>

        {/* Status messages */}
        {downloadProgress && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {downloadProgress.stage === "downloading"
              ? `Downloading ${downloadProgress.completed}/${downloadProgress.total} emojis...`
              : "Finalizing download..."}
          </p>
        )}
        {uploadProgress && (
          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            {uploadProgress.stage === "complete" ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {`Upload complete! ${uploadProgress.completed}/${uploadProgress.total} emojis`}
                {uploadProgress.failed > 0 && ` (${uploadProgress.failed} failed)`}
              </>
            ) : (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {`Uploading ${uploadProgress.completed}/${uploadProgress.total} emojis`}
                {uploadProgress.failed > 0 && ` (${uploadProgress.failed} failed)`}
              </>
            )}
          </p>
        )}
        {!hasSlackConnection && selectedEmojis.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Connect Slack in{" "}
            <a href="/settings" className="underline hover:text-foreground">
              Settings
            </a>{" "}
            to upload
          </p>
        )}
        {hasNameChecking && checkingCount > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Checking {checkingCount} name{checkingCount > 1 ? "s" : ""}...
          </p>
        )}
        {hasNameChecking && takenCount > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
            {takenCount} name{takenCount > 1 ? "s" : ""} taken - edit to continue
          </p>
        )}
        {!isDemoMode && selectedEmojis.length > maxSelection && (
          <p className="text-xs text-destructive text-center">
            Please select max {maxSelection} emojis
          </p>
        )}
      </div>
    </div>
  )
}

// Original full component (kept for backwards compatibility with existing usage)
interface PackBrowserProps {
  onSelectEmojis?: (emojis: PackEmoji[]) => void
  maxSelection?: number
  isDemoMode?: boolean
}

export function PackBrowser({
  onSelectEmojis,
  maxSelection = 20,
  isDemoMode = false,
}: PackBrowserProps) {
  const packBrowser = usePackBrowser(maxSelection)

  const handleExport = () => {
    const selected = packBrowser.getSelectedEmojis()
    if (selected.length === 0) {
      toast.error("No emojis selected")
      return
    }
    onSelectEmojis?.(selected)
    packBrowser.clearSelection()
  }

  return (
    <div className="flex h-full gap-4">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-none space-y-3 pb-4">
          {/* Search and view controls */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search packs..."
                value={packBrowser.searchQuery}
                onChange={(e) => packBrowser.setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => packBrowser.setViewMode(packBrowser.viewMode === "grid" ? "list" : "grid")}
            >
              {packBrowser.viewMode === "grid" ? (
                <List className="h-4 w-4" />
              ) : (
                <Grid3x3 className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Tab chips */}
          <PackBrowserTabs
            selectedTab={packBrowser.selectedTab}
            onSelectTab={packBrowser.setSelectedTab}
            searchQuery={packBrowser.searchQuery}
          />
        </div>

        {/* Emoji grid/list */}
        <ScrollArea className="flex-1">
          <PackEmojiGrid
            emojis={packBrowser.currentEmojis}
            loading={packBrowser.loading}
            viewMode={packBrowser.viewMode}
            selectedIds={packBrowser.selectedIds}
            onToggleSelection={packBrowser.toggleSelection}
          />
        </ScrollArea>
      </div>

      {/* Selected emojis sidebar (shopping cart) */}
      <PackSelectionSidebar
        selectedEmojis={packBrowser.selectedEmojis}
        maxSelection={maxSelection}
        nameStatuses={packBrowser.nameStatuses}
        editingName={packBrowser.editingName}
        editingValue={packBrowser.editingValue}
        onSetEditingName={packBrowser.setEditingName}
        onSetEditingValue={packBrowser.setEditingValue}
        onRemove={packBrowser.removeFromSelection}
        onClear={packBrowser.clearSelection}
        onDownload={handleExport}
        hasSlackConnection={false}
        isDemoMode={isDemoMode}
      />
    </div>
  )
}