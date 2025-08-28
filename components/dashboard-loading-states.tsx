"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">😢</div>
      <h3 className="text-lg font-semibold mb-2">No Emojis Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Start creating custom emojis to see them appear here. Your workspace's creativity awaits!
      </p>
    </div>
  );
}

export function EmptyStateLeaderboard() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">🏆</div>
      <h3 className="text-lg font-semibold mb-2">No Leaders Yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Be the first to create emojis and claim the top spot on the leaderboard!
      </p>
    </div>
  );
}

export function EmptyStateSearch() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">🔍</div>
      <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Try adjusting your search or filters to find what you're looking for.
      </p>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-6xl">⚠️</div>
      <h3 className="text-lg font-semibold mb-2">Oops!</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}