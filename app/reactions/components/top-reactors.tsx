"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SmilePlus } from "lucide-react"
import type { UserReactionStat } from "@/lib/services/reaction-service"

interface TopReactorsProps {
  userStats: UserReactionStat[]
  userNameMap: Map<string, string>
  customEmojiUrls: Map<string, string>
  onEmojiClick?: (name: string) => void
}

export function TopReactors({ userStats, userNameMap, customEmojiUrls, onEmojiClick }: TopReactorsProps) {

  const { topReactors, unnamedCount } = useMemo(() => {
    const sorted = [...userStats].sort((a, b) => b.reaction_count - a.reaction_count)
    const named: UserReactionStat[] = []
    let unnamed = 0
    for (const user of sorted) {
      if (userNameMap.has(user.user_id)) {
        if (named.length < 10) named.push(user)
      } else {
        unnamed++
      }
    }
    return { topReactors: named, unnamedCount: unnamed }
  }, [userStats, userNameMap])

  if (topReactors.length === 0) return null

  const maxCount = topReactors[0].reaction_count

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <SmilePlus className="h-4 w-4" />
          Top Reactors
        </CardTitle>
        <CardDescription className="text-xs">
          People who reacted to messages the most
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={200}>
          <div className="space-y-0.5">
            {topReactors.map((user, i) => {
              const displayName = userNameMap.get(user.user_id)
              const barPct = Math.max(3, (user.reaction_count / maxCount) * 100)

              return (
                <div
                  key={user.user_id}
                  className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/40 transition-colors"
                >
                  {/* Rank */}
                  <span className="text-xs font-semibold text-muted-foreground w-5 text-right tabular-nums shrink-0">
                    {i + 1}
                  </span>

                  {/* Name */}
                  <span className="text-sm font-medium truncate w-28 sm:w-36 shrink-0">
                    {displayName?.split(" ")[0] ?? user.user_id}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 min-w-0 hidden sm:block">
                    <Progress value={barPct} className="h-2 bg-muted/60" />
                  </div>

                  {/* Count */}
                  <span className="text-xs font-semibold tabular-nums shrink-0 ml-auto sm:ml-0 sm:w-12 text-right">
                    {user.reaction_count.toLocaleString()}
                  </span>

                  {/* Top emojis */}
                  <div className="hidden md:flex items-center gap-0.5 shrink-0">
                    {user.top_emojis.slice(0, 3).map((name) => {
                      const url = customEmojiUrls.get(name)
                      if (!url) return null
                      return (
                        <Tooltip key={name}>
                          <TooltipTrigger asChild>
                            <img
                              src={url}
                              alt={name}
                              className={`h-4 w-4 object-contain ${onEmojiClick ? "cursor-pointer" : ""}`}
                              onClick={onEmojiClick ? () => onEmojiClick(name) : undefined}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">:{name}:</TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {unnamedCount > 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              + {unnamedCount} more {unnamedCount === 1 ? "person" : "people"} not shown
            </p>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
