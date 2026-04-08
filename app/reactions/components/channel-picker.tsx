"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search, Hash, Lock, X, Scan, ChevronDown } from "lucide-react"
import type { SlackChannel, DateRange } from "@/app/reactions/hooks/use-reactions-state"

interface ChannelPickerProps {
  channels: SlackChannel[]
  selectedChannels: string[]
  setSelectedChannels: (channels: string[]) => void
  channelsLoading: boolean
  fetchChannels: () => void
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  onScan: () => void
  scanStatus: "idle" | "scanning" | "complete" | "error"
}

export function ChannelPicker({
  channels,
  selectedChannels,
  setSelectedChannels,
  channelsLoading,
  fetchChannels,
  dateRange,
  setDateRange,
  onScan,
  scanStatus,
}: ChannelPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleChannel(id: string) {
    if (selectedChannels.includes(id)) {
      setSelectedChannels(selectedChannels.filter((c) => c !== id))
    } else {
      setSelectedChannels([...selectedChannels, id])
    }
  }

  function removeChannel(id: string) {
    setSelectedChannels(selectedChannels.filter((c) => c !== id))
  }

  const selectedChannelObjects = channels.filter((c) =>
    selectedChannels.includes(c.id)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Channel selector dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => {
              if (channels.length === 0 && !channelsLoading) {
                fetchChannels()
              }
              setOpen((prev) => !prev)
            }}
            disabled={channelsLoading}
            className="gap-2"
          >
            {channelsLoading ? (
              <span className="text-muted-foreground">Loading channels…</span>
            ) : (
              <>
                <Hash className="h-4 w-4" />
                Select Channels
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </>
            )}
          </Button>

          {open && (
            <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover shadow-lg">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-7 h-8 text-sm"
                    placeholder="Search channels…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {channels.length === 0
                      ? "No channels loaded. Click again to load."
                      : "No channels match."}
                  </p>
                ) : (
                  filtered.map((channel) => {
                    const selected = selectedChannels.includes(channel.id)
                    return (
                      <button
                        key={channel.id}
                        onClick={() => toggleChannel(channel.id)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                          selected ? "bg-accent/60 font-medium" : ""
                        }`}
                      >
                        {channel.is_private ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 truncate text-left">
                          {channel.name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {channel.num_members.toLocaleString()}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="border-t p-2 flex justify-between items-center text-xs text-muted-foreground">
                <span>{selectedChannels.length} selected</span>
                <button
                  className="hover:text-foreground transition-colors"
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Date range toggle */}
        <ToggleGroup
          type="single"
          value={dateRange}
          onValueChange={(v) => v && setDateRange(v as DateRange)}
          className="border rounded-md"
        >
          <ToggleGroupItem value="24h" className="text-sm px-2.5 h-9">
            24h
          </ToggleGroupItem>
          <ToggleGroupItem value="7d" className="text-sm px-2.5 h-9">
            7d
          </ToggleGroupItem>
          <ToggleGroupItem value="30d" className="text-sm px-2.5 h-9">
            30d
          </ToggleGroupItem>
          <ToggleGroupItem value="90d" className="text-sm px-2.5 h-9">
            90d
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Scan button */}
        <Button
          onClick={onScan}
          disabled={scanStatus === "scanning" || selectedChannels.length === 0}
          className="gap-2"
        >
          <Scan className="h-4 w-4" />
          Scan Reactions
        </Button>
      </div>

      {/* Selected channel badges */}
      {selectedChannelObjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedChannelObjects.map((channel) => (
            <Badge
              key={channel.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {channel.is_private ? (
                <Lock className="h-3 w-3" />
              ) : (
                <Hash className="h-3 w-3" />
              )}
              {channel.name}
              <button
                onClick={() => removeChannel(channel.id)}
                className="ml-0.5 rounded-full hover:bg-muted transition-colors p-0.5"
                aria-label={`Remove ${channel.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
