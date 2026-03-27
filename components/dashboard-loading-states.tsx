"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Settings, Chrome, Terminal, Sparkles } from "lucide-react";
import Link from "next/link";

export function DashboardHeroSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </Card>
      ))}
    </div>
  );
}

export function DashboardInsightsSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardContent>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </Card>
  );
}

export function DashboardQuickActionsSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 flex-1" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </Card>
  );
}

export function DashboardChartSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </Card>
  );
}

export function DashboardTabbedContentSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard" disabled>
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
            <TabsTrigger value="recent" disabled>
              <Skeleton className="h-4 w-16" />
            </TabsTrigger>
            <TabsTrigger value="trending" disabled>
              <Skeleton className="h-4 w-20" />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="leaderboard" className="mt-4">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </Card>
  );
}

export function EmptyStateEmojis() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center max-w-lg mx-auto">
      <div className="mb-5 text-5xl">✨</div>
      <h3 className="text-xl font-semibold mb-2">Welcome to Emoji Studio</h3>
      <p className="text-sm text-muted-foreground mb-8">
        Get started in three quick steps to unlock your workspace's emoji analytics.
      </p>

      {/* Onboarding steps */}
      <div className="w-full space-y-4 mb-8 text-left">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--brand))] text-white text-xs font-bold flex-shrink-0">1</div>
          <div>
            <p className="text-sm font-medium">Connect your Slack workspace</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use the Chrome extension or paste a curl command from Slack admin</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold flex-shrink-0">2</div>
          <div>
            <p className="text-sm font-medium">Sync your emoji data</p>
            <p className="text-xs text-muted-foreground mt-0.5">We'll pull in all your custom emojis and creator info</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold flex-shrink-0">3</div>
          <div>
            <p className="text-sm font-medium">Explore analytics & create emojis</p>
            <p className="text-xs text-muted-foreground mt-0.5">View leaderboards, visualizations, and upload new emojis</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/settings">
            <Settings className="h-4 w-4 mr-2" />
            Connect Slack
          </Link>
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/settings?demo=true">
            <Sparkles className="h-4 w-4 mr-2" />
            Try Demo
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function EmptyStateLeaderboard() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">🏆</div>
      <h3 className="text-lg font-semibold mb-2">No Leaders Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Be the first to create emojis and claim the top spot on the leaderboard!
      </p>
      <Button asChild>
        <Link href="/create">
          <Plus className="h-4 w-4 mr-2" />
          Create Your First Emoji
        </Link>
      </Button>
    </div>
  );
}

export function EmptyStateSearch({ onClearSearch }: { onClearSearch?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">🔍</div>
      <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Try adjusting your search or filters to find what you're looking for.
      </p>
      {onClearSearch && (
        <Button variant="outline" onClick={onClearSearch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Clear Search
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">⚠️</div>
      <h3 className="text-lg font-semibold mb-2">Oops!</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{message}</p>
      <Button
        onClick={onRetry || (() => window.location.reload())}
        variant="default"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}