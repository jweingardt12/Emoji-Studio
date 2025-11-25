import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  shimmer?: boolean
}

function Skeleton({
  className,
  shimmer = true,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer
          ? "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
          : "animate-pulse",
        className
      )}
      {...props}
    />
  )
}

// Card skeleton for consistent card loading states
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-6 space-y-4", className)}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

// Text skeleton for paragraphs
function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${Math.random() * 30 + 70}%` }}
        />
      ))}
    </div>
  )
}

// Avatar skeleton
function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }
  return <Skeleton className={cn("rounded-full", sizes[size])} />
}

// Image skeleton with aspect ratio
function SkeletonImage({ aspectRatio = "square", className }: { aspectRatio?: "square" | "video" | "wide"; className?: string }) {
  const ratios = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[21/9]",
  }
  return <Skeleton className={cn("w-full", ratios[aspectRatio], className)} />
}

export { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar, SkeletonImage }
