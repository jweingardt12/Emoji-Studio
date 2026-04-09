'use client';

import { useState, useEffect, useRef, memo } from "react";
import { Trophy, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Leaderboard from "@/components/leaderboard";
import EmojiGrid from "@/components/emoji-grid";
import type { Emoji } from "@/lib/services/emoji-service";
import type { UserWithEmojiCount } from "@/components/user-overlay";
import type { DateRange } from "@/components/leaderboard";

// Legacy props interface for backwards compatibility
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

// Memoized mobile tabs to prevent unnecessary re-renders
const MobileTabs = memo(function MobileTabs({
  activeTab,
  onTabChange,
  filteredLeaderboard,
  dateRange,
  setDateRange,
  searchQuery,
  showInactiveUsers,
  setShowInactiveUsers,
  onViewUser,
}: {
  activeTab: string;
  onTabChange: (value: string) => void;
  filteredLeaderboard: UserWithEmojiCount[];
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  searchQuery: string;
  showInactiveUsers: boolean;
  setShowInactiveUsers: (show: boolean) => void;
  onViewUser: (user: UserWithEmojiCount) => void;
}) {
  return (
    <div className="md:hidden">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <div className="sticky top-0 bg-background/95 backdrop-blur-xs z-10 pb-2 pt-1">
          <TabsList className="w-full">
            <TabsTrigger value="leaderboard">
              <Trophy className="h-4 w-4" aria-hidden="true" />
              <span>Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger value="recent">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Recent</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="leaderboard" className="mt-2 min-h-[400px] animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
          <div className="rounded-xl border border-muted/40 bg-card/50 shadow-xs overflow-hidden">
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
          <div className="rounded-xl border border-muted/40 bg-card/50 shadow-xs overflow-hidden p-4">
            <EmojiGrid />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

// Memoized desktop layout to prevent unnecessary re-renders
const DesktopLayout = memo(function DesktopLayout({
  filteredLeaderboard,
  dateRange,
  setDateRange,
  searchQuery,
  showInactiveUsers,
  setShowInactiveUsers,
  onViewUser,
}: {
  filteredLeaderboard: UserWithEmojiCount[];
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  searchQuery: string;
  showInactiveUsers: boolean;
  setShowInactiveUsers: (show: boolean) => void;
  onViewUser: (user: UserWithEmojiCount) => void;
}) {
  return (
    <div className="hidden md:flex md:flex-col gap-6">
      <div className="rounded-xl border border-muted/40 bg-card/50 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Leaderboard</span>
          </h2>
          <Link href="/leaderboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 -mr-2 rounded-md min-h-[44px]">
            View all
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
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

      <div className="rounded-xl border border-muted/40 bg-card/50 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" aria-hidden="true" />
            <span>Recent Emojis</span>
          </h2>
          <Link href="/explorer?sort=newest" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 -mr-2 rounded-md min-h-[44px]">
            View all
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
        <div className="p-6">
          <EmojiGrid />
        </div>
      </div>
    </div>
  );
});

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
      const restoreScroll = () => {
        window.scrollTo(0, scrollPositionRef.current);
      };

      restoreScroll();
      setTimeout(restoreScroll, 10);
      scrollPositionRef.current = 0;
    }
  }, [activeTab]);

  return (
    <div className="w-full">
      <MobileTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        filteredLeaderboard={filteredLeaderboard}
        dateRange={dateRange}
        setDateRange={setDateRange}
        searchQuery={searchQuery}
        showInactiveUsers={showInactiveUsers}
        setShowInactiveUsers={setShowInactiveUsers}
        onViewUser={onViewUser}
      />
      <DesktopLayout
        filteredLeaderboard={filteredLeaderboard}
        dateRange={dateRange}
        setDateRange={setDateRange}
        searchQuery={searchQuery}
        showInactiveUsers={showInactiveUsers}
        setShowInactiveUsers={setShowInactiveUsers}
        onViewUser={onViewUser}
      />
    </div>
  );
}
