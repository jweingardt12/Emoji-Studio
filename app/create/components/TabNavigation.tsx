"use client"

import { memo } from "react"
import { Upload, Grid3x3, Sparkles, SmilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTrack } from "@/lib/hooks/use-track"

interface TabNavigationProps {
  activeTab: "upload" | "browse"
  onTabChange: (tab: "upload" | "browse") => void
  selectedEmojiCount: number
  onOpenCart: () => void
}

export const TabNavigation = memo(function TabNavigation({
  activeTab,
  onTabChange,
  selectedEmojiCount,
  onOpenCart,
}: TabNavigationProps) {
  const track = useTrack()

  return (
    <div className="flex-none border-b px-4 pt-4">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span>Create Emojis</span>
          </h1>
          <TabsList className="grid grid-cols-2 w-[240px]">
            <TabsTrigger
              value="upload"
              className="gap-2"
              onClick={() => {
                onTabChange("upload")
                track('Emoji Creator: Tab Changed', { tab: "upload" })
              }}
            >
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger
              value="browse"
              className="gap-2"
              onClick={() => {
                onTabChange("browse")
                track('Emoji Creator: Tab Changed', { tab: "browse" })
              }}
            >
              <Grid3x3 className="h-4 w-4" />
              Browse Packs
            </TabsTrigger>
          </TabsList>
        </div>
        {/* Selection cart button for mobile when on browse tab */}
        {activeTab === "browse" && selectedEmojiCount > 0 && (
          <Button
            onClick={onOpenCart}
            className="relative h-9 w-9 rounded-xl border border-border/60 bg-card/95 shadow-sm lg:hidden"
            size="icon"
          >
            <div className="relative h-full w-full overflow-hidden rounded-lg bg-background/80 flex items-center justify-center">
              <SmilePlus className="h-5 w-5 text-primary" />
            </div>
            <Badge
              variant="destructive"
              className="absolute top-0.5 right-0.5 h-4 w-4 flex items-center justify-center p-0 text-[10px]"
            >
              {selectedEmojiCount}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  )
})
