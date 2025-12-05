"use client"

import { cn } from "@/lib/utils"
import { proxyImageUrl } from "@/lib/utils/image-proxy"
import type { UserWithEmojiCount, DateRange } from "@/components/leaderboard"

// Background styles matching iOS app exactly (from iOS26LeaderboardView.swift)
export type ShareBackgroundStyle =
  | "midnight"   // Deep blue/purple
  | "charcoal"   // Dark gray/black - DEFAULT
  | "forest"     // Dark green
  | "wine"       // Dark red/burgundy
  | "ocean"      // Deep teal/cyan
  | "slate"      // Blue-gray
  | "plum"       // Purple/violet
  | "coffee"     // Warm brown

export const SHARE_BACKGROUNDS: Record<ShareBackgroundStyle, { from: string; to: string; label: string }> = {
  midnight: { from: "rgb(25, 25, 51)", to: "rgb(13, 13, 38)", label: "Midnight" },
  charcoal: { from: "rgb(31, 31, 31)", to: "rgb(15, 15, 15)", label: "Charcoal" },
  forest: { from: "rgb(20, 38, 25)", to: "rgb(10, 20, 13)", label: "Forest" },
  wine: { from: "rgb(46, 20, 25)", to: "rgb(25, 10, 13)", label: "Wine" },
  ocean: { from: "rgb(15, 36, 46)", to: "rgb(8, 20, 31)", label: "Ocean" },
  slate: { from: "rgb(31, 36, 46)", to: "rgb(15, 20, 25)", label: "Slate" },
  plum: { from: "rgb(38, 20, 46)", to: "rgb(20, 10, 25)", label: "Plum" },
  coffee: { from: "rgb(41, 31, 20)", to: "rgb(25, 18, 10)", label: "Coffee" },
}

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  "quarter": "Last 90 Days",
  "thisyear": "This Year",
  "year": "Last 365 Days",
  "all": "All Time",
}

interface LeaderboardShareCardProps {
  users: UserWithEmojiCount[]
  timeRange: DateRange
  userCount: 3 | 5 | 10
  workspaceName: string
  backgroundStyle: ShareBackgroundStyle
  showEmojis?: boolean
  emojiAnimationClass?: string
}

function getMedal(rank: number): string {
  switch (rank) {
    case 1: return "🥇"
    case 2: return "🥈"
    case 3: return "🥉"
    default: return `${rank}.`
  }
}

// Format display name: "Jason Weingardt" → "Jason W."
function formatDisplayName(name: string | undefined): string {
  if (!name) return "Unknown"
  const nameParts = name.trim().split(" ")
  if (nameParts.length === 1) return nameParts[0]
  return `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
}

// Format workspace name: "slack-workspace" → "Slack Workspace"
function formatWorkspaceName(workspace: string): string {
  return workspace
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

// Medal accent colors for top 3
const MEDAL_COLORS = {
  1: { bg: "rgba(255, 215, 0, 0.15)", border: "rgba(255, 215, 0, 0.4)" },    // Gold
  2: { bg: "rgba(192, 192, 192, 0.15)", border: "rgba(192, 192, 192, 0.4)" }, // Silver
  3: { bg: "rgba(205, 127, 50, 0.15)", border: "rgba(205, 127, 50, 0.4)" },   // Bronze
} as const

interface ShareLeaderboardRowProps {
  user: UserWithEmojiCount
  rank: number
  twoColumn?: boolean
  showEmojis?: boolean
  emojiAnimationClass?: string
}

function ShareLeaderboardRow({ user, rank, twoColumn = false, showEmojis = false, emojiAnimationClass }: ShareLeaderboardRowProps) {
  const isTopThree = rank <= 3
  const medalColors = isTopThree ? MEDAL_COLORS[rank as 1 | 2 | 3] : null
  const recentEmojis = user.recent_emojis?.slice(0, twoColumn ? 3 : 5) || []

  // In two-column mode, ALL rows use identical sizing for even columns
  // In single-column mode, top 3 get slightly larger styling
  // Top 3 always get medal-colored accents
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg",
        twoColumn ? "px-2 py-1.5" : "px-3 py-1.5"
      )}
      style={{
        backgroundColor: medalColors ? medalColors.bg : "rgba(255, 255, 255, 0.08)",
        border: medalColors ? `1px solid ${medalColors.border}` : "1px solid transparent",
      }}
    >
      <span
        className={cn(
          "font-bold text-center shrink-0",
          twoColumn
            ? "text-sm w-6"
            : isTopThree ? "text-lg w-7" : "text-sm w-7"
        )}
      >
        {getMedal(rank)}
      </span>
      <span
        className={cn(
          "text-white truncate",
          twoColumn
            ? "text-xs font-medium flex-1 min-w-0"
            : isTopThree ? "text-sm font-semibold w-20" : "text-sm font-medium w-20"
        )}
      >
        {formatDisplayName(user.user_display_name)}
      </span>
      {/* Recent emojis */}
      {showEmojis && recentEmojis.length > 0 && (
        <div className={cn("flex items-center gap-0.5 flex-1 justify-center", twoColumn && "gap-0.5")}>
          {recentEmojis.map((emoji, i) => (
            <img
              key={`${emoji.name}-${i}`}
              src={proxyImageUrl(emoji.url)}
              alt={emoji.name}
              crossOrigin="anonymous"
              className={cn(
                "rounded-sm object-contain",
                twoColumn ? "w-4 h-4" : "w-5 h-5",
                emojiAnimationClass
              )}
              style={{
                animationDelay: emojiAnimationClass ? `${i * 100}ms` : undefined
              }}
            />
          ))}
        </div>
      )}
      <span
        className={cn(
          "font-semibold text-white/90 tabular-nums shrink-0",
          twoColumn ? "text-xs" : "text-sm"
        )}
      >
        {user.emoji_count}
      </span>
    </div>
  )
}

export function LeaderboardShareCard({
  users,
  timeRange,
  userCount,
  workspaceName,
  backgroundStyle,
  showEmojis = false,
  emojiAnimationClass,
}: LeaderboardShareCardProps) {
  const usersToShow = users.slice(0, userCount)
  const bg = SHARE_BACKGROUNDS[backgroundStyle]

  return (
    <div
      id="leaderboard-share-card"
      className="relative overflow-hidden"
      style={{
        width: 390,
        height: 390,
        borderRadius: 24,
        background: `linear-gradient(to bottom, ${bg.from}, ${bg.to})`,
      }}
    >
      {/* Highlight overlay - more dramatic gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.15) 0%, transparent 50%),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 30%, transparent 60%, rgba(0,0,0,0.2) 100%)
          `,
        }}
      />

      {/* Grain texture overlay - enhanced noise */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Subtle vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Border overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[24px]"
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col h-full py-3 px-4">
        {/* Header */}
        <div className="text-center space-y-0.5 shrink-0">
          <h2 className="text-xl font-bold text-white">🏆 Emoji Creation Leaderboard 🏆</h2>
          <p className="text-sm font-medium text-white/80">{formatWorkspaceName(workspaceName)}</p>
          <p className="text-xs text-white/60">{DATE_RANGE_LABELS[timeRange]}</p>
        </div>

        {/* Leaderboard rows */}
        <div className="flex-1 flex items-center justify-center py-2">
          {userCount >= 10 ? (
            // Two column layout for 10 users - consistent sizing for all rows
            <div className="flex gap-3 w-full">
              <div className="flex-1 flex flex-col gap-1.5">
                {usersToShow.slice(0, 5).map((user, index) => (
                  <ShareLeaderboardRow
                    key={user.user_id}
                    user={user}
                    rank={index + 1}
                    twoColumn
                    showEmojis={showEmojis}
                    emojiAnimationClass={emojiAnimationClass}
                  />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                {usersToShow.slice(5, 10).map((user, index) => (
                  <ShareLeaderboardRow
                    key={user.user_id}
                    user={user}
                    rank={index + 6}
                    twoColumn
                    showEmojis={showEmojis}
                    emojiAnimationClass={emojiAnimationClass}
                  />
                ))}
              </div>
            </div>
          ) : (
            // Single column layout for 3 or 5 users
            <div className="flex flex-col gap-1.5 w-full px-2">
              {usersToShow.map((user, index) => (
                <ShareLeaderboardRow
                  key={user.user_id}
                  user={user}
                  rank={index + 1}
                  showEmojis={showEmojis}
                  emojiAnimationClass={emojiAnimationClass}
                />
              ))}
            </div>
          )}
        </div>

        {/* Branding footer */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
          <img
            src="/logo.png"
            alt="Emoji Studio"
            className="w-7 h-7 rounded-md"
          />
          <p className="text-[9px] font-medium text-white/60">Made with Emoji Studio</p>
        </div>
      </div>
    </div>
  )
}
