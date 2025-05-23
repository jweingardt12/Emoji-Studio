import React from "react"
import { cn } from "@/lib/utils"

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ChartContainer({
  className,
  children,
  ...props
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "h-full w-full overflow-hidden rounded-md border bg-background p-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}