"use client"

/**
 * Pack Browser Component
 * Browse and select emojis from external packs (Slackmojis, etc.)
 * Based on iOS SlackmojisPickerView patterns
 */

import { useState, useEffect, useMemo } from "react"
import { Search, Grid3x3, List, Loader2, Download, X, CheckCircle2, AlertCircle, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { packDiscovery } from "@/lib/services/pack-discovery"
import type { PackEmoji } from "@/lib/types/emoji-pack"
import { cn } from "@/lib/utils"
import { isEmojiNameAvailable } from "@/lib/services/emoji-service"

interface PackBrowserProps {
  onSelectEmojis?: (emojis: PackEmoji[]) => void
  maxSelection?: number
  isDemoMode?: boolean
}

type Tab = "popular" | "recent" | "memes" | "blobcats" | "partyparrots" | "bufo"

export function PackBrowser({
  onSelectEmojis,
  maxSelection = 20,
  isDemoMode = false,
}: PackBrowserProps) {
  const [selectedTab, setSelectedTab] = useState<Tab>("popular")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectionMode, setSelectionMode] = useState(true) // Always on
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
  type NameStatus = "checking" | "available" | "taken"
  const [nameStatuses, setNameStatuses] = useState<Map<string, NameStatus>>(new Map())
  const [editingName, setEditingName] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState("")

  // Load initial packs
  useEffect(() => {
    loadPacks()
  }, [])

  // Load pack when tab changes
  useEffect(() => {
    loadPackForTab(selectedTab)
  }, [selectedTab])

  // Check name availability for selected emojis
  useEffect(() => {
    const selectedEmojis = getSelectedEmojis()

    // Clear statuses for deselected emojis
    const newStatuses = new Map<string, NameStatus>()

    // Check each selected emoji
    selectedEmojis.forEach(async (emoji) => {
      const key = `${emoji.id}|${emoji.name}`

      // Set to checking initially
      setNameStatuses((prev) => new Map(prev).set(key, "checking"))

      try {
        const available = await isEmojiNameAvailable(emoji.name)
        setNameStatuses((prev) => {
          const next = new Map(prev)
          next.set(key, available ? "available" : "taken")
          return next
        })
      } catch (error) {
        console.error(`Failed to check ${emoji.name}:`, error)
        setNameStatuses((prev) => {
          const next = new Map(prev)
          next.set(key, "available") // Default to available on error
          return next
        })
      }
    })
  }, [selectedIds])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      performSearch(searchQuery)
    }, 150) // 150ms debounce like iOS

    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadPacks = async () => {
    setLoading(true)
    try {
      // Load popular first (default tab)
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
    // Skip if already loaded
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
      const results = await packDiscovery.searchSlackmojis(query)
      setSearchResults(results)
    } catch (error) {
      toast.error("Search failed")
      console.error(error)
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
        if (!isDemoMode && next.size >= maxSelection) {
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
  }

  const handleExport = () => {
    const selected = getSelectedEmojis()
    if (selected.length === 0) {
      toast.error("No emojis selected")
      return
    }

    // All names are available (checked in sidebar), proceed with export
    onSelectEmojis?.(selected)

    // Clear selection
    setSelectedIds(new Set())
    setNameStatuses(new Map())
  }

  const getSelectedEmojis = (): PackEmoji[] => {
    // Get all emojis from all packs
    const allEmojis = [
      ...popularEmojis,
      ...recentEmojis,
      ...memesEmojis,
      ...blobcatsEmojis,
      ...partyparrotsEmojis,
      ...bufoEmojis,
      ...searchResults,
    ]

    return allEmojis.filter((e) => selectedIds.has(`${e.id}|${e.name}`))
  }

  const removeFromSelection = (emoji: PackEmoji) => {
    const key = `${emoji.id}|${emoji.name}`
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  const selectedEmojis = getSelectedEmojis()

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            {viewMode === "grid" ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid3x3 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Tab chips */}
        {!searchQuery && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedTab === "popular" ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTab("popular")}
                className="rounded-full"
              >
                Popular
              </Button>
              <Button
                variant={selectedTab === "recent" ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTab("recent")}
                className="rounded-full"
              >
                Recent
              </Button>
              <Button
                variant={selectedTab === "memes" ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTab("memes")}
                className="rounded-full"
              >
                Memes
              </Button>
              <Button
                variant={selectedTab === "blobcats" ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTab("blobcats")}
                className="rounded-full"
              >
                Blob Cats
              </Button>
              <Button
                variant={selectedTab === "partyparrots" ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTab("partyparrots")}
                className="rounded-full"
              >
                Party Parrots
              </Button>
              <Button
                variant={selectedTab === "bufo" ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedTab("bufo")}
                className="rounded-full"
              >
                Bufo
              </Button>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Emoji grid/list */}
      <ScrollArea className="flex-1">
        {loading && currentEmojis.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : currentEmojis.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No emojis found
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {currentEmojis.map((emoji) => {
              const key = `${emoji.id}|${emoji.name}`
              const isSelected = selectedIds.has(key)

              return (
                <button
                  key={key}
                  onClick={() => toggleSelection(emoji)}
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-2 rounded-lg border transition-all hover:border-primary/50 hover:bg-accent/50",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-transparent bg-muted/30"
                  )}
                >
                  {/* Emoji image */}
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      src={emoji.imageURL}
                      alt={emoji.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    {/* Selection checkmark */}
                    {(selectionMode || isSelected) && (
                      <div
                        className={cn(
                          "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all border",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-muted-foreground/30"
                        )}
                      >
                        {isSelected && "✓"}
                      </div>
                    )}
                  </div>

                  {/* Emoji name */}
                  <span className="text-[10px] text-center text-muted-foreground line-clamp-2 w-full leading-tight">
                    {emoji.name}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {currentEmojis.map((emoji) => {
              const key = `${emoji.id}|${emoji.name}`
              const isSelected = selectedIds.has(key)

              return (
                <button
                  key={key}
                  onClick={() => toggleSelection(emoji)}
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
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
        </ScrollArea>
      </div>

      {/* Selected emojis sidebar (shopping cart) */}
      <div className="w-80 flex-shrink-0 flex flex-col border-l bg-muted/20">
        <div className="p-4 border-b bg-background">
          <h3 className="font-semibold text-sm flex items-center justify-between">
            <span>Selected Emojis</span>
            <span className="text-muted-foreground">
              {selectedEmojis.length}/{maxSelection}
            </span>
          </h3>
        </div>

        <ScrollArea className="flex-1 p-3">
          {selectedEmojis.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
              <Download className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No emojis selected</p>
              <p className="text-xs">Click emojis to add them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEmojis.map((emoji) => {
                const key = `${emoji.id}|${emoji.name}`
                const status = nameStatuses.get(key) || "checking"
                const isEditing = editingName === key

                return (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg bg-background border transition-all group",
                      status === "taken" && "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20",
                      status === "available" && "border-green-500/30"
                    )}
                  >
                    <img
                      src={emoji.imageURL}
                      alt={emoji.name}
                      className="w-10 h-10 object-contain flex-shrink-0"
                      loading="lazy"
                    />

                    <div className="flex-1 min-w-0">
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
                            setEditingValue(sanitized)
                          }}
                          onBlur={() => {
                            // TODO: Update emoji name and recheck
                            setEditingName(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setEditingName(null)
                            }
                            if (e.key === "Escape") {
                              setEditingName(null)
                              setEditingValue("")
                            }
                          }}
                          className="h-6 text-xs font-mono"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingName(key)
                            setEditingValue(emoji.name)
                          }}
                          className="flex items-center gap-1 text-left group/name w-full"
                        >
                          <span className="text-xs font-mono truncate">
                            :{emoji.name}:
                          </span>
                          <Edit2 className="h-3 w-3 opacity-0 group-hover/name:opacity-50 transition-opacity flex-shrink-0" />
                        </button>
                      )}
                    </div>

                    {/* Status indicator */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {status === "checking" && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                      {status === "available" && (
                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                      )}
                      {status === "taken" && (
                        <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFromSelection(emoji)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with actions */}
        <div className="p-4 border-t bg-background space-y-2">
          {(() => {
            const takenCount = Array.from(nameStatuses.values()).filter((s) => s === "taken").length
            const checkingCount = Array.from(nameStatuses.values()).filter((s) => s === "checking").length
            const availableCount = Array.from(nameStatuses.values()).filter((s) => s === "available").length
            const canExport = selectedEmojis.length > 0 && takenCount === 0 && checkingCount === 0

            return (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={clearSelection}
                    disabled={selectedEmojis.length === 0}
                    className="flex-1"
                  >
                    Clear All
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={!canExport}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>

                {/* Status messages */}
                {checkingCount > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Checking {checkingCount} name{checkingCount > 1 ? "s" : ""}...
                  </p>
                )}
                {takenCount > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                    {takenCount} name{takenCount > 1 ? "s" : ""} taken - edit to continue
                  </p>
                )}
                {!isDemoMode && selectedEmojis.length > maxSelection && (
                  <p className="text-xs text-destructive text-center">
                    Please select max {maxSelection} emojis
                  </p>
                )}
              </>
            )
          })()}
        </div>
      </div>

    </div>
  )
}