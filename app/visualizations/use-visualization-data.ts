import { useMemo } from "react"
import { Emoji } from "@/lib/services/emoji-service"

// Types
export type TimeRange = "all" | "7days" | "30days" | "90days" | "6months" | "1year"

// Helper functions (moved from page.tsx and optimized)
const format = (date: Date | number, formatStr: string) => {
    const d = typeof date === 'number' ? new Date(date * 1000) : date
    if (formatStr === 'MMM d') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    if (formatStr === 'MMM yyyy') {
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    if (formatStr === 'yyyy') {
        return d.getFullYear().toString()
    }
    if (formatStr === 'MMM dd, yyyy') {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    if (formatStr === 'yyyy-MM-dd') {
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }
    return d.toISOString()
}

const calculateDaysToShow = (timeRange: TimeRange, oldestTimestamp?: number): number => {
    const now = new Date();

    switch (timeRange) {
        case "7days": return 7;
        case "30days": return 30;
        case "90days": return 90;
        case "6months": return 180;
        case "1year": return 365;
        case "all":
            if (oldestTimestamp) {
                const oldestDate = new Date(oldestTimestamp * 1000);
                return Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            return 365; // fallback
        default:
            return 90;
    }
}

const calculateWeeksToShow = (timeRange: TimeRange, oldestTimestamp?: number): number => {
    const now = new Date();

    switch (timeRange) {
        case "7days": return 1;
        case "30days": return 4;
        case "90days": return 12;
        case "6months": return 26;
        case "1year": return 52;
        case "all":
            if (oldestTimestamp) {
                const oldestDate = new Date(oldestTimestamp * 1000);
                return Math.min(52, Math.ceil((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));
            }
            return 52; // fallback
        default:
            return 12;
    }
}

export function useVisualizationData(emojiData: Emoji[], timeRange: TimeRange) {
    // 1. Filter emojis based on time range
    const filteredEmojiData = useMemo(() => {
        if (!emojiData || timeRange === "all") return emojiData

        const now = Date.now() / 1000 // Current time in seconds
        let cutoffTime: number

        switch (timeRange) {
            case "7days":
                cutoffTime = now - (7 * 24 * 60 * 60)
                break
            case "30days":
                cutoffTime = now - (30 * 24 * 60 * 60)
                break
            case "90days":
                cutoffTime = now - (90 * 24 * 60 * 60)
                break
            case "6months":
                cutoffTime = now - (180 * 24 * 60 * 60)
                break
            case "1year":
                cutoffTime = now - (365 * 24 * 60 * 60)
                break
            default:
                return emojiData
        }

        return emojiData.filter(emoji => emoji.created && emoji.created >= cutoffTime)
    }, [emojiData, timeRange])

    // 2. Sort filtered data once
    const sortedEmojiData = useMemo(() => {
        if (!filteredEmojiData) return []
        return [...filteredEmojiData]
            .filter(e => e.created && !e.is_alias)
            .sort((a, b) => (a.created || 0) - (b.created || 0))
    }, [filteredEmojiData])

    // 3. Calculate oldest timestamp
    const oldestTimestamp = useMemo(() => {
        return sortedEmojiData.length > 0 ? sortedEmojiData[0].created : undefined
    }, [sortedEmojiData])

    // 4. Calculate all chart data in a single pass where possible
    const chartData = useMemo(() => {
        if (!filteredEmojiData || filteredEmojiData.length === 0) return {
            topCreators: [],
            emojisByMonth: [],
            topCategories: [],
            creationTimeline: [],
            recentActivity: [],
            userEngagement: [],
            emojiDistribution: [],
            aliasRatio: { original: 0, alias: 0 },
            weekdayDistribution: [],
            emojiTypes: [],
            commonWords: [],
            emojisByHour: [],
            peakTimePeriod: "Unknown",
            cumulativeGrowth: [],
            creatorTimeline: [],
            topCreatorNames: [],
            creationVelocity: [],
            typePercentages: [],
            activeCreatorsTimeline: [],
            seasonalData: [],
            seasonalYears: [],
            nameLengthTrend: [],
            newVsReturningCreators: [],
            creatorProductivity: [],
        }

        const currentTime = Math.floor(Date.now() / 1000)

        // Initialize aggregators
        const creators: Record<string, number> = {}
        const categories: Record<string, number> = {}
        const dateCountMap: Record<string, number> = {}
        const userActivity: Record<string, { name: string; emojis: number; firstCreated: number; lastCreated: number }> = {}
        const nameLengths: Record<number, number> = {}
        const weekdayCounts = Array(7).fill(0)
        const timeBucketCounts = Array(8).fill(0)
        const wordCounts: Record<string, number> = {}
        const stopWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are'])

        let originalCount = 0
        let aliasCount = 0

        // Single pass over filtered data for basic metrics
        filteredEmojiData.forEach(emoji => {
            // Alias count
            if (emoji.is_alias) {
                aliasCount++
                return // Skip most processing for aliases
            }
            originalCount++

            // Creators
            if (emoji.user_display_name) {
                creators[emoji.user_display_name] = (creators[emoji.user_display_name] || 0) + 1

                // User Activity
                if (!userActivity[emoji.user_display_name]) {
                    userActivity[emoji.user_display_name] = {
                        name: emoji.user_display_name.split(' ')[0],
                        emojis: 0,
                        firstCreated: emoji.created || Infinity,
                        lastCreated: emoji.created || 0
                    }
                }
                const ua = userActivity[emoji.user_display_name]
                ua.emojis++
                if (emoji.created) {
                    ua.firstCreated = Math.min(ua.firstCreated, emoji.created)
                    ua.lastCreated = Math.max(ua.lastCreated, emoji.created)
                }
            }

            // Categories (First char)
            const firstChar = emoji.name.charAt(0).toLowerCase()
            categories[firstChar] = (categories[firstChar] || 0) + 1

            // Name Length
            const length = emoji.name.length
            nameLengths[length] = (nameLengths[length] || 0) + 1

            // Word Analysis
            const words = emoji.name.toLowerCase().split(/[^a-z0-9]+/)
            for (const word of words) {
                if (word.length > 2 && !stopWords.has(word)) {
                    wordCounts[word] = (wordCounts[word] || 0) + 1
                }
            }

            if (emoji.created) {
                const date = new Date(emoji.created * 1000)

                // Creation Timeline
                const dateStr = format(date, 'MMM dd, yyyy')
                dateCountMap[dateStr] = (dateCountMap[dateStr] || 0) + 1

                // Weekday Distribution
                weekdayCounts[date.getDay()]++

                // Time of Day
                const hour = date.getHours()
                timeBucketCounts[Math.floor(hour / 3)]++
            }
        })

        // --- Process Aggregated Data ---

        // Top Creators
        const topCreators = Object.entries(creators)
            .map(([name, count]) => ({ name: name.split(' ')[0], count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)

        // Top Categories
        const topCategories = Object.entries(categories)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8)

        // Creation Timeline
        const creationTimeline = Object.entries(dateCountMap)
            .map(([date, count]) => ({ date, count, timestamp: new Date(date).getTime() / 1000 }))
            .sort((a, b) => b.count - a.count)

        // Recent Activity (Last 90 days)
        const ninetyDaysAgo = currentTime - (90 * 24 * 60 * 60)
        const recentActivity = sortedEmojiData
            .filter(e => e.created && e.created > ninetyDaysAgo)
            .reverse() // Newest first
            .slice(0, 50)
            .map(emoji => ({
                name: emoji.name,
                value: currentTime - (emoji.created || 0),
                creator: emoji.user_display_name?.split(' ')[0] || 'Unknown'
            }))

        // User Engagement
        const userEngagement = Object.values(userActivity)
            .map(user => ({
                name: user.name,
                emojis: user.emojis,
                timespan: user.lastCreated - user.firstCreated,
                activity: user.emojis / ((user.lastCreated - user.firstCreated) / (60 * 60 * 24) + 1)
            }))
            .filter(user => user.emojis > 1)

        // Emoji Distribution
        const emojiDistribution = Object.entries(nameLengths)
            .map(([length, count]) => ({ length: Number(length), count }))
            .sort((a, b) => a.length - b.length)

        // Weekday Distribution
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const weekdayDistribution = weekdays.map((day, index) => ({
            day,
            count: weekdayCounts[index]
        }))

        // Common Words
        const commonWords = Object.entries(wordCounts)
            .map(([word, count]) => ({ word, count, length: word.length }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 30)

        // Emojis by Hour
        const timeLabels = ["12-3 AM", "3-6 AM", "6-9 AM", "9-12 PM", "12-3 PM", "3-6 PM", "6-9 PM", "9-12 AM"]
        const emojisByHour = timeLabels.map((label, index) => ({
            timeOfDay: label,
            count: timeBucketCounts[index]
        }))
        const peakTimePeriod = [...emojisByHour].sort((a, b) => b.count - a.count)[0]?.timeOfDay || "Unknown"

        // Creator Productivity
        const productivityRanges = [
            { min: 1, max: 1, label: '1' },
            { min: 2, max: 5, label: '2-5' },
            { min: 6, max: 10, label: '6-10' },
            { min: 11, max: 25, label: '11-25' },
            { min: 26, max: 50, label: '26-50' },
            { min: 51, max: 999999, label: '50+' },
        ]
        const creatorProductivity = productivityRanges.map(range => {
            const creatorsInRange = Object.entries(creators).filter(([_, count]) => count >= range.min && count <= range.max)
            const avgCount = creatorsInRange.length > 0
                ? Math.round(creatorsInRange.reduce((sum, [_, count]) => sum + count, 0) / creatorsInRange.length)
                : 0
            return {
                range: range.label,
                count: creatorsInRange.length,
                avgCount
            }
        })

        // --- Time-Series Data (Requires Iteration over Time) ---

        const useDaily = timeRange === "7days" || timeRange === "30days"
        const daysToShow = calculateDaysToShow(timeRange, oldestTimestamp)
        const now = new Date()

        // Pre-calculate time buckets
        const timeBuckets: Record<string, { count: number, image: number, gif: number }> = {}
        const emojisByMonth: Array<{ month: string; count: number }> = []
        const emojiTypes: Array<{ date: string; image: number; gif: number }> = []

        // Helper to generate keys
        const getKey = (date: Date) => useDaily ? format(date, 'MMM d') : format(date, 'MMM yyyy')
        const getDateKey = (date: Date) => format(date, 'yyyy-MM-dd')

        // Initialize buckets for the range to ensure continuity
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const key = getKey(d)
            const dateKey = getDateKey(d)

            if (!timeBuckets[key]) timeBuckets[key] = { count: 0, image: 0, gif: 0 }
            // We'll populate emojiTypes separately but need to ensure dates align
        }

        // Populate buckets from sorted data
        // This is faster than filtering for each day
        sortedEmojiData.forEach(emoji => {
            if (!emoji.created) return
            const date = new Date(emoji.created * 1000)
            const key = getKey(date)
            const dateKey = getDateKey(date)

            // Only count if within range (though filteredEmojiData should already be filtered, 
            // sortedEmojiData is derived from it, but let's be safe if logic changes)
            // Actually, for "all" time, we might need to dynamically add buckets if we didn't pre-fill all
            if (!timeBuckets[key]) timeBuckets[key] = { count: 0, image: 0, gif: 0 }

            timeBuckets[key].count++
            if (emoji.url && emoji.url.toLowerCase().includes('.gif')) {
                timeBuckets[key].gif++
            } else {
                timeBuckets[key].image++
            }
        })

        // Convert buckets to arrays
        // For emojisByMonth (Line Chart)
        if (useDaily) {
            for (let i = daysToShow - 1; i >= 0; i--) {
                const d = new Date(now)
                d.setDate(d.getDate() - i)
                const key = getKey(d)
                emojisByMonth.push({ month: key, count: timeBuckets[key]?.count || 0 })
            }
        } else {
            // Sort keys chronologically for monthly
            // This part is a bit tricky without timestamps in keys, but we can rely on the sorted data iteration order if we built it that way
            // Or just rebuild from sorted data for monthly
            const monthlyData = new Map<string, number>()
            sortedEmojiData.forEach(e => {
                if (!e.created) return
                const key = format(new Date(e.created * 1000), 'MMM yyyy')
                monthlyData.set(key, (monthlyData.get(key) || 0) + 1)
            })
            emojisByMonth.push(...Array.from(monthlyData.entries()).map(([month, count]) => ({ month, count })))
        }

        // For emojiTypes (Bar Chart) - Daily resolution usually
        // We need a daily iteration for this regardless of timeRange for the "Image vs GIF" chart usually
        // The original code used `daysToShow` which depends on timeRange.
        const dailyTypeData: Record<string, { image: number, gif: number }> = {}
        sortedEmojiData.forEach(e => {
            if (!e.created) return
            const key = format(new Date(e.created * 1000), 'yyyy-MM-dd')
            if (!dailyTypeData[key]) dailyTypeData[key] = { image: 0, gif: 0 }
            if (e.url?.toLowerCase().includes('.gif')) dailyTypeData[key].gif++
            else dailyTypeData[key].image++
        })

        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const key = format(d, 'yyyy-MM-dd')
            emojiTypes.push({
                date: key,
                image: dailyTypeData[key]?.image || 0,
                gif: dailyTypeData[key]?.gif || 0
            })
        }

        // Cumulative Growth & Type Percentages
        const cumulativeGrowth: Array<{ date: string; images: number; gifs: number; total: number }> = []
        const typePercentages: Array<{ date: string; imagePercent: number; gifPercent: number }> = []

        let cumImages = 0
        let cumGifs = 0
        let emojiIndex = 0

        // We need to iterate day by day for the range
        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            d.setHours(23, 59, 59, 999)
            const endTimestamp = d.getTime() / 1000
            const dateStr = format(d, 'yyyy-MM-dd')

            // Advance index
            while (emojiIndex < sortedEmojiData.length && sortedEmojiData[emojiIndex].created! <= endTimestamp) {
                const e = sortedEmojiData[emojiIndex]
                if (e.url?.toLowerCase().includes('.gif')) cumGifs++
                else cumImages++
                emojiIndex++
            }

            const total = cumImages + cumGifs
            cumulativeGrowth.push({ date: dateStr, images: cumImages, gifs: cumGifs, total })
            typePercentages.push({
                date: dateStr,
                imagePercent: total > 0 ? Math.round((cumImages / total) * 100) : 0,
                gifPercent: total > 0 ? Math.round((cumGifs / total) * 100) : 0
            })
        }

        // Creator Timeline (Stacked Area)
        const topCreatorNames = topCreators.slice(0, 5).map(c => c.name)
        const creatorTimeline: Array<any> = []

        // Reset index for next loop
        emojiIndex = 0
        const creatorCounts: Record<string, number> = {}
        topCreatorNames.forEach(n => creatorCounts[n] = 0)

        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            d.setHours(23, 59, 59, 999)
            const endTimestamp = d.getTime() / 1000
            const dateStr = format(d, 'yyyy-MM-dd')

            while (emojiIndex < sortedEmojiData.length && sortedEmojiData[emojiIndex].created! <= endTimestamp) {
                const e = sortedEmojiData[emojiIndex]
                const name = e.user_display_name?.split(' ')[0]
                if (name && creatorCounts[name] !== undefined) {
                    creatorCounts[name]++
                }
                emojiIndex++
            }

            creatorTimeline.push({
                date: dateStr,
                ...creatorCounts
            })
        }

        // Active Creators Timeline & Seasonal Data
        const activeCreatorsTimeline: Array<{ date: string; count: number }> = []
        const seasonalPatterns: Record<string, Record<string, number>> = {}

        emojiIndex = 0
        const uniqueCreators = new Set<string>()

        for (let i = daysToShow - 1; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            d.setHours(23, 59, 59, 999)
            const endTimestamp = d.getTime() / 1000
            const dateStr = format(d, 'yyyy-MM-dd')

            while (emojiIndex < sortedEmojiData.length && sortedEmojiData[emojiIndex].created! <= endTimestamp) {
                const e = sortedEmojiData[emojiIndex]
                if (e.user_display_name) uniqueCreators.add(e.user_display_name)

                // Seasonal data population
                if (e.created) {
                    const eDate = new Date(e.created * 1000)
                    const year = eDate.getFullYear().toString()
                    const month = eDate.toLocaleDateString('en-US', { month: 'short' })
                    if (!seasonalPatterns[year]) seasonalPatterns[year] = {}
                    seasonalPatterns[year][month] = (seasonalPatterns[year][month] || 0) + 1
                }

                emojiIndex++
            }

            activeCreatorsTimeline.push({ date: dateStr, count: uniqueCreators.size })
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const seasonalYears = Object.keys(seasonalPatterns).sort()
        const seasonalData = months.map(month => {
            const dataPoint: any = { month }
            seasonalYears.forEach(year => {
                dataPoint[year] = seasonalPatterns[year]?.[month] || 0
            })
            return dataPoint
        })

        // Name Length Trend & Creation Velocity
        const nameLengthTrend: Array<{ date: string; avgLength: number }> = []
        const creationVelocity: Array<{ week: string; count: number; timestamp: number; movingAvg?: number }> = []
        const weeksToShow = calculateWeeksToShow(timeRange, oldestTimestamp)

        for (let i = weeksToShow - 1; i >= 0; i--) {
            const weekEnd = new Date(now)
            weekEnd.setDate(weekEnd.getDate() - (i * 7))
            const weekStart = new Date(weekEnd)
            weekStart.setDate(weekStart.getDate() - 6)
            weekStart.setHours(0, 0, 0, 0)
            weekEnd.setHours(23, 59, 59, 999)

            const startTs = weekStart.getTime() / 1000
            const endTs = weekEnd.getTime() / 1000

            // Filter for this week (can be optimized but this loop is short)
            const weekEmojis = sortedEmojiData.filter(e => e.created! >= startTs && e.created! <= endTs)

            // Name Length
            const avgLength = weekEmojis.length > 0
                ? weekEmojis.reduce((sum, e) => sum + e.name.length, 0) / weekEmojis.length
                : 0
            nameLengthTrend.push({ date: format(weekEnd, 'MMM d'), avgLength: Math.round(avgLength * 10) / 10 })

            // Velocity
            creationVelocity.push({
                week: format(weekEnd, 'MMM d'),
                count: weekEmojis.length,
                timestamp: endTs
            })
        }

        // Moving Average for Velocity
        creationVelocity.forEach((item, index) => {
            const start = Math.max(0, index - 3)
            const slice = creationVelocity.slice(start, index + 1)
            const avg = slice.reduce((sum, v) => sum + v.count, 0) / slice.length
            item.movingAvg = Math.round(avg * 10) / 10
        })

        // New vs Returning Creators (Logic preserved but could be optimized further)
        const newVsReturningCreators: Array<{ date: string; newCreators: number; returningCreators: number }> = []
        // ... (Logic for this is complex and relies on specific periods, keeping simplified for now or copying logic if needed)
        // For brevity in this task, I'll implement a simplified version or copy the logic if critical. 
        // Let's copy the logic but use the sorted data efficiently.

        // (Re-implementing the New vs Returning logic from original file for correctness)
        if (sortedEmojiData.length > 0) {
            let periodsToShow = 12;
            let periodType: 'month' | 'week' = 'month';

            if (timeRange === "7days" || timeRange === "30days" || timeRange === "90days") {
                periodType = 'week';
                periodsToShow = timeRange === "7days" ? 7 : (timeRange === "30days" ? 4 : 12);
            } else if (timeRange === "all") {
                const oldestDate = new Date(sortedEmojiData[0].created! * 1000);
                const monthsDiff = (now.getFullYear() - oldestDate.getFullYear()) * 12 + (now.getMonth() - oldestDate.getMonth());
                periodsToShow = Math.max(1, monthsDiff + 1);
            }

            const creatorFirstAppearance = new Map<string, number>();
            sortedEmojiData.forEach(e => {
                if (e.user_display_name && e.created) {
                    const existing = creatorFirstAppearance.get(e.user_display_name);
                    if (!existing || e.created < existing) creatorFirstAppearance.set(e.user_display_name, e.created);
                }
            });

            for (let i = periodsToShow - 1; i >= 0; i--) {
                const date = new Date(now);
                if (periodType === 'month') {
                    date.setMonth(date.getMonth() - i);
                    date.setDate(1);
                } else {
                    date.setDate(date.getDate() - i * 7);
                }

                const startOfPeriod = new Date(date);
                startOfPeriod.setHours(0, 0, 0, 0);
                const endOfPeriod = new Date(startOfPeriod);
                if (periodType === 'month') endOfPeriod.setMonth(endOfPeriod.getMonth() + 1);
                else endOfPeriod.setDate(endOfPeriod.getDate() + 7);

                const startTs = startOfPeriod.getTime() / 1000;
                const endTs = endOfPeriod.getTime() / 1000;

                const creatorsInPeriod = new Set<string>();
                // Optimization: Binary search or index tracking could be used here, but filter is okay for now
                sortedEmojiData.forEach(e => {
                    if (e.created && e.created >= startTs && e.created < endTs && e.user_display_name) {
                        creatorsInPeriod.add(e.user_display_name);
                    }
                });

                let newCount = 0;
                let returningCount = 0;
                creatorsInPeriod.forEach(creator => {
                    const firstAppearance = creatorFirstAppearance.get(creator);
                    if (firstAppearance && firstAppearance >= startTs && firstAppearance < endTs) newCount++;
                    else returningCount++;
                });

                newVsReturningCreators.push({
                    date: periodType === 'month' ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : format(date, 'yyyy-MM-dd'),
                    newCreators: newCount,
                    returningCreators: returningCount
                });
            }
        }

        return {
            topCreators,
            emojisByMonth,
            topCategories,
            creationTimeline,
            recentActivity,
            userEngagement,
            emojiDistribution,
            aliasRatio: { original: originalCount, alias: aliasCount },
            weekdayDistribution,
            emojiTypes,
            commonWords,
            emojisByHour,
            peakTimePeriod,
            cumulativeGrowth,
            creatorTimeline,
            topCreatorNames,
            creationVelocity,
            typePercentages,
            activeCreatorsTimeline,
            seasonalData,
            seasonalYears,
            nameLengthTrend,
            newVsReturningCreators,
            creatorProductivity,
        }
    }, [filteredEmojiData, sortedEmojiData, oldestTimestamp, timeRange])

    return {
        filteredEmojiData,
        sortedEmojiData,
        chartData,
        oldestTimestamp
    }
}
