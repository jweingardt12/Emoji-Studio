'use client';

import { useState, useEffect, useRef } from "react";
import { Trophy, Clock } from "lucide-react";
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
          <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-2">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-auto p-1">
            <TabsTrigger 
              value="leaderboard" 
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-2"
            >
              <Trophy className="h-4 w-4" />
              <span className="text-sm">Leaderboard</span>
            </TabsTrigger>
            <TabsTrigger 
              value="recent" 
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-2"
            >
              <Clock className="h-4 w-4" />
              <span className="text-sm">Recent Emojis</span>
            </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="leaderboard" className="mt-0 min-h-[400px]">
            <div className="rounded-xl bg-card shadow">
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
          
          <TabsContent value="recent" className="mt-0 min-h-[400px]">
            <div className="rounded-xl bg-card shadow">
              <EmojiGrid />
            </div>
          </TabsContent>

        </Tabs>
      </div>
      
      {/* Desktop layout - keep existing side-by-side */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 lg:gap-6">
        <div className="rounded-xl bg-card border border-border shadow">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Leaderboard</h3>
          </div>
          <div className="p-4">
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
        
        <div className="rounded-xl bg-card border border-border shadow">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Recent Emojis</h3>
          </div>
          <div className="p-4">
            <EmojiGrid />
          </div>
        </div>
      </div>
    </div>
  );
}