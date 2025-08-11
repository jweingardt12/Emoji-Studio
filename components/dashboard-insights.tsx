'use client';

import { useState, useEffect } from "react";
import { TrendingUp, Sparkles, Users, X, ChevronRight } from "lucide-react";
import { useEmojiData } from "@/lib/hooks/use-emoji-data";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function DashboardInsights() {
  const { emojiData, userLeaderboard } = useEmojiData();
  const [isVisible, setIsVisible] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if user has dismissed this before
    const dismissed = localStorage.getItem('dashboardInsightsDismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Show again after 24 hours
      if (now.getTime() - dismissedDate.getTime() > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('dashboardInsightsDismissed');
      } else {
        setIsVisible(false);
      }
    }
  }, []);

  if (!isClient || !isVisible) return null;

  // Calculate insights
  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - (7 * 24 * 60 * 60);
  const twoWeeksAgo = now - (14 * 24 * 60 * 60);
  const monthAgo = now - (30 * 24 * 60 * 60);
  
  const thisWeekEmojis = emojiData.filter(e => e.created && e.created > weekAgo).length;
  const lastWeekEmojis = emojiData.filter(e => 
    e.created && e.created > twoWeeksAgo && e.created <= weekAgo
  ).length;
  
  const weeklyChange = lastWeekEmojis > 0 
    ? Math.round(((thisWeekEmojis - lastWeekEmojis) / lastWeekEmojis) * 100)
    : thisWeekEmojis > 0 ? 100 : 0;
  
  // Find new creators this week
  const thisWeekCreators = new Set(
    emojiData
      .filter(e => e.created && e.created > weekAgo)
      .map(e => e.user_id)
  );
  
  const lastMonthCreators = new Set(
    emojiData
      .filter(e => e.created && e.created > monthAgo && e.created <= weekAgo)
      .map(e => e.user_id)
  );
  
  const newCreators = Array.from(thisWeekCreators).filter(id => !lastMonthCreators.has(id));
  
  // Find trending emoji (most recently created)
  const recentEmojis = emojiData
    .filter(e => e.created && e.created > weekAgo)
    .sort((a, b) => (b.created || 0) - (a.created || 0));
  const trendingEmoji = recentEmojis[0];
  
  // Generate insight message
  let primaryInsight = "";
  let secondaryInsight = "";
  let sentiment: 'positive' | 'neutral' = 'neutral';
  let icon = <Sparkles className="h-4 w-4" />;
  
  if (weeklyChange > 20) {
    primaryInsight = `Your workspace is ${weeklyChange}% more active this week`;
    sentiment = 'positive';
    icon = <TrendingUp className="h-4 w-4" />;
  } else if (newCreators.length > 0) {
    primaryInsight = `${newCreators.length} new ${newCreators.length === 1 ? 'creator' : 'creators'} joined this week`;
    sentiment = 'positive';
    icon = <Users className="h-4 w-4" />;
  } else if (thisWeekEmojis > 0) {
    primaryInsight = `${thisWeekEmojis} ${thisWeekEmojis === 1 ? 'emoji' : 'emojis'} added this week`;
    sentiment = thisWeekEmojis > 10 ? 'positive' : 'neutral';
  } else {
    primaryInsight = "Ready to create something amazing?";
    secondaryInsight = "Start building your emoji collection today!";
    sentiment = 'neutral';
  }
  
  // Build secondary insights
  if (!secondaryInsight) {
    const insights = [];
    if (thisWeekEmojis > 0) {
      insights.push(`${thisWeekEmojis} ${thisWeekEmojis === 1 ? 'emoji' : 'emojis'} added`);
    }
    if (newCreators.length > 0 && !primaryInsight.includes('creator')) {
      insights.push(`${newCreators.length} new ${newCreators.length === 1 ? 'creator' : 'creators'}`);
    }
    if (trendingEmoji) {
      insights.push(`":${trendingEmoji.name}:" is trending`);
    }
    secondaryInsight = insights.slice(0, 2).join(' • ');
  }

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('dashboardInsightsDismissed', new Date().toISOString());
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn(
            "relative overflow-hidden border-l-4 transition-all",
            sentiment === 'positive' && "border-l-green-500 bg-green-500/5",
            sentiment === 'neutral' && "border-l-primary/50 bg-muted/50"
          )}>
            <CardContent className="p-4">
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-lg hover:bg-background/80 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
              
              <div className="flex items-start gap-3 pr-6">
                <div className={cn(
                  "rounded-lg p-2",
                  sentiment === 'positive' && "bg-green-500/10 text-green-600 dark:text-green-400",
                  sentiment === 'neutral' && "bg-primary/10 text-primary"
                )}>
                  {icon}
                </div>
                
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-sm leading-tight">
                    {primaryInsight}
                  </p>
                  {secondaryInsight && (
                    <p className="text-xs text-muted-foreground">
                      {secondaryInsight}
                    </p>
                  )}
                </div>
                
                {sentiment === 'neutral' && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}