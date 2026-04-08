"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search, Grid3X3, TableIcon, RefreshCw, Filter, X, Command, Hash, FileImage, Film, Link2, TrendingUp, Calendar } from "lucide-react"
import type { ViewMode, FilterType, FilterHasAliases, EmojiStats } from "../hooks/use-my-emojis-state"

interface MyEmojisToolbarProps {
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchInputRef: React.RefObject<HTMLInputElement | null>

  // View
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Refresh
  isRefreshing: boolean
  refreshEmojiData: () => void

  // Filters
  showFilters: boolean
  setShowFilters: (show: boolean) => void
  filterType: FilterType
  setFilterType: (type: FilterType) => void
  filterHasAliases: FilterHasAliases
  setFilterHasAliases: (filter: FilterHasAliases) => void

  // Keyboard shortcuts
  setShowKeyboardHelp: (show: boolean) => void

  // Stats
  stats: EmojiStats
}

export function DesktopToolbar({
  searchQuery,
  setSearchQuery,
  searchInputRef,
  viewMode,
  setViewMode,
  isRefreshing,
  refreshEmojiData,
  setShowKeyboardHelp,
}: Pick<MyEmojisToolbarProps, 'searchQuery' | 'setSearchQuery' | 'searchInputRef' | 'viewMode' | 'setViewMode' | 'isRefreshing' | 'refreshEmojiData' | 'setShowKeyboardHelp'>) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="outline"
        onClick={() => refreshEmojiData()}
        disabled={isRefreshing}
        title="Refresh emoji list"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
      <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)}>
        <ToggleGroupItem value="table" aria-label="Table view">
          <TableIcon className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" aria-label="Grid view">
          <Grid3X3 className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search emojis\u2026 (\u2318K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-[300px] pl-9"
        />
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowKeyboardHelp(true)}
            title="Keyboard shortcuts"
          >
            <Command className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Keyboard shortcuts</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function MobileToolbar({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  isRefreshing,
  refreshEmojiData,
  myEmojisCount,
}: {
  searchQuery: string
  setSearchQuery: (query: string) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  isRefreshing: boolean
  refreshEmojiData: () => void
  myEmojisCount: number
}) {
  return (
    <div className="px-3 pt-4 pb-3 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          My Emojis {myEmojisCount > 0 && <span className="text-muted-foreground font-normal">({myEmojisCount})</span>}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => refreshEmojiData()}
            disabled={isRefreshing}
            className="h-8 w-8 border-primary/20 hover:border-primary/40"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)} className="h-8">
            <ToggleGroupItem value="table" aria-label="Table view" className="h-8 px-2">
              <TableIcon className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 px-2">
              <Grid3X3 className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search emojis\u2026"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 h-9"
        />
      </div>
    </div>
  )
}

export function StatsDashboard({ stats }: { stats: EmojiStats }) {
  if (stats.total === 0) return null

  return (
    <div className="px-6 py-4 border-b bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hash className="h-3.5 w-3.5" />
            <span>Total</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileImage className="h-3.5 w-3.5" />
            <span>Images</span>
          </div>
          <div className="text-2xl font-bold">{stats.images}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Film className="h-3.5 w-3.5" />
            <span>GIFs</span>
          </div>
          <div className="text-2xl font-bold">{stats.gifs}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            <span>Aliases</span>
          </div>
          <div className="text-2xl font-bold">{stats.aliases}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>This Week</span>
          </div>
          <div className="text-2xl font-bold">{stats.thisWeek}</div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>This Month</span>
          </div>
          <div className="text-2xl font-bold">{stats.thisMonth}</div>
        </div>
      </div>
    </div>
  )
}

export function FilterBar({
  showFilters,
  setShowFilters,
  filterType,
  setFilterType,
  filterHasAliases,
  setFilterHasAliases,
}: Pick<MyEmojisToolbarProps, 'showFilters' | 'setShowFilters' | 'filterType' | 'setFilterType' | 'filterHasAliases' | 'setFilterHasAliases'>) {
  return (
    <Button
      variant={showFilters ? "default" : "outline"}
      size="sm"
      onClick={() => setShowFilters(!showFilters)}
      className="gap-2"
    >
      <Filter className="h-4 w-4" />
      Filters
      {(filterType !== "all" || filterHasAliases !== "all") && (
        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
          {(filterType !== "all" ? 1 : 0) + (filterHasAliases !== "all" ? 1 : 0)}
        </Badge>
      )}
    </Button>
  )
}

export function FilterOptions({
  showFilters,
  filterType,
  setFilterType,
  filterHasAliases,
  setFilterHasAliases,
}: Pick<MyEmojisToolbarProps, 'showFilters' | 'filterType' | 'setFilterType' | 'filterHasAliases' | 'setFilterHasAliases'>) {
  if (!showFilters) return null

  return (
    <div className="px-6 py-4 border-b bg-muted/20 space-y-3">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">Type</Label>
          <ToggleGroup type="single" value={filterType} onValueChange={(value) => value && setFilterType(value as FilterType)} className="justify-start">
            <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
            <ToggleGroupItem value="images" size="sm">Images</ToggleGroupItem>
            <ToggleGroupItem value="gifs" size="sm">GIFs</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-medium">Aliases</Label>
          <ToggleGroup type="single" value={filterHasAliases} onValueChange={(value) => value && setFilterHasAliases(value as FilterHasAliases)} className="justify-start">
            <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
            <ToggleGroupItem value="with" size="sm">With Aliases</ToggleGroupItem>
            <ToggleGroupItem value="without" size="sm">Without Aliases</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      {(filterType !== "all" || filterHasAliases !== "all") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterType("all")
            setFilterHasAliases("all")
          }}
          className="gap-2 h-8"
        >
          <X className="h-3 w-3" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
