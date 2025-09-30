"use client"

/**
 * Pack Browser Component
 * Browse and select emojis from external packs (Slackmojis, etc.)
 * Based on iOS SlackmojisPickerView patterns
 *
 * Now refactored for composability - can be embedded directly into pages
 */

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { Variants } from "framer-motion"
import { Search, Grid3x3, List, Loader2, Download, X, CheckCircle2, AlertCircle, Edit2, Send, TrendingUp, Clock, Laugh, Cat, Bird, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { toast } from "sonner"
import { packDiscovery } from "@/lib/services/pack-discovery"
import type { PackEmoji } from "@/lib/types/emoji-pack"
import { cn } from "@/lib/utils"
import { isEmojiNameAvailable } from "@/lib/services/emoji-service"

type Tab = "popular" | "recent" | "memes" | "blobcats" | "partyparrots" | "bufo"
type NameStatus = "checking" | "available" | "taken"

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

  // Pack data
  const [popularEmojis, setPopularEmojis] = useState<PackEmoji[]>([])
  const [recentEmojis, setRecentEmojis] = useState<PackEmoji[]>([])
  const [memesEmojis, setMemesEmojis] = useState<PackEmoji[]>([])
  const [blobcatsEmojis, setBlobcatsEmojis] = useState<PackEmoji[]>([])
  const [partyparrotsEmojis, setPartyparrotsEmojis] = useState<PackEmoji[]>([])
  const [bufoEmojis, setBufoEmojis] = useState<PackEmoji[]>([])
  const [searchResults, setSearchResults] = useState<PackEmoji[]>([])
  const [loading, setLoading] = useState(false)

  // Name availability status for selected emojis
  const [nameStatuses, setNameStatuses] = useState<Map<string, NameStatus>>(new Map())
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [customNames, setCustomNames] = useState<Map<string, string>>(new Map()) // Track edited names

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
    }
  }

  const currentEmojis = useMemo(() => {
    if (searchQuery.trim()) return searchResults
    if (selectedTab === "popular") return popularEmojis
    if (selectedTab === "recent") return recentEmojis
    if (selectedTab === "memes") return memesEmojis
    if (selectedTab === "blobcats") return blobcatsEmojis
    if (selectedTab === "partyparrots") return partyparrotsEmojis
    if (selectedTab === "bufo") return bufoEmojis
    return []
  }, [selectedTab, searchQuery, popularEmojis, recentEmojis, memesEmojis, blobcatsEmojis, partyparrotsEmojis, bufoEmojis, searchResults])

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
    nameStatuses,
    editingName,
    setEditingName,
    editingValue,
    setEditingValue,
    customNames,
    saveCustomName,
    getEffectiveName,
    clearSelectionsAndStorage,

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
}

export function PackBrowserTabs({ selectedTab, onSelectTab, searchQuery }: PackBrowserTabsProps) {
  if (searchQuery) return null

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        <Button
          variant={selectedTab === "popular" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelectTab("popular")}
          className="rounded-full"
        >
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          Popular · Slackmojis
        </Button>
        <Button
          variant={selectedTab === "recent" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelectTab("recent")}
          className="rounded-full"
        >
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          Recent · Slackmojis
        </Button>
        <Button
          variant={selectedTab === "memes" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelectTab("memes")}
          className="rounded-full"
        >
          <Laugh className="h-3.5 w-3.5 mr-1.5" />
          Memes
        </Button>
        <Button
          variant={selectedTab === "blobcats" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelectTab("blobcats")}
          className="rounded-full"
        >
          <Cat className="h-3.5 w-3.5 mr-1.5" />
          Blob Cats
        </Button>
        <Button
          variant={selectedTab === "partyparrots" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelectTab("partyparrots")}
          className="rounded-full"
        >
          <Bird className="h-3.5 w-3.5 mr-1.5" />
          Party Parrots
        </Button>
        <Button
          variant={selectedTab === "bufo" ? "default" : "secondary"}
          size="sm"
          onClick={() => onSelectTab("bufo")}
          className="rounded-full"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Bufo
        </Button>
      </div>
    </ScrollArea>
  )
}

interface PackEmojiGridProps {
  emojis: PackEmoji[]
  loading: boolean
  viewMode: "grid" | "list"
  selectedIds: Set<string>
  onToggleSelection: (emoji: PackEmoji) => void
}

export function PackEmojiGrid({ emojis, loading, viewMode, selectedIds, onToggleSelection }: PackEmojiGridProps) {
  if (loading && emojis.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (emojis.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No emojis found
      </div>
    )
  }

  const isGridView = viewMode === "grid"

  return (
    <AnimatePresence mode="wait">
      {isGridView ? (
        <motion.div
          key="grid"
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4"
          variants={gridContainerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          layout
        >
          <AnimatePresence mode="popLayout">
            {emojis.map((emoji, index) => {
              const key = `${emoji.id}|${emoji.name}`
              const isSelected = selectedIds.has(key)

              return (
                <motion.button
                  type="button"
                  layout
                  key={key}
                  variants={gridItemVariants}
                  initial="hidden"
                  animate="enter"
                  exit="exit"
                  transition={{ delay: Math.min(index * 0.025, 0.25) }}
                  onClick={() => onToggleSelection(emoji)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all hover:border-primary/50 hover:bg-accent/50",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted/30"
                  )}
                >
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <img
                      src={emoji.imageURL}
                      alt={emoji.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    <motion.div
                      layout
                      className={cn(
                        "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-muted-foreground/30"
                      )}
                    >
                      {isSelected && "✓"}
                    </motion.div>
                  </div>
                  <span className="text-[10px] text-center text-muted-foreground line-clamp-2 w-full leading-tight">
                    {emoji.name}
                  </span>
                </motion.button>
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
        >
          <AnimatePresence mode="popLayout">
            {emojis.map((emoji, index) => {
              const key = `${emoji.id}|${emoji.name}`
              const isSelected = selectedIds.has(key)

              return (
                <motion.button
                  type="button"
                  layout
                  key={key}
                  variants={listItemVariants}
                  initial="hidden"
                  animate="enter"
                  exit="exit"
                  transition={{ delay: Math.min(index * 0.02, 0.18) }}
                  onClick={() => onToggleSelection(emoji)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:border-primary/50",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted"
                  )}
                >
                  <img
                    src={emoji.imageURL}
                    alt={emoji.name}
                    className="w-12 h-12 object-contain"
                    loading="lazy"
                  />
                  <span className="flex-1 text-left font-medium">
                    :{emoji.name}:
                  </span>
                  {isSelected && (
                    <motion.div
                      layout
                      className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold"
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.button>
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
          <h3 className="font-semibold text-sm">Selected Emojis</h3>
          {selectedEmojis.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedEmojis.length}/{maxSelection} selected
        </p>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-4">
        {selectedEmojis.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <Download className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">No emojis selected</p>
            <p className="text-xs">Click emojis to add them here</p>
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
                      "flex w-full items-center gap-3 px-3 py-2 rounded-lg bg-background border transition-all group min-w-0 overflow-hidden",
                      hasNameChecking && status === "taken" && "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20",
                      hasNameChecking && status === "available" && "border-green-500/30"
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
                          className="h-6 w-full min-w-0 max-w-full text-xs font-mono"
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
                            className="group/name flex-shrink-0"
                          >
                            <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hasNameChecking && status === "checking" && (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      {hasNameChecking && status === "available" && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                      {hasNameChecking && status === "taken" && (
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 cursor-help" />
                          </HoverCardTrigger>
                          <HoverCardContent className="w-64 text-xs">
                            This name is already taken in your workspace. Click the pencil to edit it before continuing.
                          </HoverCardContent>
                        </HoverCard>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemove(emoji)}
                      >
                        <X className="h-4 w-4" />
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
            className="w-full"
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>

          <Button
            onClick={onSendToSlack}
            disabled={!canSendToSlack || !!uploadProgress}
            className="w-full"
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