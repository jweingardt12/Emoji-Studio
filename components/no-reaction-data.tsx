import Link from "next/link"
import { Activity } from "lucide-react"

interface NoReactionDataProps {
  variant?: "inline" | "card"
}

export function NoReactionData({ variant = "inline" }: NoReactionDataProps) {
  if (variant === "card") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No usage data yet.{" "}
          <Link href="/reactions" className="text-primary hover:underline">
            Scan channels
          </Link>{" "}
          to see how emojis are used.
        </p>
      </div>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      No usage data.{" "}
      <Link href="/reactions" className="text-primary hover:underline">
        Scan channels
      </Link>{" "}
      to track reactions.
    </p>
  )
}
