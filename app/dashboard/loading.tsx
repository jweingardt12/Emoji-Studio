import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full pb-8 animate-in fade-in duration-300">
      {/* Hero Metrics Section Skeleton */}
      <div className="px-3 sm:px-4 lg:px-6 pt-4 md:pt-8">
        <div className="grid grid-cols-1 gap-4">
          {/* Primary metric skeleton */}
          <div className="rounded-xl bg-card border border-border shadow p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-32 mb-2" />
            <Skeleton className="h-3 w-40" />
          </div>
          {/* Secondary metrics skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border shadow p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Skeleton */}
      <div className="px-3 sm:px-4 lg:px-6">
        <div className="rounded-xl border border-muted/40 bg-card/50 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-4">
            <Skeleton className="h-5 sm:h-6 w-36 sm:w-48" />
            <Skeleton className="h-7 sm:h-8 w-28 sm:w-32" />
          </div>
          <Skeleton className="h-7 sm:h-8 w-32 sm:w-40 mb-2" />
          <Skeleton className="h-[200px] sm:h-[250px] w-full" />
        </div>
      </div>

      {/* Tabbed Content Skeleton */}
      <div className="px-3 sm:px-4 lg:px-6">
        <div className="rounded-xl border border-muted/40 bg-card/50 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
