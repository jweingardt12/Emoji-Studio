import { WrappedStats, PersonalWrappedStats } from "@/lib/services/wrapped-service"

// ============================================================
// EDGE CASE FLAGS INTERFACE
// ============================================================

export interface EdgeCaseFlags {
  // Low data (graceful fallbacks)
  isLowActivity: boolean // totalEmojis < 20
  isViewerOnly: boolean // personalStats === null
  hasNoTopWords: boolean // topWords.length < 3
  isStaticPurist: boolean // gifPercentage === 0
  isAllAnimation: boolean // gifPercentage === 100
  hasNoStreak: boolean // personalStreak.days <= 1
  isSoloCreator: boolean // totalCreators === 1
  isFirstYear: boolean // !growth.hasYoYData

  // Special patterns (turn into features)
  isPodiumCreator: boolean // rank <= 3
  isSoloLegend: boolean // only creator + rank 1
  isMemeGod: boolean // 100% GIF + 50+ emojis
  isPuristExtreme: boolean // 0% GIF + 30+ emojis
  isNightOwl: boolean // >50% late night
  isEarlyBird: boolean // >50% morning (6-9am)
  isWeekendWarriorExtreme: boolean // >70% weekend
  isStreakDemon: boolean // 30+ day streak
  isBurstArtist: boolean // 50+ emojis in one day
  isNewJoiner: boolean // first emoji in last 3 months
  isOGMember: boolean // first emoji in January
}

// ============================================================
// EDGE CASE DETECTION
// ============================================================

export function detectEdgeCases(
  stats: WrappedStats,
  personalStats: PersonalWrappedStats | null
): EdgeCaseFlags {
  // Viewer-only case
  if (!personalStats) {
    return {
      isLowActivity: false,
      isViewerOnly: true,
      hasNoTopWords: stats.funStats.topWords.length < 3,
      isStaticPurist: false,
      isAllAnimation: false,
      hasNoStreak: false,
      isSoloCreator: stats.overview.totalCreators === 1,
      isFirstYear: !stats.growth.hasYoYData,
      isPodiumCreator: false,
      isSoloLegend: false,
      isMemeGod: false,
      isPuristExtreme: false,
      isNightOwl: false,
      isEarlyBird: false,
      isWeekendWarriorExtreme: false,
      isStreakDemon: false,
      isBurstArtist: false,
      isNewJoiner: false,
      isOGMember: false,
    }
  }

  const totalEmojis = personalStats.totalEmojis

  // Calculate percentages
  const lateNightPercentage =
    totalEmojis > 0 ? (personalStats.lateNightCount / totalEmojis) * 100 : 0

  // Calculate morning percentage from hourly distribution (6-9am buckets)
  const morningBuckets = personalStats.hourlyDistribution.filter(
    (b) => b.hour >= 6 && b.hour <= 9
  )
  const morningPercentage = morningBuckets.reduce((sum, b) => sum + b.percentage, 0)

  // Check if first emoji was in last 3 months
  const threeMonthsAgo = Date.now() / 1000 - 90 * 24 * 60 * 60
  const isNewJoiner =
    personalStats.firstEmoji?.created !== undefined &&
    personalStats.firstEmoji.created > threeMonthsAgo

  // Check if first emoji was in January
  const firstEmojiDate = personalStats.firstEmoji?.created
    ? new Date(personalStats.firstEmoji.created * 1000)
    : null
  const isOGMember = firstEmojiDate?.getMonth() === 0 // January = 0

  return {
    // Low data cases
    isLowActivity: totalEmojis < 20,
    isViewerOnly: false,
    hasNoTopWords: personalStats.topWords.length < 3,
    isStaticPurist: personalStats.gifPercentage === 0,
    isAllAnimation: personalStats.gifPercentage === 100,
    hasNoStreak: personalStats.personalStreak.days <= 1,
    isSoloCreator: stats.overview.totalCreators === 1,
    isFirstYear: !stats.growth.hasYoYData,

    // Special patterns
    isPodiumCreator: personalStats.rank <= 3,
    isSoloLegend:
      stats.overview.totalCreators === 1 && personalStats.rank === 1,
    isMemeGod: personalStats.gifPercentage === 100 && totalEmojis >= 50,
    isPuristExtreme: personalStats.gifPercentage === 0 && totalEmojis >= 30,
    isNightOwl: lateNightPercentage > 50,
    isEarlyBird: morningPercentage > 50,
    isWeekendWarriorExtreme: personalStats.weekendPercentage > 70,
    isStreakDemon: personalStats.personalStreak.days >= 30,
    isBurstArtist: stats.busiestDay.count >= 50,
    isNewJoiner,
    isOGMember: isOGMember ?? false,
  }
}

// ============================================================
// VARIANT SELECTION
// ============================================================

export type PersonalSlideVariant = "bento" | "newcomer" | "achievements"

export function selectPersonalSlideVariant(
  personalStats: PersonalWrappedStats,
  edgeCases: EdgeCaseFlags
): PersonalSlideVariant {
  // Low activity users get the newcomer variant
  if (edgeCases.isLowActivity) {
    return "newcomer"
  }

  // High activity users with multiple achievements
  if (personalStats.totalEmojis >= 50) {
    return "achievements"
  }

  // Default to bento grid
  return "bento"
}

export type MovieSlideVariant = "vhs" | "streaming" | "classic" | "filmstrip"

export function selectMovieSlideVariant(
  stats: WrappedStats,
  personalStats: PersonalWrappedStats | null,
  edgeCases: EdgeCaseFlags
): MovieSlideVariant {
  // For epic productions, use classic poster
  if (personalStats && personalStats.totalEmojis >= 100) {
    return "classic"
  }

  // For diverse quarterly activity, could use filmstrip
  // (Would need more complex logic to detect quarterly diversity)

  // Default to VHS for nostalgic feel
  return "vhs"
}

export type VibeSlideVariant = "arcade" | "trading-card" | "horoscope" | "character-sheet"

export function selectVibeSlideVariant(
  stats: WrappedStats,
  personalStats: PersonalWrappedStats | null,
  edgeCases: EdgeCaseFlags
): VibeSlideVariant {
  // Could add user preference or random selection later
  // For now, default to arcade
  return "arcade"
}

// ============================================================
// SPECIAL DECORATIONS & BADGES
// ============================================================

export type BadgeType =
  | "trophy-gold"
  | "trophy-silver"
  | "trophy-bronze"
  | "purist"
  | "animation-master"
  | "spontaneous"
  | "solo-legend"
  | "streak-demon"
  | "night-owl"
  | "early-bird"
  | "weekend-warrior"
  | "centurion"
  | "trendsetter"
  | "newcomer"
  | "og-member"
  | "burst-artist"

export interface BadgeInfo {
  type: BadgeType
  label: string
  description: string
  icon: string // Lucide icon name
  color: string // Tailwind color class
}

export const BADGE_DEFINITIONS: Record<BadgeType, Omit<BadgeInfo, "type">> = {
  "trophy-gold": {
    label: "#1 Creator",
    description: "Top emoji creator in your workspace",
    icon: "Trophy",
    color: "text-yellow-400",
  },
  "trophy-silver": {
    label: "#2 Creator",
    description: "Second most prolific creator",
    icon: "Medal",
    color: "text-gray-300",
  },
  "trophy-bronze": {
    label: "#3 Creator",
    description: "Third most prolific creator",
    icon: "Award",
    color: "text-amber-600",
  },
  purist: {
    label: "The Purist",
    description: "100% artisanal static emojis",
    icon: "Palette",
    color: "text-slate-400",
  },
  "animation-master": {
    label: "Animation Master",
    description: "100% motion emojis",
    icon: "Sparkles",
    color: "text-purple-400",
  },
  spontaneous: {
    label: "Spontaneous Creator",
    description: "Creates when inspiration strikes",
    icon: "Lightbulb",
    color: "text-yellow-300",
  },
  "solo-legend": {
    label: "Solo Legend",
    description: "The one and only creator",
    icon: "Star",
    color: "text-gold-400",
  },
  "streak-demon": {
    label: "Streak Demon",
    description: "30+ day creation streak",
    icon: "Flame",
    color: "text-orange-500",
  },
  "night-owl": {
    label: "Night Owl",
    description: "Creates in the midnight hours",
    icon: "Moon",
    color: "text-indigo-400",
  },
  "early-bird": {
    label: "Early Bird",
    description: "Morning creativity champion",
    icon: "Sunrise",
    color: "text-amber-400",
  },
  "weekend-warrior": {
    label: "Weekend Warrior",
    description: "70%+ weekend creations",
    icon: "Music",
    color: "text-green-400",
  },
  centurion: {
    label: "Centurion",
    description: "100+ emojis created",
    icon: "Shield",
    color: "text-purple-500",
  },
  trendsetter: {
    label: "Trendsetter",
    description: "20%+ of workspace emojis",
    icon: "TrendingUp",
    color: "text-pink-400",
  },
  newcomer: {
    label: "Newcomer",
    description: "Just started your emoji journey",
    icon: "Rocket",
    color: "text-cyan-400",
  },
  "og-member": {
    label: "OG Member",
    description: "Creating since January",
    icon: "Crown",
    color: "text-gold-500",
  },
  "burst-artist": {
    label: "Burst Artist",
    description: "50+ emojis in a single day",
    icon: "Zap",
    color: "text-yellow-400",
  },
}

export function getEarnedBadges(
  stats: WrappedStats,
  personalStats: PersonalWrappedStats | null,
  edgeCases: EdgeCaseFlags
): BadgeInfo[] {
  if (!personalStats) return []

  const badges: BadgeInfo[] = []

  // Rank badges
  if (personalStats.rank === 1) {
    badges.push({ type: "trophy-gold", ...BADGE_DEFINITIONS["trophy-gold"] })
  } else if (personalStats.rank === 2) {
    badges.push({ type: "trophy-silver", ...BADGE_DEFINITIONS["trophy-silver"] })
  } else if (personalStats.rank === 3) {
    badges.push({ type: "trophy-bronze", ...BADGE_DEFINITIONS["trophy-bronze"] })
  }

  // GIF-related badges
  if (edgeCases.isPuristExtreme || edgeCases.isStaticPurist) {
    badges.push({ type: "purist", ...BADGE_DEFINITIONS.purist })
  }
  if (edgeCases.isMemeGod || edgeCases.isAllAnimation) {
    badges.push({ type: "animation-master", ...BADGE_DEFINITIONS["animation-master"] })
  }

  // Activity pattern badges
  if (edgeCases.hasNoStreak) {
    badges.push({ type: "spontaneous", ...BADGE_DEFINITIONS.spontaneous })
  }
  if (edgeCases.isSoloLegend) {
    badges.push({ type: "solo-legend", ...BADGE_DEFINITIONS["solo-legend"] })
  }
  if (edgeCases.isStreakDemon) {
    badges.push({ type: "streak-demon", ...BADGE_DEFINITIONS["streak-demon"] })
  }
  if (edgeCases.isNightOwl) {
    badges.push({ type: "night-owl", ...BADGE_DEFINITIONS["night-owl"] })
  }
  if (edgeCases.isEarlyBird) {
    badges.push({ type: "early-bird", ...BADGE_DEFINITIONS["early-bird"] })
  }
  if (edgeCases.isWeekendWarriorExtreme) {
    badges.push({ type: "weekend-warrior", ...BADGE_DEFINITIONS["weekend-warrior"] })
  }

  // Volume badges
  if (personalStats.totalEmojis >= 100) {
    badges.push({ type: "centurion", ...BADGE_DEFINITIONS.centurion })
  }
  if (personalStats.percentageOfTotal >= 20) {
    badges.push({ type: "trendsetter", ...BADGE_DEFINITIONS.trendsetter })
  }

  // Timing badges
  if (edgeCases.isNewJoiner) {
    badges.push({ type: "newcomer", ...BADGE_DEFINITIONS.newcomer })
  }
  if (edgeCases.isOGMember) {
    badges.push({ type: "og-member", ...BADGE_DEFINITIONS["og-member"] })
  }
  if (edgeCases.isBurstArtist) {
    badges.push({ type: "burst-artist", ...BADGE_DEFINITIONS["burst-artist"] })
  }

  return badges
}

// ============================================================
// MOVIE GENRE OVERRIDES
// ============================================================

export interface MovieGenreOverride {
  genre: string
  tagline: string
}

export function getMovieGenreOverride(
  edgeCases: EdgeCaseFlags,
  personalStats: PersonalWrappedStats | null
): MovieGenreOverride | null {
  if (!personalStats) return null

  if (edgeCases.isLowActivity) {
    return {
      genre: "An Indie Debut",
      tagline: "Every epic starts somewhere.",
    }
  }

  if (edgeCases.isStaticPurist || edgeCases.isPuristExtreme) {
    return {
      genre: "A Still Life Documentary",
      tagline: "Stillness speaks volumes.",
    }
  }

  if (edgeCases.isAllAnimation || edgeCases.isMemeGod) {
    return {
      genre: "An Animated Feature",
      tagline: "If it doesn't move, is it even art?",
    }
  }

  if (edgeCases.isSoloLegend) {
    return {
      genre: "A One-Person Show",
      tagline: "Written, directed, and starring: you.",
    }
  }

  if (edgeCases.isNightOwl) {
    return {
      genre: "A Midnight Feature",
      tagline: "When the office sleeps, creativity wakes.",
    }
  }

  if (edgeCases.isBurstArtist) {
    return {
      genre: "An Explosive Drama",
      tagline: "One day. One vision. Fifty emojis.",
    }
  }

  return null
}

// ============================================================
// ELEMENT TYPE FOR VIBE TRADING CARD
// ============================================================

export type ElementType = "fire" | "water" | "electric" | "dark" | "light" | "nature"

export const ELEMENT_COLORS: Record<ElementType, { primary: string; secondary: string }> = {
  fire: { primary: "#ff4500", secondary: "#ff8c00" },
  water: { primary: "#1e90ff", secondary: "#00ced1" },
  electric: { primary: "#ffd700", secondary: "#ffff00" },
  dark: { primary: "#483d8b", secondary: "#4b0082" },
  light: { primary: "#fffacd", secondary: "#ffefd5" },
  nature: { primary: "#228b22", secondary: "#32cd32" },
}

export function getPersonaElement(personaType: string): ElementType {
  const elementMap: Record<string, ElementType> = {
    "streak-demon": "fire",
    "burst-artist": "fire",
    "meme-lord": "electric",
    sprinter: "electric",
    insomniac: "dark",
    "night-shift": "dark",
    "dawn-patrol": "light",
    trendsetter: "light",
    "weekend-warrior": "nature",
    "lunch-break-artist": "nature",
    "steady-hand": "water",
    minimalist: "water",
    novelist: "water",
    purist: "water",
    archivist: "nature",
    backbone: "fire",
  }

  return elementMap[personaType] || "water"
}
