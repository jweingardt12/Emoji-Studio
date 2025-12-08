import { Emoji } from "./emoji-service"
import { WrappedStats, PersonalWrappedStats, WordFrequency } from "./wrapped-service"

// ============================================================
// TYPES
// ============================================================

export type PersonaType =
  | "insomniac"
  | "meme-lord"
  | "minimalist"
  | "novelist"
  | "streak-demon"
  | "weekend-warrior"
  | "dawn-patrol"
  | "burst-artist"
  | "backbone"
  | "steady-hand"
  // Extended personas
  | "purist"
  | "archivist"
  | "trendsetter"
  | "night-shift"
  | "lunch-break-artist"
  | "sprinter"
  // New expanded personas
  | "curator"
  | "nocturnal"
  | "comeback-kid"
  | "silent-legend"
  | "reaction-master"
  | "wordsmith"
  | "speedrunner"
  | "marathon-runner"
  | "seasonal"
  | "legacy-builder"

export interface PersonaStats {
  label: string
  value: number // 0-100
}

export interface Persona {
  type: PersonaType
  name: string
  icon: string // Lucide icon name
  description: string
  gradient: [string, string]
  emoji: string // Decorative emoji for the persona
  // Arcade-style stats for character select screen
  stats: [PersonaStats, PersonaStats, PersonaStats]
  // Tarot card number for fortune slide
  tarotNumber: string
}

export interface Haiku {
  lines: [string, string, string]
  syllables: [number, number, number]
}

export interface MoviePoster {
  title: string
  tagline: string
  genre: string
  runtime: number
  rating: number // 0-5 stars
  year: number
}

export interface Prophecy {
  text: string
  disclaimer: string
}

// ============================================================
// PERSONA DEFINITIONS
// ============================================================

// Arcade-style color palette (NOT purple/cyan AI slop)
const ARCADE_COLORS = {
  hotPink: "#ff2a6d",
  acidGreen: "#05ffa1",
  electricBlue: "#01cdfe",
  chromeYellow: "#fffb96",
  deepBlack: "#0a0a0a",
  neonOrange: "#ff6b35",
  retroRed: "#ff0055",
  synthPurple: "#b537f2", // Only as accent, not primary
  mintGreen: "#3dffc0",
  gold: "#ffd700",
}

const PERSONAS: Record<PersonaType, Omit<Persona, "type">> = {
  insomniac: {
    name: "The Insomniac",
    icon: "Moon",
    description: "Sleep is for people without deadlines. Or ideas.",
    gradient: [ARCADE_COLORS.deepBlack, ARCADE_COLORS.synthPurple],
    emoji: "🦇",
    stats: [
      { label: "NIGHT", value: 92 },
      { label: "CHAOS", value: 78 },
      { label: "CAFFEINE", value: 100 },
    ],
    tarotNumber: "XVIII",
  },
  "meme-lord": {
    name: "The Meme Lord",
    icon: "Crown",
    description: "If it doesn't move, is it even an emoji? Debatable.",
    gradient: [ARCADE_COLORS.hotPink, ARCADE_COLORS.chromeYellow],
    emoji: "👑",
    stats: [
      { label: "GIFS", value: 95 },
      { label: "VIBES", value: 88 },
      { label: "CHAOS", value: 75 },
    ],
    tarotNumber: "I",
  },
  minimalist: {
    name: "The Minimalist",
    icon: "Minimize2",
    description: "why waste letter when few do trick",
    gradient: ["#2d2d2d", "#4a4a4a"],
    emoji: "✨",
    stats: [
      { label: "BREVITY", value: 100 },
      { label: "FOCUS", value: 90 },
      { label: "EFFORT", value: 15 },
    ],
    tarotNumber: "0",
  },
  novelist: {
    name: "The Novelist",
    icon: "BookOpen",
    description: "Every emoji deserves a Wikipedia page.",
    gradient: [ARCADE_COLORS.neonOrange, ARCADE_COLORS.chromeYellow],
    emoji: "📖",
    stats: [
      { label: "WORDS", value: 100 },
      { label: "DETAIL", value: 95 },
      { label: "SPEED", value: 35 },
    ],
    tarotNumber: "IX",
  },
  "streak-demon": {
    name: "The Streak Demon",
    icon: "Flame",
    description: "You don't break streaks. Streaks break around you.",
    gradient: [ARCADE_COLORS.retroRed, ARCADE_COLORS.neonOrange],
    emoji: "🔥",
    stats: [
      { label: "STREAK", value: 100 },
      { label: "WILL", value: 95 },
      { label: "REST", value: 5 },
    ],
    tarotNumber: "XI",
  },
  "weekend-warrior": {
    name: "The Weekend Warrior",
    icon: "Music",
    description: "9-to-5 is for work. Saturdays are for art.",
    gradient: [ARCADE_COLORS.acidGreen, ARCADE_COLORS.mintGreen],
    emoji: "🎸",
    stats: [
      { label: "WEEKEND", value: 95 },
      { label: "VIBES", value: 85 },
      { label: "WEEKDAY", value: 20 },
    ],
    tarotNumber: "VII",
  },
  "dawn-patrol": {
    name: "The Dawn Patrol",
    icon: "Sunrise",
    description: "While they slept, you created. Respect.",
    gradient: [ARCADE_COLORS.chromeYellow, ARCADE_COLORS.neonOrange],
    emoji: "🌅",
    stats: [
      { label: "EARLY", value: 100 },
      { label: "FOCUS", value: 90 },
      { label: "SLEEP", value: 45 },
    ],
    tarotNumber: "XIX",
  },
  "burst-artist": {
    name: "The Burst Artist",
    icon: "Zap",
    description: "Some days you're just... possessed.",
    gradient: [ARCADE_COLORS.electricBlue, ARCADE_COLORS.acidGreen],
    emoji: "💥",
    stats: [
      { label: "BURST", value: 100 },
      { label: "CHAOS", value: 85 },
      { label: "STEADY", value: 25 },
    ],
    tarotNumber: "XVI",
  },
  backbone: {
    name: "The Backbone",
    icon: "Dumbbell",
    description: "This workspace would be empty without you. Literally.",
    gradient: [ARCADE_COLORS.gold, ARCADE_COLORS.neonOrange],
    emoji: "🏋️",
    stats: [
      { label: "OUTPUT", value: 100 },
      { label: "CARRY", value: 95 },
      { label: "CHILL", value: 30 },
    ],
    tarotNumber: "VIII",
  },
  "steady-hand": {
    name: "The Steady Hand",
    icon: "Target",
    description: "Consistent. Reliable. Underrated.",
    gradient: [ARCADE_COLORS.electricBlue, ARCADE_COLORS.mintGreen],
    emoji: "🎯",
    stats: [
      { label: "STEADY", value: 90 },
      { label: "CHILL", value: 80 },
      { label: "CHAOS", value: 25 },
    ],
    tarotNumber: "XIV",
  },
  // New personas
  purist: {
    name: "The Purist",
    icon: "Palette",
    description: "Static is the new animated. You're an artist, not a TikToker.",
    gradient: ["#1a1a1a", "#333333"],
    emoji: "🎨",
    stats: [
      { label: "TASTE", value: 100 },
      { label: "GIFS", value: 5 },
      { label: "CLASS", value: 95 },
    ],
    tarotNumber: "III",
  },
  archivist: {
    name: "The Archivist",
    icon: "Archive",
    description: "Your emoji library has better organization than your actual files.",
    gradient: [ARCADE_COLORS.neonOrange, ARCADE_COLORS.gold],
    emoji: "📚",
    stats: [
      { label: "ORDER", value: 100 },
      { label: "DETAIL", value: 90 },
      { label: "CHAOS", value: 10 },
    ],
    tarotNumber: "II",
  },
  trendsetter: {
    name: "The Trendsetter",
    icon: "Star",
    description: "When you create, others follow. That's just facts.",
    gradient: [ARCADE_COLORS.hotPink, ARCADE_COLORS.acidGreen],
    emoji: "🌟",
    stats: [
      { label: "IMPACT", value: 100 },
      { label: "STYLE", value: 95 },
      { label: "FOLLOW", value: 20 },
    ],
    tarotNumber: "XVII",
  },
  "night-shift": {
    name: "The Night Shift",
    icon: "Tv",
    description: "Prime time creativity. Netflix can wait.",
    gradient: [ARCADE_COLORS.synthPurple, ARCADE_COLORS.hotPink],
    emoji: "🌙",
    stats: [
      { label: "EVENING", value: 95 },
      { label: "FOCUS", value: 80 },
      { label: "MORNING", value: 15 },
    ],
    tarotNumber: "XIII",
  },
  "lunch-break-artist": {
    name: "The Lunch Break Artist",
    icon: "Coffee",
    description: "Making emojis while everyone else eats. Multitasking legend.",
    gradient: [ARCADE_COLORS.chromeYellow, ARCADE_COLORS.acidGreen],
    emoji: "🍜",
    stats: [
      { label: "GRIND", value: 90 },
      { label: "SPEED", value: 85 },
      { label: "BREAKS", value: 40 },
    ],
    tarotNumber: "VI",
  },
  sprinter: {
    name: "The Sprinter",
    icon: "Rocket",
    description: "Showed up, dominated, mysterious. Respect.",
    gradient: [ARCADE_COLORS.retroRed, ARCADE_COLORS.chromeYellow],
    emoji: "⚡",
    stats: [
      { label: "SPEED", value: 100 },
      { label: "IMPACT", value: 95 },
      { label: "TIME", value: 30 },
    ],
    tarotNumber: "IV",
  },
  // New expanded personas
  curator: {
    name: "The Curator",
    icon: "Layers",
    description: "Quality over quantity. Every emoji is a masterpiece.",
    gradient: [ARCADE_COLORS.gold, "#8B4513"],
    emoji: "🖼️",
    stats: [
      { label: "TASTE", value: 100 },
      { label: "SELECT", value: 95 },
      { label: "VOLUME", value: 35 },
    ],
    tarotNumber: "V",
  },
  nocturnal: {
    name: "The Nocturnal",
    icon: "Moon",
    description: "The quiet hours are your canvas. They'll never understand.",
    gradient: ["#0d1b2a", ARCADE_COLORS.synthPurple],
    emoji: "🦉",
    stats: [
      { label: "DARK", value: 100 },
      { label: "MYSTERY", value: 90 },
      { label: "DAYLIGHT", value: 10 },
    ],
    tarotNumber: "XII",
  },
  "comeback-kid": {
    name: "The Comeback Kid",
    icon: "RefreshCw",
    description: "Disappeared. Returned. Stronger than ever.",
    gradient: [ARCADE_COLORS.acidGreen, ARCADE_COLORS.electricBlue],
    emoji: "🔄",
    stats: [
      { label: "RETURN", value: 100 },
      { label: "GROWTH", value: 95 },
      { label: "GAP", value: 50 },
    ],
    tarotNumber: "XX",
  },
  "silent-legend": {
    name: "The Silent Legend",
    icon: "Award",
    description: "Few words. Maximum impact. They know who you are.",
    gradient: ["#2d2d2d", ARCADE_COLORS.gold],
    emoji: "🏅",
    stats: [
      { label: "IMPACT", value: 100 },
      { label: "STEALTH", value: 95 },
      { label: "NOISE", value: 20 },
    ],
    tarotNumber: "XV",
  },
  "reaction-master": {
    name: "The Reaction Master",
    icon: "MessageCircle",
    description: "An emoji for every occasion. You've got range.",
    gradient: [ARCADE_COLORS.hotPink, ARCADE_COLORS.electricBlue],
    emoji: "💬",
    stats: [
      { label: "RANGE", value: 100 },
      { label: "TIMING", value: 90 },
      { label: "REPEAT", value: 25 },
    ],
    tarotNumber: "X",
  },
  wordsmith: {
    name: "The Wordsmith",
    icon: "Type",
    description: "Names that slap. Descriptions that pop. Pure poetry.",
    gradient: [ARCADE_COLORS.chromeYellow, ARCADE_COLORS.neonOrange],
    emoji: "✍️",
    stats: [
      { label: "WORDS", value: 100 },
      { label: "WIT", value: 95 },
      { label: "BORING", value: 5 },
    ],
    tarotNumber: "XXI",
  },
  speedrunner: {
    name: "The Speedrunner",
    icon: "Timer",
    description: "Upload times that break records. Efficiency is art.",
    gradient: [ARCADE_COLORS.retroRed, ARCADE_COLORS.acidGreen],
    emoji: "⏱️",
    stats: [
      { label: "SPEED", value: 100 },
      { label: "PRECISION", value: 90 },
      { label: "PATIENCE", value: 15 },
    ],
    tarotNumber: "I",
  },
  "marathon-runner": {
    name: "The Marathon Runner",
    icon: "Activity",
    description: "Steady pace. Long game. Year after year.",
    gradient: [ARCADE_COLORS.electricBlue, ARCADE_COLORS.mintGreen],
    emoji: "🏃",
    stats: [
      { label: "ENDURE", value: 100 },
      { label: "PACE", value: 95 },
      { label: "SPRINT", value: 30 },
    ],
    tarotNumber: "VIII",
  },
  seasonal: {
    name: "The Seasonal",
    icon: "Calendar",
    description: "Holiday specialist. Themed creator. Always on time.",
    gradient: [ARCADE_COLORS.retroRed, ARCADE_COLORS.acidGreen],
    emoji: "🎄",
    stats: [
      { label: "TIMING", value: 100 },
      { label: "THEME", value: 95 },
      { label: "RANDOM", value: 20 },
    ],
    tarotNumber: "IV",
  },
  "legacy-builder": {
    name: "The Legacy Builder",
    icon: "Building",
    description: "Building something that lasts. Future generations will thank you.",
    gradient: [ARCADE_COLORS.gold, ARCADE_COLORS.synthPurple],
    emoji: "🏛️",
    stats: [
      { label: "VISION", value: 100 },
      { label: "IMPACT", value: 95 },
      { label: "HASTE", value: 25 },
    ],
    tarotNumber: "XXI",
  },
}

// ============================================================
// PERSONA DETECTION
// ============================================================

interface DetectionContext {
  lateNightPercentage: number
  lateNightCount: number
  gifPercentage: number
  avgNameLength: number
  streakDays: number
  weekendPercentage: number
  peakHour: number
  busiestDayCount: number
  avgPerWeek: number
  comparedToAverage: number // For personal stats only
  totalEmojis: number
  // New fields for expanded personas
  eveningPercentage: number // 9pm-12am
  lunchPercentage: number // 11am-1pm
  workspaceShare: number // % of workspace emojis this user created
  activeMonths: number // How many months active
}

function getDetectionContext(
  stats: WrappedStats,
  personalStats?: PersonalWrappedStats | null
): DetectionContext {
  const isPersonal = !!personalStats

  // Calculate late night percentage
  const lateNightCount = isPersonal
    ? personalStats.lateNightCount
    : stats.funStats.lateNightCount
  const totalEmojis = isPersonal
    ? personalStats.totalEmojis
    : stats.overview.totalEmojis
  const lateNightPercentage = totalEmojis > 0 ? (lateNightCount / totalEmojis) * 100 : 0

  // GIF percentage
  const gifPercentage = isPersonal
    ? personalStats.gifPercentage
    : stats.overview.gifPercentage

  // Average name length - estimate from longest/shortest if not available
  const longestLen = stats.funStats.longestName?.length || 10
  const shortestLen = stats.funStats.shortestName?.length || 3
  const avgNameLength = (longestLen + shortestLen) / 2

  // Streak
  const streakDays = isPersonal
    ? personalStats.personalStreak.days
    : stats.funStats.longestStreak.days

  // Weekend percentage
  const weekendPercentage = isPersonal
    ? personalStats.weekendPercentage
    : stats.funStats.weekendPercentage

  // Peak hour
  const peakHour = isPersonal
    ? personalStats.favoriteHour?.hour ?? 12
    : stats.peakHourOfDay.hour

  // Busiest day and average
  const busiestDayCount = stats.busiestDay.count
  const avgPerWeek = stats.overview.averagePerWeek

  // Compared to average (personal only)
  const comparedToAverage = isPersonal ? personalStats.comparedToAverage : 100

  // New fields for expanded personas
  // Evening percentage (9pm-12am) - estimate based on peak hour
  const eveningPercentage = peakHour >= 21 && peakHour <= 23 ? 40 : 10

  // Lunch percentage (11am-1pm) - estimate based on peak hour
  const lunchPercentage = peakHour >= 11 && peakHour <= 13 ? 45 : 10

  // Workspace share - what % of total emojis did this user create
  const workspaceShare = isPersonal && stats.overview.totalEmojis > 0
    ? (personalStats.totalEmojis / stats.overview.totalEmojis) * 100
    : 0

  // Active months - estimate from data
  const activeMonths = isPersonal ? (personalStats.totalEmojis > 20 ? 6 : 3) : 12

  return {
    lateNightPercentage,
    lateNightCount,
    gifPercentage,
    avgNameLength,
    streakDays,
    weekendPercentage,
    peakHour,
    busiestDayCount,
    avgPerWeek,
    comparedToAverage,
    totalEmojis,
    eveningPercentage,
    lunchPercentage,
    workspaceShare,
    activeMonths,
  }
}

export function detectPersona(
  stats: WrappedStats,
  personalStats?: PersonalWrappedStats | null
): Persona {
  const ctx = getDetectionContext(stats, personalStats)

  // Minimum thresholds for meaningful detection
  // If very few emojis, default to steady-hand
  if (ctx.totalEmojis < 5) {
    return {
      type: "steady-hand",
      ...PERSONAS["steady-hand"],
    }
  }

  // Priority order detection with minimum thresholds
  let personaType: PersonaType = "steady-hand"

  // 1. The Insomniac: >25% late night AND at least 3 late night emojis
  if (ctx.lateNightPercentage > 25 && ctx.lateNightCount >= 3) {
    personaType = "insomniac"
  }
  // 2. The Purist: <5% GIFs (static emoji purist)
  else if (ctx.gifPercentage < 5 && ctx.totalEmojis >= 10) {
    personaType = "purist"
  }
  // 3. The Meme Lord: >60% GIFs
  else if (ctx.gifPercentage > 60) {
    personaType = "meme-lord"
  }
  // 4. The Trendsetter: Created >20% of workspace emojis (personal only)
  else if (ctx.workspaceShare > 20) {
    personaType = "trendsetter"
  }
  // 5. The Minimalist: avg name < 5 chars
  else if (ctx.avgNameLength < 5) {
    personaType = "minimalist"
  }
  // 6. The Novelist/Archivist: avg name > 18 chars
  else if (ctx.avgNameLength > 18) {
    personaType = ctx.avgNameLength > 25 ? "archivist" : "novelist"
  }
  // 7. The Streak Demon: streak > 10 days
  else if (ctx.streakDays > 10) {
    personaType = "streak-demon"
  }
  // 8. The Sprinter: Top creator with < 3 months activity
  else if (ctx.comparedToAverage > 200 && ctx.activeMonths <= 3) {
    personaType = "sprinter"
  }
  // 9. The Weekend Warrior: >45% weekend
  else if (ctx.weekendPercentage > 45) {
    personaType = "weekend-warrior"
  }
  // 10. The Night Shift: peak hour 9pm-12am (evening, not late night)
  else if (ctx.peakHour >= 21 && ctx.peakHour <= 23) {
    personaType = "night-shift"
  }
  // 11. The Dawn Patrol: peak hour 5-8am
  else if (ctx.peakHour >= 5 && ctx.peakHour <= 8) {
    personaType = "dawn-patrol"
  }
  // 12. The Lunch Break Artist: peak hour 11am-1pm
  else if (ctx.peakHour >= 11 && ctx.peakHour <= 13) {
    personaType = "lunch-break-artist"
  }
  // 13. The Burst Artist: busiest day > 15 emojis OR > 3x weekly avg
  else if (ctx.busiestDayCount > 15 || ctx.busiestDayCount > ctx.avgPerWeek * 3) {
    personaType = "burst-artist"
  }
  // 14. The Backbone: >250% of workspace average (personal only)
  else if (ctx.comparedToAverage > 250) {
    personaType = "backbone"
  }
  // 15. Default: The Steady Hand

  return {
    type: personaType,
    ...PERSONAS[personaType],
  }
}

// ============================================================
// HAIKU GENERATION
// ============================================================

// Fallback haiku for when no words are available
const FALLBACK_HAIKU: Haiku = {
  lines: ["emojis speak loud", "in pixels we trust always", "slack will remember"],
  syllables: [5, 7, 5],
}

// Approximate syllable count using vowel clusters
function countSyllables(word: string): number {
  word = word.toLowerCase().trim()
  if (word.length <= 2) return 1

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/gi)
  let count = vowelGroups ? vowelGroups.length : 1

  // Adjust for silent e at end
  if (word.endsWith("e") && count > 1) {
    count--
  }

  // Adjust for -le endings (like "table")
  if (word.endsWith("le") && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    count++
  }

  return Math.max(1, count)
}

// Filler words to complete lines
const FILLER_WORDS: { word: string; syllables: number }[] = [
  { word: "goes", syllables: 1 },
  { word: "brr", syllables: 1 },
  { word: "wow", syllables: 1 },
  { word: "nice", syllables: 1 },
  { word: "vibes", syllables: 1 },
  { word: "mood", syllables: 1 },
  { word: "life", syllables: 1 },
  { word: "day", syllables: 1 },
  { word: "way", syllables: 1 },
  { word: "time", syllables: 1 },
  { word: "here", syllables: 1 },
  { word: "now", syllables: 1 },
  { word: "love", syllables: 1 },
  { word: "all", syllables: 1 },
  { word: "the", syllables: 1 },
  { word: "a", syllables: 1 },
  { word: "is", syllables: 1 },
  { word: "are", syllables: 1 },
  { word: "forever", syllables: 3 },
  { word: "always", syllables: 2 },
  { word: "never", syllables: 2 },
  { word: "magic", syllables: 2 },
  { word: "moment", syllables: 2 },
  { word: "rising", syllables: 2 },
  { word: "falling", syllables: 2 },
  { word: "dancing", syllables: 2 },
  { word: "shining", syllables: 2 },
  { word: "glowing", syllables: 2 },
  { word: "energy", syllables: 4 },
  { word: "beautiful", syllables: 4 },
]

function buildLine(words: { word: string; syllables: number }[], targetSyllables: number): string {
  const line: string[] = []
  let currentSyllables = 0
  const usedIndices = new Set<number>()

  // First, try to use the provided words
  for (let i = 0; i < words.length && currentSyllables < targetSyllables; i++) {
    const { word, syllables } = words[i]
    if (currentSyllables + syllables <= targetSyllables) {
      line.push(word)
      currentSyllables += syllables
      usedIndices.add(i)
    }
  }

  // Fill remaining with filler words
  const shuffledFillers = [...FILLER_WORDS].sort(() => Math.random() - 0.5)
  for (const filler of shuffledFillers) {
    if (currentSyllables >= targetSyllables) break
    if (currentSyllables + filler.syllables <= targetSyllables) {
      line.push(filler.word)
      currentSyllables += filler.syllables
    }
  }

  return line.join(" ")
}

export function generateHaiku(topWords: WordFrequency[]): Haiku {
  // Edge case: no words or too few words
  if (!topWords || topWords.length < 3) {
    return FALLBACK_HAIKU
  }

  // Process words with syllable counts
  const wordPool = topWords
    .slice(0, 15) // Take top 15 words
    .map((w) => ({
      word: w.word,
      syllables: countSyllables(w.word),
    }))
    .filter((w) => w.syllables <= 5) // Skip overly long words

  // If we filtered out too many words, use fallback
  if (wordPool.length < 3) {
    return FALLBACK_HAIKU
  }

  // Shuffle for variety
  const shuffled = [...wordPool].sort(() => Math.random() - 0.5)

  // Build lines - 5, 7, 5 syllables
  const line1Words = shuffled.slice(0, 5)
  const line2Words = shuffled.slice(5, 10)
  const line3Words = shuffled.slice(10, 15).length > 0 ? shuffled.slice(10, 15) : shuffled.slice(0, 5)

  const line1 = buildLine(line1Words, 5)
  const line2 = buildLine(line2Words, 7)
  const line3 = buildLine(line3Words, 5)

  // Calculate actual syllables for display
  const countLineSyllables = (line: string) =>
    line.split(" ").reduce((sum, word) => sum + countSyllables(word), 0)

  return {
    lines: [line1, line2, line3],
    syllables: [countLineSyllables(line1), countLineSyllables(line2), countLineSyllables(line3)],
  }
}

// ============================================================
// MOVIE POSTER GENERATION
// ============================================================

// Fallback titles when no words available
const FALLBACK_TITLES = [
  "THE EMOJI CHRONICLES",
  "PIXELS OF DESTINY",
  "THE SLACK FILES",
  "CTRL+EMOJI",
  "REACTING: A STORY",
]

interface MovieTemplate {
  template: string
  conditions?: (ctx: DetectionContext) => boolean
}

const MOVIE_TEMPLATES: MovieTemplate[] = [
  { template: "{word1}: Uncut" },
  { template: "The {timeOfDay} {word1} Chronicles", conditions: (ctx) => ctx.lateNightPercentage > 15 },
  { template: "{word1} & {word2}: The Saga" },
  { template: "Fast & {word1}: Workspace Drift" },
  { template: "{count} Emojis of {word1}" },
  { template: "The {word1} Diaries" },
  { template: "{word1}: A {word2} Story" },
  { template: "Revenge of the {word1}" },
  { template: "The Last {word1}" },
  { template: "{word1} Club" },
  { template: "Eternal {word1} of the Spotless Slack" },
  { template: "The {word1} Identity" },
  // New expanded templates
  { template: "Mission: {word1}" },
  { template: "{word1} Rising" },
  { template: "The {word1} Conspiracy" },
  { template: "{word1}: Endgame" },
  { template: "Once Upon a {word1}" },
  { template: "The Secret Life of {word1}" },
  { template: "{word1}: First {word2}" },
  { template: "How I Met Your {word1}" },
  { template: "{word1}: Awakening" },
  { template: "The {word1} Effect" },
  { template: "{word1} Wars: A New Hope", conditions: (ctx) => ctx.totalEmojis > 100 },
  { template: "2024: A {word1} Odyssey", conditions: (ctx) => ctx.totalEmojis > 50 },
]

const GENRES: { genre: string; tagline: string; conditions: (ctx: DetectionContext) => boolean }[] = [
  {
    genre: "An Animated Comedy",
    tagline: "It's not just moving pictures. It's art.",
    conditions: (ctx) => ctx.gifPercentage > 60,
  },
  {
    genre: "A Psychological Thriller",
    tagline: "When the office sleeps, creativity wakes.",
    conditions: (ctx) => ctx.lateNightPercentage > 25,
  },
  {
    genre: "A Feel-Good Summer Blockbuster",
    tagline: "Weekends were made for this.",
    conditions: (ctx) => ctx.weekendPercentage > 45,
  },
  {
    genre: "An Epic Saga",
    tagline: "Day after day. Emoji after emoji.",
    conditions: (ctx) => ctx.streakDays > 7,
  },
  // New expanded genres
  {
    genre: "A Coming-of-Age Drama",
    tagline: "The year that changed everything.",
    conditions: (ctx) => ctx.comparedToAverage > 150,
  },
  {
    genre: "An Action-Packed Adventure",
    tagline: "No emoji left behind. No pixel unexplored.",
    conditions: (ctx) => ctx.busiestDayCount > 10,
  },
  {
    genre: "A Heartwarming Family Film",
    tagline: "Bringing the workspace together, one emoji at a time.",
    conditions: (ctx) => ctx.totalEmojis > 200,
  },
  {
    genre: "A Cult Classic",
    tagline: "Not everyone gets it. That's the point.",
    conditions: (ctx) => ctx.gifPercentage < 10 && ctx.totalEmojis > 30,
  },
  {
    genre: "A Romantic Comedy",
    tagline: "Love, laughter, and lots of reactions.",
    conditions: (ctx) => ctx.peakHour >= 17 && ctx.peakHour <= 20,
  },
  {
    genre: "A Sci-Fi Spectacle",
    tagline: "The future of communication is here.",
    conditions: (ctx) => ctx.totalEmojis > 500,
  },
  {
    genre: "A Documentary",
    tagline: "A workspace. A year. An emoji journey.",
    conditions: () => true, // Default
  },
]

function getTimeOfDay(peakHour: number): string {
  if (peakHour >= 0 && peakHour < 6) return "Midnight"
  if (peakHour >= 6 && peakHour < 12) return "Morning"
  if (peakHour >= 12 && peakHour < 17) return "Afternoon"
  if (peakHour >= 17 && peakHour < 21) return "Evening"
  return "Late Night"
}

export function generateMoviePoster(
  stats: WrappedStats,
  topWords: WordFrequency[],
  personalStats?: PersonalWrappedStats | null
): MoviePoster {
  const ctx = getDetectionContext(stats, personalStats)

  // Edge case: no words or too few words - use fallback title
  if (!topWords || topWords.length < 2) {
    const fallbackTitle = FALLBACK_TITLES[Math.floor(Math.random() * FALLBACK_TITLES.length)]
    const genre = GENRES[GENRES.length - 1] // Documentary as default
    return {
      title: fallbackTitle,
      tagline: genre.tagline,
      genre: genre.genre,
      runtime: stats.overview.totalEmojis || 0,
      rating: 4,
      year: stats.year,
    }
  }

  const words = topWords.slice(0, 5).map((w) => w.word)

  // Capitalize first letter
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  // Select a template
  const eligibleTemplates = MOVIE_TEMPLATES.filter(
    (t) => !t.conditions || t.conditions(ctx)
  )
  const template =
    eligibleTemplates[Math.floor(Math.random() * eligibleTemplates.length)] ||
    MOVIE_TEMPLATES[0]

  // Build title
  let title = template.template
    .replace("{word1}", capitalize(words[0] || "emoji"))
    .replace("{word2}", capitalize(words[1] || "vibes"))
    .replace("{timeOfDay}", getTimeOfDay(ctx.peakHour))
    .replace("{count}", String(stats.overview.totalEmojis))

  // Select genre
  const genre = GENRES.find((g) => g.conditions(ctx)) || GENRES[GENRES.length - 1]

  // Calculate rating based on growth
  let rating = 3.5
  if (stats.growth.hasYoYData) {
    if (stats.growth.growthPercentage > 50) rating = 5
    else if (stats.growth.growthPercentage > 20) rating = 4.5
    else if (stats.growth.growthPercentage > 0) rating = 4
    else if (stats.growth.growthPercentage > -20) rating = 3.5
    else rating = 3
  }

  return {
    title: title.toUpperCase(),
    tagline: genre.tagline,
    genre: genre.genre,
    runtime: stats.overview.totalEmojis,
    rating,
    year: stats.year,
  }
}

// ============================================================
// PROPHECY GENERATION
// ============================================================

const PROPHECIES: Record<PersonaType, string[]> = {
  insomniac: [
    "2026 prediction: You'll discover a new caffeine source. Your Slack status will be 'technically awake'.",
    "The stars align at 3am. That's when your best work happens anyway.",
    "Your circadian rhythm called. It's filing for divorce.",
  ],
  "meme-lord": [
    "The GIFs will continue until morale improves. (It won't. More GIFs needed.)",
    "2026: The year you finally find a GIF that perfectly captures 'reply all regret'.",
    "Your reactions will reach new heights. HR will have questions.",
  ],
  minimalist: [
    "Next year you'll name an emoji with just one letter. We believe in you.",
    "2026: Even shorter names. Maximum impact. Minimal effort.",
    "k.",
  ],
  novelist: [
    "Your magnum opus awaits: a 47-character emoji name. HR will have questions.",
    "2026: The year your emoji names get their own index.",
    "Coming soon: your emoji name that's actually a short story.",
  ],
  "streak-demon": [
    "Your 2026 streak will be legendary. Vacation? Never heard of her.",
    "365 days. 365 emojis. The prophecy demands it.",
    "Break the streak? Couldn't be you.",
  ],
  "weekend-warrior": [
    "One day you'll make an emoji on a Wednesday. That day is not 2026.",
    "Saturday vibes, every Saturday. The universe approves.",
    "Your weekends are sacred. So is your emoji game.",
  ],
  "dawn-patrol": [
    "You'll watch another sunrise through emoji creation. Worth it.",
    "6am creativity hits different. 2026 will prove it.",
    "Early bird gets the worm. You get the emojis.",
  ],
  "burst-artist": [
    "May 17th, 2026: You will create 23 emojis in one sitting. Mark your calendar.",
    "When inspiration strikes, clear your schedule. It's coming.",
    "Your next burst will be legendary. Keyboards were warned.",
  ],
  backbone: [
    "The workspace will finally notice your contributions. (Just kidding. Keep carrying.)",
    "2026: Still carrying. Still unsung. Still essential.",
    "Without you, this place would be emoji-less. They'll realize someday.",
  ],
  "steady-hand": [
    "2026: More of the same, but in a good way. Consistency wins.",
    "Slow and steady wins the race. Also the emoji game.",
    "Reliable. Dependable. Underestimated. That's your power.",
  ],
  // New persona prophecies
  purist: [
    "While others animate, you curate. The classics never go out of style.",
    "2026: Still no GIFs. Still superior. The algorithm respects that.",
    "Static images. Dynamic energy. You get it.",
  ],
  archivist: [
    "Your 2026 organization system will be so good, museums will call.",
    "Every emoji, a story. Every name, a novel. Keep documenting.",
    "Future archaeologists will study your naming conventions.",
  ],
  trendsetter: [
    "2026: You create. They copy. The cycle continues.",
    "Originality is your superpower. The workspace thanks you.",
    "When you lead, they follow. Always have. Always will.",
  ],
  "night-shift": [
    "Prime time creativity. The 9pm zone is your kingdom.",
    "2026: Even more evening inspiration. Netflix can keep waiting.",
    "While they wind down, you power up. Different breed.",
  ],
  "lunch-break-artist": [
    "2026: Lunch hour empire expands. Meal prep meets emoji prep.",
    "Multitasking legend status: confirmed for another year.",
    "Between bites, brilliance. The noon zone is yours.",
  ],
  sprinter: [
    "Showed up. Dominated. Left them wondering. 2026 sequel incoming.",
    "Brief but brilliant. Your impact ratio is unmatched.",
    "Quality over quantity. Speed over duration. Respect.",
  ],
  // New expanded persona prophecies
  curator: [
    "2026: Your collection grows. Each piece, carefully chosen. Gallery vibes.",
    "While others spam, you curate. The algorithm notices quality.",
    "Selective excellence. That's not just a strategy, it's a lifestyle.",
  ],
  nocturnal: [
    "The night belongs to creators. 2026 will have many moonlit sessions.",
    "Between midnight and dawn, magic happens. You know this well.",
    "When the world sleeps, you create. Different timezone, different mindset.",
  ],
  "comeback-kid": [
    "2026: The return arc continues. Bigger. Better. More emojis.",
    "Hiatus? More like a strategic pause. The comeback was always planned.",
    "They thought you were gone. You were just reloading.",
  ],
  "silent-legend": [
    "Few emojis. Maximum impact. 2026 will amplify your legend.",
    "You don't need to be loud to be legendary. Actions speak.",
    "Quality over quantity, always. The workspace respects the approach.",
  ],
  "reaction-master": [
    "2026: An emoji for every mood. A reaction for every moment.",
    "Your range is unmatched. Comedy, drama, everything in between.",
    "The workspace's emotional vocabulary? You built that.",
  ],
  wordsmith: [
    "2026: Names that make people stop scrolling. Descriptions that pop.",
    "Every emoji name is a tiny poem. You're the author.",
    "While others use 'cool' and 'nice', you use actual words. Respect.",
  ],
  speedrunner: [
    "2026: Even faster upload times. Even cleaner execution.",
    "Efficiency is your art form. Time is just a number.",
    "World record attempts incoming. The clock fears you.",
  ],
  "marathon-runner": [
    "2026: Another year. Another consistent performance. Legendary endurance.",
    "Short sprints are easy. You play the long game.",
    "Steady pace wins the race. You've known this all along.",
  ],
  seasonal: [
    "2026: Every holiday, every theme, every moment. Perfectly timed.",
    "Halloween emojis in October. Christmas in December. You get it.",
    "Themed excellence is an art. You're the artist.",
  ],
  "legacy-builder": [
    "2026: Building something that lasts. Future workspaces will thank you.",
    "You're not just making emojis. You're building infrastructure.",
    "Architects think in decades. So do you.",
  ],
}

export function generateProphecy(persona: Persona, year: number): Prophecy {
  const prophecyOptions = PROPHECIES[persona.type]
  const text = prophecyOptions[Math.floor(Math.random() * prophecyOptions.length)]

  // Replace year references
  const adjustedText = text.replace(/2026/g, String(year + 1))

  return {
    text: adjustedText,
    disclaimer: "For entertainment purposes. Mostly.",
  }
}

// ============================================================
// UTILITY EXPORTS
// ============================================================

export { PERSONAS }
