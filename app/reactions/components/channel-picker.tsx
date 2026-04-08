"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Hash, Lock, X, Scan, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
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
        {/* Channel selector using Popover + Command */}
        <Popover
          open={open}
          onOpenChange={(next) => {
            if (next && channels.length === 0 && !channelsLoading) {
              fetchChannels()
            }
            setOpen(next)
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={channelsLoading}
              className="gap-2"
              role="combobox"
              aria-expanded={open}
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
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search channels..." />
              <CommandList>
                <CommandEmpty>
                  {channels.length === 0
                    ? "No channels loaded. Close and click again to load."
                    : "No channels found."}
                </CommandEmpty>
                <CommandGroup>
                  {channels.map((channel) => {
                    const selected = selectedChannels.includes(channel.id)
                    return (
                      <CommandItem
                        key={channel.id}
                        value={channel.name}
                        onSelect={() => toggleChannel(channel.id)}
                        className="gap-2"
                      >
                        {channel.is_private ? (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 truncate">{channel.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {channel.num_members.toLocaleString()}
                        </span>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
              <div className="border-t px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {selectedChannels.length} of {channels.length} selected
                </span>
                <button
                  onClick={() => {
                    if (selectedChannels.length === channels.length) {
                      setSelectedChannels([])
                    } else {
                      setSelectedChannels(channels.map((c) => c.id))
                    }
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {selectedChannels.length === channels.length ? "Deselect all" : "Select all"}
                </button>
              </div>
            </Command>
          </PopoverContent>
        </Popover>

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
          Scan Channels
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
