'use client';

import { useState, useEffect, useRef } from "react";
import { Trophy, Clock } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Leaderboard from "@/components/leaderboard";
import EmojiGrid from "@/components/emoji-grid";
import { useEmojiData } from "@/lib/hooks/use-emoji-data";
import { cn } from "@/lib/utils";
import type { Emoji } from "@/lib/services/emoji-service";
import type { UserWithEmojiCount } from "@/components/user-overlay";
import type { DateRange } from "@/components/leaderboard";

interface DashboardTabbedContentProps {
  filteredLeaderboard: UserWithEmojiCount[];
  dateRange: DateRange;
  searchQuery: string;
  showInactiveUsers: boolean;
  onViewUser: (user: UserWithEmojiCount) => void;
  onEmojiClick: (emoji: Emoji) => void;
  setDateRange: (range: DateRange) => void;
  setSearchQuery: (query: string) => void;
  setShowInactiveUsers: (show: boolean) => void;
}

export function DashboardTabbedContent({
  filteredLeaderboard,
  dateRange,
  searchQuery,
  showInactiveUsers,
  onViewUser,
  onEmojiClick,
  setDateRange,
  setSearchQuery,
  setShowInactiveUsers
}: DashboardTabbedContentProps) {
  const [activeTab, setActiveTab] = useState("leaderboard");
  const scrollPositionRef = useRef<number>(0);

  // Custom tab handler to prevent scroll-to-top
  const handleTabChange = (value: string) => {
    // Store current scroll position
    scrollPositionRef.current = window.scrollY;

    // Change tab
    setActiveTab(value);
  };

  // Restore scroll position after tab change
  useEffect(() => {
    if (scrollPositionRef.current > 0) {
      // Use multiple methods to ensure scroll position is restored
      const restoreScroll = () => {
        window.scrollTo(0, scrollPositionRef.current);
      };

      // Try immediately
      restoreScroll();

      // Try again after a short delay in case content is still rendering
      setTimeout(restoreScroll, 10);

      // Reset the stored position
      scrollPositionRef.current = 0;
    }
  }, [activeTab]);

  return (
    <div className="w-full">
      {/* Mobile tabs */}
      <div className="md:hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2 pt-1">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger
                value="leaderboard"
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Trophy className="h-4 w-4" />
                <span className="font-medium">Leaderboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="recent"
                className="flex items-center justify-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200"
              >
                <Clock className="h-4 w-4" />
                <span className="font-medium">Recent</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="leaderboard" className="mt-2 min-h-[400px] animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="rounded-xl border border-muted/40 bg-card/50 shadow-sm overflow-hidden">
              <Leaderboard
                leaderboard={filteredLeaderboard}
                dateRange={dateRange}
                setDateRange={setDateRange}
                searchQuery={searchQuery}
                showInactiveUsers={showInactiveUsers}
                setShowInactiveUsers={setShowInactiveUsers}
                onViewUser={onViewUser}
                variant="compact"
              />
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-2 min-h-[400px] animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div className="rounded-xl border border-muted/40 bg-card/50 shadow-sm overflow-hidden p-4">
              <EmojiGrid />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop layout - full-width stacked */}
      <div className="hidden md:flex md:flex-col gap-6">
        <div className="rounded-xl border border-muted/40 bg-card/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <Link href="/my-emojis" className="focus:outline-none cursor-pointer hover:opacity-80 transition-opacity">
                <span className="border-b border-dotted border-muted-foreground hover:border-primary transition-colors">Recent Emojis</span>
              </Link>
            </h2>
          </div>
          <div className="p-6">
            <EmojiGrid />
          </div>
        </div>

        <div className="rounded-xl border border-muted/40 bg-card/50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <Link href="/leaderboard" className="focus:outline-none cursor-pointer hover:opacity-80 transition-opacity">
                <span className="border-b border-dotted border-muted-foreground hover:border-primary transition-colors">Leaderboard</span>
              </Link>
            </h2>
          </div>
          <div className="p-0">
            <Leaderboard
              leaderboard={filteredLeaderboard}
              dateRange={dateRange}
              setDateRange={setDateRange}
              searchQuery={searchQuery}
              showInactiveUsers={showInactiveUsers}
              setShowInactiveUsers={setShowInactiveUsers}
              onViewUser={onViewUser}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  );
}