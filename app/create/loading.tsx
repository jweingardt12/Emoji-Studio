import { Skeleton } from "@/components/ui/skeleton"

export default function CreateLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Tab navigation skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      {/* Upload area skeleton */}
      <div className="rounded-xl border-2 border-dashed border-muted bg-muted/20 p-12 flex flex-col items-center justify-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 text-center">
          <Skeleton className="h-5 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Processing area skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-24 w-full rounded-lg mb-3" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
