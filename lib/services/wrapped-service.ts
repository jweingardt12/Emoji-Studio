import { Emoji } from "./emoji-service"
import { hasValidUrl } from "@/lib/utils/image-proxy"

// ============================================================
// INTERFACES
// ============================================================

export interface HourlyDistributionBucket {
  hour: number // Start hour (0, 3, 6, 9, 12, 15, 18, 21)
  label: string // Human-readable label
  count: number
  percentage: number
}

export interface WrappedStats {
  year: number
  generatedAt: number
  overview: WrappedOverviewStats
  topCreators: TopCreator[]
  busiestDay: BusiestPeriod
  busiestWeek: BusiestPeriod
  peakDayOfWeek: DayOfWeekStat
  peakHourOfDay: HourOfDayStat
  hourlyDistribution: HourlyDistributionBucket[] // 8 time buckets for radar chart
  funStats: WrappedFunStats
  growth: WrappedGrowthStats
  monthlyBreakdown: MonthlyCount[]
  monthlyTopCreators: MonthlyTopCreator[]
  highlights: WrappedHighlight[]
}

export interface WrappedOverviewStats {
  totalEmojis: number
  totalCreators: number
  totalGifs: number
  totalImages: number
  gifPercentage: number
  averagePerWeek: number
  averagePerCreator: number
}

export interface TopCreator {
  userId: string
  displayName: string
  emojiCount: number
  gifCount: number
  imageCount: number
  rank: number
  percentageOfTotal: number
  topEmojis: Emoji[]
}

export interface BusiestPeriod {
  date: string
  timestamp: number
  count: number
  emojis: Emoji[]
}

export interface DayOfWeekStat {
  day: string
  dayIndex: number
  count: number
  percentage: number
}

export interface HourOfDayStat {
  hour: number
  label: string
  count: number
  percentage: number
}

export interface MonthlyCount {
  month: string
  monthIndex: number
  count: number
}

export interface MonthlyTopCreator {
  month: string
  monthIndex: number
  topCreator: {
    userId: string
    displayName: string
    count: number
    topEmoji: Emoji | null
  } | null
  totalCount: number
}

export interface WordFrequency {
  word: string
  count: number
}

export interface WrappedFunStats {
  longestName: { emoji: Emoji; length: number } | null
  shortestName: { emoji: Emoji; length: number } | null
  firstEmojiOfYear: Emoji | null
  lastEmojiOfYear: Emoji | null
  mostCommonWord: { word: string; count: number } | null
  topWords: WordFrequency[]
  lateNightCount: number // Emojis created 12am-5am
  weekendPercentage: number
  longestStreak: { days: number; startDate: string; endDate: string }
}

export interface WrappedGrowthStats {
  hasYoYData: boolean
  previousYearTotal: number
  currentYearTotal: number
  growthPercentage: number
  growthTrend: "up" | "down" | "stable"
}

export interface WrappedHighlight {
  id: string
  title: string
  description: string
  value: string | number
  emoji?: Emoji
}

export interface PersonalWrappedStats {
  userId: string
  displayName: string
  totalEmojis: number
  rank: number
  totalCreators: number
  percentageOfTotal: number
  topEmojis: Emoji[]
  firstEmoji: Emoji | null
  lastEmoji: Emoji | null
  gifCount: number
  imageCount: number
  gifPercentage: number
  favoriteDayOfWeek: DayOfWeekStat | null
  favoriteHour: HourOfDayStat | null
  personalStreak: { days: number; startDate: string; endDate: string }
  monthlyBreakdown: MonthlyCount[]
  lateNightCount: number
  weekendPercentage: number
  comparedToAverage: number // User's count vs workspace avg per creator
  hourlyDistribution: HourlyDistributionBucket[] // 8 time buckets for radar chart
  topWords: WordFrequency[]
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const STOP_WORDS = new Set(["the", "and", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "this", "that"])

// Labels for 8 time buckets (3-hour intervals)
const HOUR_BUCKET_LABELS: Record<number, string> = {
  0: "12-3AM",
  3: "3-6AM",
  6: "6-9AM",
  9: "9AM-12PM",
  12: "12-3PM",
  15: "3-6PM",
  18: "6-9PM",
  21: "9PM-12AM",
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getDateKey(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function getWeekKey(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  // Get the Monday of the week
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date)
  monday.setDate(diff)
  return `${monday.getFullYear()}-W${String(Math.ceil(diff / 7)).padStart(2, "0")}`
}

function isGif(url: string): boolean {
  return url?.toLowerCase().includes(".gif") ?? false
}

function parseEmojiNameWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
}

// ============================================================
// SMART EMOJI SELECTION ALGORITHM
// ============================================================

// Generic/low-quality name patterns to penalize
const GENERIC_NAME_PATTERNS = ['test', 'emoji', 'new', 'temp', 'lol', 'asdf', 'test1', 'test2', 'untitled', 'copy']

/**
 * Calculate a quality score for an emoji based on multiple factors:
 * - Name creativity (longer, more thoughtful names score higher)
 * - GIF preference (animated emojis are more engaging)
 * - Recency bonus (slight preference for newer emojis)
 * - Penalize generic/test names
 */
function scoreEmoji(emoji: Emoji, referenceDate?: number): number {
  let score = 0
  const name = emoji.name.toLowerCase()

  // 1. Name Creativity (longer names = more thoughtful)
  const nameLength = emoji.name.length
  if (nameLength >= 15) score += 30        // Very creative (e.g., "party-parrot-dancing")
  else if (nameLength >= 10) score += 20   // Good effort (e.g., "happy-face")
  else if (nameLength >= 6) score += 10    // Standard (e.g., "smile")
  // Short names (< 6 chars) get no bonus

  // 2. GIF Preference (animated = more engaging visually)
  if (emoji.url?.toLowerCase().includes('.gif')) {
    score += 25
  }

  // 3. Recency Bonus (newer emojis slightly preferred)
  if (emoji.created && referenceDate) {
    const ageInDays = Math.floor((referenceDate - emoji.created) / (24 * 60 * 60))
    if (ageInDays < 30) score += 15          // Last month
    else if (ageInDays < 90) score += 10     // Last quarter
    else if (ageInDays < 180) score += 5     // Last 6 months
    // Older emojis get no recency bonus
  }

  // 4. Name Uniqueness - penalize generic/test names
  if (GENERIC_NAME_PATTERNS.some(pattern => name.includes(pattern))) {
    score -= 20
  }

  // 5. Name has meaningful words (contains underscores/hyphens = compound name)
  if (name.includes('-') || name.includes('_')) {
    score += 10  // Compound names like "party-parrot" show more thought
  }

  // 6. Avoid purely numeric names
  if (/^\d+$/.test(name) || /^[a-z]\d+$/.test(name)) {
    score -= 15  // Names like "123" or "a1" are low quality
  }

  return score
}

/**
 * Select top emojis using smart scoring with diversity filtering
 * Ensures variety by avoiding emojis with similar name prefixes
 */
function selectTopEmojis(emojis: Emoji[], count: number = 5, referenceDate?: number): Emoji[] {
  if (emojis.length === 0) return []
  if (emojis.length <= count) return emojis

  // Use current timestamp if no reference date provided
  const refDate = referenceDate || Math.floor(Date.now() / 1000)

  // Score all emojis
  const scored = emojis.map(emoji => ({
    emoji,
    score: scoreEmoji(emoji, refDate)
  }))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Select top N ensuring diversity (no visual duplicates)
  const selected: Emoji[] = []
  const usedPrefixes = new Set<string>()

  for (const { emoji } of scored) {
    if (selected.length >= count) break

    // Check for diversity: avoid emojis starting with same 3-char prefix
    // This prevents selecting "parrot1", "parrot2", "parrot3" all at once
    const prefix = emoji.name.slice(0, 3).toLowerCase()

    if (!usedPrefixes.has(prefix)) {
      selected.push(emoji)
      usedPrefixes.add(prefix)
    }
  }

  // If we couldn't fill the count due to diversity rules, add more from remaining
  if (selected.length < count) {
    for (const { emoji } of scored) {
      if (selected.length >= count) break
      if (!selected.includes(emoji)) {
        selected.push(emoji)
      }
    }
  }

  return selected
}

// ============================================================
// MAIN CALCULATION FUNCTIONS
// ============================================================

/**
 * Filter emojis to a specific year
 */
export function filterEmojisByYear(emojis: Emoji[], year: number, includeAliases = false): Emoji[] {
  const startOfYear = new Date(year, 0, 1).getTime() / 1000
  const endOfYear = new Date(year + 1, 0, 1).getTime() / 1000

  return emojis.filter((emoji) => {
    if (!emoji.created) return false
    if (!includeAliases && emoji.is_alias) return false
    return emoji.created >= startOfYear && emoji.created < endOfYear
  })
}

/**
 * Check if there's sufficient data for a meaningful Wrapped
 */
export function hasMinimumDataForWrapped(emojis: Emoji[], year: number, minimumEmojis = 10): boolean {
  const yearEmojis = filterEmojisByYear(emojis, year)
  return yearEmojis.length >= minimumEmojis
}

/**
 * Get available years for Wrapped generation
 */
export function getAvailableWrappedYears(emojis: Emoji[]): number[] {
  const years = new Set<number>()
  emojis.forEach((emoji) => {
    if (emoji.created && !emoji.is_alias) {
      const year = new Date(emoji.created * 1000).getFullYear()
      years.add(year)
    }
  })
  return Array.from(years).sort((a, b) => b - a) // Most recent first
}

/**
 * Calculate complete Wrapped statistics for a year
 */
export function calculateWrappedStats(emojis: Emoji[], year: number): WrappedStats | null {
  const yearEmojis = filterEmojisByYear(emojis, year)

  if (yearEmojis.length < 10) {
    return null
  }

  // Sort by creation date
  const sortedEmojis = [...yearEmojis].sort((a, b) => (a.created || 0) - (b.created || 0))

  // Initialize aggregators
  const creatorData: Record<string, { count: number; gifs: number; images: number; emojis: Emoji[] }> = {}
  const dailyCounts: Record<string, { count: number; emojis: Emoji[] }> = {}
  const weeklyCounts: Record<string, { count: number; emojis: Emoji[] }> = {}
  const weekdayCounts = Array(7).fill(0)
  const hourCounts = Array(24).fill(0)
  const monthlyCounts = Array(12).fill(0)
  const wordCounts: Record<string, number> = {}
  const datesWithEmojis = new Set<string>()
  // Monthly creator tracking: monthIndex -> { creatorId -> { count, emojis } }
  const monthlyCreatorData: Record<number, Record<string, { count: number; emojis: Emoji[]; displayName: string }>> = {}

  let gifCount = 0
  let imageCount = 0
  let lateNightCount = 0
  let weekendCount = 0
  let longestName: Emoji | null = null
  let shortestName: Emoji | null = null

  // Single pass aggregation
  sortedEmojis.forEach((emoji) => {
    if (!emoji.created) return

    const date = new Date(emoji.created * 1000)
    const dateKey = getDateKey(emoji.created)
    const weekKey = getWeekKey(emoji.created)
    const dayOfWeek = date.getDay()
    const hour = date.getHours()
    const month = date.getMonth()
    const isGifEmoji = isGif(emoji.url)

    // Count GIFs vs Images
    if (isGifEmoji) {
      gifCount++
    } else {
      imageCount++
    }

    // Creator data
    const creatorId = emoji.user_id || "unknown"
    if (!creatorData[creatorId]) {
      creatorData[creatorId] = { count: 0, gifs: 0, images: 0, emojis: [] }
    }
    creatorData[creatorId].count++
    if (isGifEmoji) creatorData[creatorId].gifs++
    else creatorData[creatorId].images++
    if (creatorData[creatorId].emojis.length < 10) {
      creatorData[creatorId].emojis.push(emoji)
    }

    // Daily counts
    if (!dailyCounts[dateKey]) {
      dailyCounts[dateKey] = { count: 0, emojis: [] }
    }
    dailyCounts[dateKey].count++
    if (dailyCounts[dateKey].emojis.length < 10) {
      dailyCounts[dateKey].emojis.push(emoji)
    }
    datesWithEmojis.add(dateKey)

    // Weekly counts
    if (!weeklyCounts[weekKey]) {
      weeklyCounts[weekKey] = { count: 0, emojis: [] }
    }
    weeklyCounts[weekKey].count++
    if (weeklyCounts[weekKey].emojis.length < 10) {
      weeklyCounts[weekKey].emojis.push(emoji)
    }

    // Time-based counts
    weekdayCounts[dayOfWeek]++
    hourCounts[hour]++
    monthlyCounts[month]++

    // Monthly creator tracking
    if (!monthlyCreatorData[month]) {
      monthlyCreatorData[month] = {}
    }
    if (!monthlyCreatorData[month][creatorId]) {
      monthlyCreatorData[month][creatorId] = { count: 0, emojis: [], displayName: emoji.user_display_name || creatorId.slice(0, 8) }
    }
    monthlyCreatorData[month][creatorId].count++
    if (monthlyCreatorData[month][creatorId].emojis.length < 5) {
      monthlyCreatorData[month][creatorId].emojis.push(emoji)
    }

    // Weekend count (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount++
    }

    // Late night (12am - 5am)
    if (hour >= 0 && hour < 5) {
      lateNightCount++
    }

    // Word frequency
    const words = parseEmojiNameWords(emoji.name)
    words.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    })

    // Name length tracking
    if (!longestName || emoji.name.length > longestName.name.length) {
      longestName = emoji
    }
    if (!shortestName || emoji.name.length < shortestName.name.length) {
      shortestName = emoji
    }
  })

  // Calculate top creators
  const referenceDate = Math.floor(Date.now() / 1000)
  const topCreators: TopCreator[] = Object.entries(creatorData)
    .map(([userId, data]) => {
      const firstEmoji = data.emojis[0]
      // Filter to emojis with valid URLs for display
      const validEmojis = data.emojis.filter(hasValidUrl)
      // Use smart emoji selection instead of just first 5
      const selectedEmojis = selectTopEmojis(validEmojis, 5, referenceDate)
      return {
        userId,
        displayName: firstEmoji?.user_display_name || userId.slice(0, 8),
        emojiCount: data.count,
        gifCount: data.gifs,
        imageCount: data.images,
        rank: 0,
        percentageOfTotal: Math.round((data.count / sortedEmojis.length) * 100),
        topEmojis: selectedEmojis,
      }
    })
    .sort((a, b) => b.emojiCount - a.emojiCount)
    .slice(0, 10)
    .map((creator, index) => ({ ...creator, rank: index + 1 }))

  // Find busiest day
  const busiestDayEntry = Object.entries(dailyCounts).reduce(
    (max, [date, data]) => (data.count > max.count ? { date, ...data } : max),
    { date: "", count: 0, emojis: [] as Emoji[] }
  )
  const busiestDay: BusiestPeriod = {
    date: formatDate(new Date(busiestDayEntry.date).getTime() / 1000),
    timestamp: new Date(busiestDayEntry.date).getTime() / 1000,
    count: busiestDayEntry.count,
    emojis: busiestDayEntry.emojis.filter(hasValidUrl).slice(0, 5),
  }

  // Find busiest week
  const busiestWeekEntry = Object.entries(weeklyCounts).reduce(
    (max, [week, data]) => (data.count > max.count ? { week, ...data } : max),
    { week: "", count: 0, emojis: [] as Emoji[] }
  )
  const busiestWeek: BusiestPeriod = {
    date: `Week of ${busiestWeekEntry.week}`,
    timestamp: 0,
    count: busiestWeekEntry.count,
    emojis: busiestWeekEntry.emojis.filter(hasValidUrl).slice(0, 5),
  }

  // Peak day of week
  const peakDayIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts))
  const peakDayOfWeek: DayOfWeekStat = {
    day: DAY_NAMES[peakDayIndex],
    dayIndex: peakDayIndex,
    count: weekdayCounts[peakDayIndex],
    percentage: Math.round((weekdayCounts[peakDayIndex] / sortedEmojis.length) * 100),
  }

  // Peak hour of day
  const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts))
  const peakHourOfDay: HourOfDayStat = {
    hour: peakHourIndex,
    label: `${peakHourIndex % 12 || 12}${peakHourIndex < 12 ? "AM" : "PM"} - ${(peakHourIndex + 1) % 12 || 12}${peakHourIndex + 1 < 12 ? "AM" : "PM"}`,
    count: hourCounts[peakHourIndex],
    percentage: Math.round((hourCounts[peakHourIndex] / sortedEmojis.length) * 100),
  }

  // Monthly breakdown
  const monthlyBreakdown: MonthlyCount[] = MONTH_NAMES.map((month, index) => ({
    month,
    monthIndex: index,
    count: monthlyCounts[index],
  }))

  // Monthly top creators - find who created the most emojis each month
  const monthlyTopCreators: MonthlyTopCreator[] = MONTH_NAMES.map((month, monthIndex) => {
    const monthCreators = monthlyCreatorData[monthIndex] || {}
    const creatorsArray = Object.entries(monthCreators)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.count - a.count)

    const topCreator = creatorsArray[0]
    const validEmojis = topCreator?.emojis.filter(hasValidUrl) || []

    return {
      month,
      monthIndex,
      topCreator: topCreator
        ? {
            userId: topCreator.userId,
            displayName: topCreator.displayName,
            count: topCreator.count,
            topEmoji: validEmojis[0] || null,
          }
        : null,
      totalCount: monthlyCounts[monthIndex],
    }
  })

  // Top words
  const sortedWords = Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Calculate longest streak
  const longestStreak = calculateLongestStreak(datesWithEmojis, year)

  // Fun stats
  const funStats: WrappedFunStats = {
    longestName: longestName ? { emoji: longestName, length: (longestName as Emoji).name.length } : null,
    shortestName: shortestName ? { emoji: shortestName, length: (shortestName as Emoji).name.length } : null,
    firstEmojiOfYear: sortedEmojis[0] || null,
    lastEmojiOfYear: sortedEmojis[sortedEmojis.length - 1] || null,
    mostCommonWord: sortedWords[0] || null,
    topWords: sortedWords,
    lateNightCount,
    weekendPercentage: Math.round((weekendCount / sortedEmojis.length) * 100),
    longestStreak,
  }

  // Growth stats (year-over-year)
  const previousYearEmojis = filterEmojisByYear(emojis, year - 1)
  const hasYoYData = previousYearEmojis.length > 0
  const growthPercentage = hasYoYData ? Math.round(((sortedEmojis.length - previousYearEmojis.length) / previousYearEmojis.length) * 100) : 0

  const growth: WrappedGrowthStats = {
    hasYoYData,
    previousYearTotal: previousYearEmojis.length,
    currentYearTotal: sortedEmojis.length,
    growthPercentage,
    growthTrend: growthPercentage > 10 ? "up" : growthPercentage < -10 ? "down" : "stable",
  }

  // Overview stats
  const weeksInYear = 52
  const overview: WrappedOverviewStats = {
    totalEmojis: sortedEmojis.length,
    totalCreators: Object.keys(creatorData).length,
    totalGifs: gifCount,
    totalImages: imageCount,
    gifPercentage: Math.round((gifCount / sortedEmojis.length) * 100),
    averagePerWeek: Math.round(sortedEmojis.length / weeksInYear),
    averagePerCreator: Math.round(sortedEmojis.length / Object.keys(creatorData).length),
  }

  // Generate highlights
  const highlights = generateHighlights(overview, topCreators, busiestDay, funStats, growth)

  // Build hourly distribution buckets (8 x 3-hour intervals)
  const hourlyDistribution: HourlyDistributionBucket[] = [0, 3, 6, 9, 12, 15, 18, 21].map((startHour) => {
    const count = hourCounts[startHour] + hourCounts[startHour + 1] + hourCounts[startHour + 2]
    return {
      hour: startHour,
      label: HOUR_BUCKET_LABELS[startHour],
      count,
      percentage: Math.round((count / sortedEmojis.length) * 100),
    }
  })

  return {
    year,
    generatedAt: Math.floor(Date.now() / 1000),
    overview,
    topCreators,
    busiestDay,
    busiestWeek,
    peakDayOfWeek,
    peakHourOfDay,
    hourlyDistribution,
    funStats,
    growth,
    monthlyBreakdown,
    monthlyTopCreators,
    highlights,
  }
}

/**
 * Calculate the longest streak of consecutive days with emoji creation
 */
function calculateLongestStreak(datesWithEmojis: Set<string>, year: number): { days: number; startDate: string; endDate: string } {
  if (datesWithEmojis.size === 0) {
    return { days: 0, startDate: "", endDate: "" }
  }

  const sortedDates = Array.from(datesWithEmojis).sort()
  let maxStreak = 1
  let currentStreak = 1
  let maxStart = sortedDates[0]
  let maxEnd = sortedDates[0]
  let currentStart = sortedDates[0]

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1])
    const currDate = new Date(sortedDates[i])
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      currentStreak++
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
        maxStart = currentStart
        maxEnd = sortedDates[i]
      }
    } else {
      currentStreak = 1
      currentStart = sortedDates[i]
    }
  }

  return {
    days: maxStreak,
    startDate: formatDate(new Date(maxStart).getTime() / 1000),
    endDate: formatDate(new Date(maxEnd).getTime() / 1000),
  }
}

/**
 * Generate curated highlights for the wrapped experience
 */
function generateHighlights(
  overview: WrappedOverviewStats,
  topCreators: TopCreator[],
  busiestDay: BusiestPeriod,
  funStats: WrappedFunStats,
  growth: WrappedGrowthStats
): WrappedHighlight[] {
  const highlights: WrappedHighlight[] = []

  // Total emojis highlight
  highlights.push({
    id: "total-emojis",
    title: "Emojis Created",
    description: `Your workspace created ${overview.totalEmojis} custom emojis this year`,
    value: overview.totalEmojis,
  })

  // Top creator highlight
  if (topCreators.length > 0) {
    const topCreator = topCreators[0]
    highlights.push({
      id: "top-creator",
      title: "Emoji Champion",
      description: `${topCreator.displayName} created ${topCreator.emojiCount} emojis (${topCreator.percentageOfTotal}% of all)`,
      value: topCreator.emojiCount,
      emoji: topCreator.topEmojis[0],
    })
  }

  // Busiest day highlight
  highlights.push({
    id: "busiest-day",
    title: "Busiest Day",
    description: `${busiestDay.date} - ${busiestDay.count} emojis created in a single day!`,
    value: busiestDay.count,
    emoji: busiestDay.emojis[0],
  })

  // Growth highlight
  if (growth.hasYoYData) {
    const emoji = growth.growthTrend === "up" ? "up" : growth.growthTrend === "down" ? "down" : "neutral"
    highlights.push({
      id: "growth",
      title: growth.growthTrend === "up" ? "Growing Strong" : growth.growthTrend === "down" ? "Taking a Break" : "Steady State",
      description: `${Math.abs(growth.growthPercentage)}% ${growth.growthTrend === "up" ? "more" : growth.growthTrend === "down" ? "fewer" : "similar"} emojis compared to last year`,
      value: `${growth.growthPercentage > 0 ? "+" : ""}${growth.growthPercentage}%`,
    })
  }

  // Streak highlight
  if (funStats.longestStreak.days > 1) {
    highlights.push({
      id: "streak",
      title: "Hot Streak",
      description: `${funStats.longestStreak.days} days in a row with new emojis`,
      value: funStats.longestStreak.days,
    })
  }

  // Late night highlight
  if (funStats.lateNightCount > 10) {
    highlights.push({
      id: "late-night",
      title: "Night Owls",
      description: `${funStats.lateNightCount} emojis created between midnight and 5am`,
      value: funStats.lateNightCount,
    })
  }

  return highlights
}

/**
 * Calculate personal stats for the current user
 * @param allEmojis All emojis in the workspace
 * @param userEmojis Emojis created by the current user (can_delete === true)
 * @param year The year to calculate stats for
 */
export function calculatePersonalStats(
  allEmojis: Emoji[],
  userEmojis: Emoji[],
  year: number
): PersonalWrappedStats | null {
  // Filter to the target year
  const yearEmojis = filterEmojisByYear(allEmojis, year)
  const userYearEmojis = filterEmojisByYear(userEmojis, year)

  // No personal emojis this year
  if (userYearEmojis.length === 0) {
    return null
  }

  // Sort by creation date
  const sortedUserEmojis = [...userYearEmojis].sort((a, b) => (a.created || 0) - (b.created || 0))

  // Calculate user's rank among all creators
  const creatorCounts: Record<string, number> = {}
  yearEmojis.forEach((emoji) => {
    const creatorId = emoji.user_id || "unknown"
    creatorCounts[creatorId] = (creatorCounts[creatorId] || 0) + 1
  })

  const totalCreators = Object.keys(creatorCounts).length
  const sortedCreators = Object.entries(creatorCounts)
    .sort(([, a], [, b]) => b - a)

  // Find user's rank (using the first user emoji to get their ID)
  const userId = sortedUserEmojis[0]?.user_id || "unknown"
  const displayName = sortedUserEmojis[0]?.user_display_name || "You"
  const userRank = sortedCreators.findIndex(([id]) => id === userId) + 1

  // Calculate aggregates
  const datesWithEmojis = new Set<string>()
  const weekdayCounts = Array(7).fill(0)
  const hourCounts = Array(24).fill(0)
  const monthlyCounts = Array(12).fill(0)
  const wordCounts: Record<string, number> = {}
  let gifCount = 0
  let imageCount = 0
  let lateNightCount = 0
  let weekendCount = 0

  sortedUserEmojis.forEach((emoji) => {
    if (!emoji.created) return

    const date = new Date(emoji.created * 1000)
    const dateKey = getDateKey(emoji.created)
    const dayOfWeek = date.getDay()
    const hour = date.getHours()
    const month = date.getMonth()
    const isGifEmoji = isGif(emoji.url)

    datesWithEmojis.add(dateKey)
    weekdayCounts[dayOfWeek]++
    hourCounts[hour]++
    monthlyCounts[month]++

    if (isGifEmoji) {
      gifCount++
    } else {
      imageCount++
    }

    // Late night (12am - 5am)
    if (hour >= 0 && hour < 5) {
      lateNightCount++
    }

    // Weekend (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendCount++
    }

    // Word frequency
    const words = parseEmojiNameWords(emoji.name)
    words.forEach((word) => {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    })
  })

  // Calculate top words
  const topWords: WordFrequency[] = Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Calculate hourly distribution buckets (8 buckets of 3 hours)
  const hourlyDistribution: HourlyDistributionBucket[] = []
  for (let i = 0; i < 8; i++) {
    const startHour = i * 3
    const endHour = startHour + 2
    const label = `${startHour === 0 ? "12" : startHour > 12 ? startHour - 12 : startHour}${startHour < 12 ? "am" : "pm"}`

    // Sum counts for the 3 hours in this bucket
    let count = 0
    for (let h = startHour; h <= endHour; h++) {
      count += hourCounts[h]
    }

    hourlyDistribution.push({
      hour: startHour,
      label,
      count,
      percentage: sortedUserEmojis.length > 0 ? Math.round((count / sortedUserEmojis.length) * 100) : 0,
    })
  }

  // Peak day of week for user
  const peakDayIndex = weekdayCounts.indexOf(Math.max(...weekdayCounts))
  const favoriteDayOfWeek: DayOfWeekStat | null = weekdayCounts[peakDayIndex] > 0 ? {
    day: DAY_NAMES[peakDayIndex],
    dayIndex: peakDayIndex,
    count: weekdayCounts[peakDayIndex],
    percentage: Math.round((weekdayCounts[peakDayIndex] / sortedUserEmojis.length) * 100),
  } : null

  // Peak hour for user
  const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts))
  const favoriteHour: HourOfDayStat | null = hourCounts[peakHourIndex] > 0 ? {
    hour: peakHourIndex,
    label: `${peakHourIndex % 12 || 12}${peakHourIndex < 12 ? "AM" : "PM"}`,
    count: hourCounts[peakHourIndex],
    percentage: Math.round((hourCounts[peakHourIndex] / sortedUserEmojis.length) * 100),
  } : null

  // Monthly breakdown for user
  const monthlyBreakdown: MonthlyCount[] = MONTH_NAMES.map((month, index) => ({
    month,
    monthIndex: index,
    count: monthlyCounts[index],
  }))

  // Personal streak
  const personalStreak = calculateLongestStreak(datesWithEmojis, year)

  // Compare to workspace average
  const workspaceAverage = yearEmojis.length / totalCreators
  const comparedToAverage = Math.round((sortedUserEmojis.length / workspaceAverage) * 100)

  // Smart emoji selection: use scoring algorithm for best emojis, not just recency
  const validUserEmojis = sortedUserEmojis.filter(hasValidUrl)
  const personalReferenceDate = Math.floor(Date.now() / 1000)
  const validTopEmojis = selectTopEmojis(validUserEmojis, 5, personalReferenceDate)

  return {
    userId,
    displayName,
    totalEmojis: sortedUserEmojis.length,
    rank: userRank,
    totalCreators,
    percentageOfTotal: Math.round((sortedUserEmojis.length / yearEmojis.length) * 100),
    topEmojis: validTopEmojis, // Most recent 5 with valid URLs
    firstEmoji: sortedUserEmojis[0] || null,
    lastEmoji: sortedUserEmojis[sortedUserEmojis.length - 1] || null,
    gifCount,
    imageCount,
    gifPercentage: Math.round((gifCount / sortedUserEmojis.length) * 100),
    favoriteDayOfWeek,
    favoriteHour,
    personalStreak,
    monthlyBreakdown,
    lateNightCount,
    weekendPercentage: Math.round((weekendCount / sortedUserEmojis.length) * 100),
    comparedToAverage,
    hourlyDistribution,
    topWords,
  }
}
