// Generate fake emoji data for demo purposes
import type { Emoji } from "@/lib/services/emoji-service"

// Helper function to proxy image URLs
const proxyImageUrl = (url: string) => {
  if (!url) return ""
  // Use our proxy API route
  return `/api/emoji-proxy?url=${encodeURIComponent(url)}`
}

// Generate demo data for import
export const generateDemoData = async (): Promise<Emoji[]> => {
  try {
    // Client-side: use fetch
    let emojiData: any;
    if (typeof window !== 'undefined') {
      const response = await fetch('/data/demo-emojis.json');
      emojiData = await response.json();
    } else {
      // Server-side: use fs
      const fs = require('fs').promises;
      const path = require('path');
      const filePath = path.join(process.cwd(), 'public/data/demo-emojis.json');
      const fileContent = await fs.readFile(filePath, 'utf8');
      emojiData = JSON.parse(fileContent);
    }

    // Map the data to the Emoji type
    if (emojiData && Array.isArray(emojiData) && emojiData.length > 0) {
      if (emojiData[0].emojis && Array.isArray(emojiData[0].emojis)) {
        // If the data is in the old format with nested emojis array
        const emojis = emojiData[0].emojis.map((emoji: any, index: number) => ({
          name: emoji.name,
          url: emoji.image_url,
          created: Math.floor(Date.now() / 1000) - (index * 86400) - Math.floor(Math.random() * 86400),
          user_id: `U${String(Math.floor(Math.random() * 50) + 1).padStart(2, '0')}`,
          user_display_name: getRandomUserName(),
          is_alias: 0,
          team_id: 'T01',
          is_bad: false,
          can_delete: true
        }));
        return emojis;
      } else {
        // New format: direct array of emoji objects with name and url
        
        // Create a set of fixed user IDs to ensure we have recurring contributors
        const fixedUserIds: string[] = [];
        const fixedUserNames: string[] = [];
        const powerUserCount = 12; // Number of power users who create lots of emojis
        const regularUserCount = 26; // Number of regular users who create fewer emojis
        
        // Generate power users (will be assigned more emojis)
        for (let i = 0; i < powerUserCount; i++) {
          const userId = `U${String(i + 1).padStart(2, '0')}${getRandomLetters(3)}${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
          fixedUserIds.push(userId);
          fixedUserNames.push(getRandomUserName());
        }
        
        // Generate regular users
        for (let i = 0; i < regularUserCount; i++) {
          const userId = `U${String(i + powerUserCount + 1).padStart(2, '0')}${getRandomLetters(3)}${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
          fixedUserIds.push(userId);
          fixedUserNames.push(getRandomUserName());
        }
        
        // Create distribution patterns for emoji creation dates
        // This will create clusters of emojis on certain dates to make the chart more natural
        const now = Math.floor(Date.now() / 1000);
        const oneYearAgo = now - (365 * 86400);
        const twoYearsAgo = now - (730 * 86400);
        const sixMonthsAgo = now - (180 * 86400);
        
        // Define some "event days" where lots of emojis were created (like hackathons, team events, etc.)
        const eventDays = [
          now - (15 * 86400), // 15 days ago
          now - (45 * 86400), // 45 days ago
          now - (90 * 86400), // 90 days ago
          now - (120 * 86400), // 120 days ago
          now - (160 * 86400), // 160 days ago
          // Add event days from last year (for year-over-year comparison)
          now - (365 + 15) * 86400, // Same event last year
          now - (365 + 45) * 86400, // Same event last year
          now - (365 + 90) * 86400, // Same event last year
          now - (365 + 160) * 86400, // Same event last year
          // Add some events from two years ago
          now - (730 + 30) * 86400,
          now - (730 + 120) * 86400,
        ];
        
        // Define some "trend periods" where emoji creation increased for a while
        const trendPeriods = [
          { start: now - (30 * 86400), end: now - (20 * 86400) }, // 30-20 days ago
          { start: now - (75 * 86400), end: now - (60 * 86400) }, // 75-60 days ago
          { start: now - (140 * 86400), end: now - (125 * 86400) }, // 140-125 days ago
          // Add trend periods from last year
          { start: now - (365 + 30) * 86400, end: now - (365 + 20) * 86400 }, // Same period last year
          { start: now - (365 + 75) * 86400, end: now - (365 + 60) * 86400 }, // Same period last year
          { start: now - (365 + 140) * 86400, end: now - (365 + 125) * 86400 }, // Same period last year
          // Add some periods from two years ago (but fewer, showing growth)
          { start: now - (730 + 50) * 86400, end: now - (730 + 40) * 86400 },
          { start: now - (730 + 120) * 86400, end: now - (730 + 110) * 86400 },
        ];
        
        // Distribute emojis across current year, last year, and two years ago
        // with a natural growth pattern (fewer emojis in earlier years)
        const totalEmojis = emojiData.length;
        const currentYearEmojis = Math.floor(totalEmojis * 0.55); // 55% in current year
        const lastYearEmojis = Math.floor(totalEmojis * 0.30);   // 30% in last year
        const twoYearsAgoEmojis = totalEmojis - currentYearEmojis - lastYearEmojis; // Remaining in two years ago
        
        const emojis = emojiData.map((emoji: any, index: number) => {
          let timestamp: number;
          let userId: string;
          let userDisplayName: string;
          
          // Determine which year this emoji belongs to based on index
          const yearCategory = index < currentYearEmojis ? 'current' : 
                              index < (currentYearEmojis + lastYearEmojis) ? 'lastYear' : 'twoYearsAgo';
          
          // Assign creation dates with natural patterns based on year category
          const random = Math.random();
          
          if (yearCategory === 'current') {
            // Current year emojis
            if (random < 0.20) {
              // 20% of current year emojis created on recent event days
              const recentEventDays = eventDays.filter(day => day > oneYearAgo);
              const eventDay = recentEventDays[Math.floor(Math.random() * recentEventDays.length)];
              const hourVariation = Math.floor(Math.random() * 12) * 3600; // Spread across 12 hours
              timestamp = eventDay + hourVariation;
            } else if (random < 0.50) {
              // 30% of current year emojis created during recent trend periods
              const recentTrendPeriods = trendPeriods.filter(period => period.start > oneYearAgo);
              const trendPeriod = recentTrendPeriods[Math.floor(Math.random() * recentTrendPeriods.length)];
              const periodDuration = trendPeriod.end - trendPeriod.start;
              timestamp = trendPeriod.start + Math.floor(Math.random() * periodDuration);
            } else {
              // 50% of current year emojis spread throughout the year with recency bias
              const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 365); // Power distribution favors recent days
              timestamp = now - (daysAgo * 86400) - (Math.floor(Math.random() * 24) * 3600);
            }
          } else if (yearCategory === 'lastYear') {
            // Last year emojis (between 1-2 years ago)
            if (random < 0.15) {
              // 15% of last year emojis created on last year's event days
              const lastYearEventDays = eventDays.filter(day => day < oneYearAgo && day > twoYearsAgo);
              const eventDay = lastYearEventDays[Math.floor(Math.random() * lastYearEventDays.length)];
              const hourVariation = Math.floor(Math.random() * 12) * 3600;
              timestamp = eventDay + hourVariation;
            } else if (random < 0.40) {
              // 25% of last year emojis created during last year's trend periods
              const lastYearTrendPeriods = trendPeriods.filter(period => period.start < oneYearAgo && period.start > twoYearsAgo);
              const trendPeriod = lastYearTrendPeriods[Math.floor(Math.random() * lastYearTrendPeriods.length)];
              const periodDuration = trendPeriod.end - trendPeriod.start;
              timestamp = trendPeriod.start + Math.floor(Math.random() * periodDuration);
            } else {
              // 60% spread throughout last year
              const daysAgo = 365 + Math.floor(Math.random() * 365); // Between 1-2 years ago
              timestamp = now - (daysAgo * 86400) - (Math.floor(Math.random() * 24) * 3600);
            }
          } else {
            // Two years ago emojis (between 2-3 years ago)
            if (random < 0.10) {
              // 10% of two years ago emojis created on two years ago event days
              const oldEventDays = eventDays.filter(day => day < twoYearsAgo);
              if (oldEventDays.length > 0) {
                const eventDay = oldEventDays[Math.floor(Math.random() * oldEventDays.length)];
                const hourVariation = Math.floor(Math.random() * 12) * 3600;
                timestamp = eventDay + hourVariation;
              } else {
                // Fallback if no old event days
                const daysAgo = 730 + Math.floor(Math.random() * 365); // Between 2-3 years ago
                timestamp = now - (daysAgo * 86400) - (Math.floor(Math.random() * 24) * 3600);
              }
            } else if (random < 0.30) {
              // 20% of two years ago emojis created during two years ago trend periods
              const oldTrendPeriods = trendPeriods.filter(period => period.start < twoYearsAgo);
              if (oldTrendPeriods.length > 0) {
                const trendPeriod = oldTrendPeriods[Math.floor(Math.random() * oldTrendPeriods.length)];
                const periodDuration = trendPeriod.end - trendPeriod.start;
                timestamp = trendPeriod.start + Math.floor(Math.random() * periodDuration);
              } else {
                // Fallback if no old trend periods
                const daysAgo = 730 + Math.floor(Math.random() * 365); // Between 2-3 years ago
                timestamp = now - (daysAgo * 86400) - (Math.floor(Math.random() * 24) * 3600);
              }
            } else {
              // 70% spread throughout two years ago
              const daysAgo = 730 + Math.floor(Math.random() * 365); // Between 2-3 years ago
              timestamp = now - (daysAgo * 86400) - (Math.floor(Math.random() * 24) * 3600);
            }
          }
          
          // Assign users with natural patterns that evolve over time
          // Different user distribution based on the year category
          if (yearCategory === 'current') {
            // Current year: More power users, wider distribution
            if (index % 4 === 0) { // 25% from regular users
              const regularUserIndex = powerUserCount + Math.floor(Math.random() * regularUserCount);
              userId = fixedUserIds[regularUserIndex];
              userDisplayName = fixedUserNames[regularUserIndex];
            } else { // 75% from power users with power law distribution
              const powerUserIndex = Math.floor(Math.pow(Math.random(), 1.3) * powerUserCount);
              userId = fixedUserIds[powerUserIndex];
              userDisplayName = fixedUserNames[powerUserIndex];
            }
          } else if (yearCategory === 'lastYear') {
            // Last year: Slightly fewer power users
            if (index % 5 === 0) { // 20% from regular users
              const regularUserIndex = powerUserCount + Math.floor(Math.random() * regularUserCount);
              userId = fixedUserIds[regularUserIndex];
              userDisplayName = fixedUserNames[regularUserIndex];
            } else { // 80% from power users with steeper power law (more concentrated)
              const powerUserIndex = Math.floor(Math.pow(Math.random(), 1.7) * powerUserCount);
              userId = fixedUserIds[powerUserIndex];
              userDisplayName = fixedUserNames[powerUserIndex];
            }
          } else {
            // Two years ago: Even fewer power users, more concentrated
            if (index % 6 === 0) { // ~17% from regular users
              const regularUserIndex = powerUserCount + Math.floor(Math.random() * regularUserCount);
              userId = fixedUserIds[regularUserIndex];
              userDisplayName = fixedUserNames[regularUserIndex];
            } else { // 83% from power users with very steep power law (highly concentrated)
              const powerUserIndex = Math.floor(Math.pow(Math.random(), 2.0) * (powerUserCount * 0.8)); // Only 80% of power users were active
              userId = fixedUserIds[powerUserIndex];
              userDisplayName = fixedUserNames[powerUserIndex];
            }
          }
          
          return {
            name: emoji.name,
            url: emoji.url,
            created: timestamp,
            user_id: userId,
            user_display_name: userDisplayName,
            is_alias: 0,
            team_id: 'T01',
            is_bad: false,
            can_delete: true
          };
        });
        return emojis;
      }
    }

    // Return empty array if data is not in expected format
    console.error('Demo emoji data not in expected format');
    return [];
  } catch (error) {
    console.error('Error loading demo emoji data:', error);
    return [];
  }
};

// Helper function to generate random letters
function getRandomLetters(length: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

// Helper function to generate random user names
function getRandomUserName(): string {
  const firstNames = [
    'Alex', 'Jamie', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Morgan', 'Dakota',
    'Skyler', 'Reese', 'Finley', 'Cameron', 'Emerson', 'Blake', 'Hayden', 'Parker', 'Rowan', 'Charlie',
    'Sophia', 'Emma', 'Olivia', 'Noah', 'Liam', 'Ethan', 'Mason', 'Lucas', 'Oliver', 'Elijah',
    'Amelia', 'Mia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Elizabeth', 'Camila', 'Luna',
    'Benjamin', 'William', 'James', 'Henry', 'Alexander', 'Michael', 'Daniel', 'Matthew', 'Jackson', 'David'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}

// Synchronous version for backward compatibility
export const generateDemoLeaderboard = () => [
  { user_id: "U01", user_display_name: "Sarah Johnson", emoji_count: 42, most_recent_emoji_timestamp: 1716278400, oldest_emoji_timestamp: 1713686400, l4wepw: 12.5, l4wepwChange: 5.2 },
  { user_id: "U02", user_display_name: "Michael Chen", emoji_count: 38, most_recent_emoji_timestamp: 1716278300, oldest_emoji_timestamp: 1713686300, l4wepw: 9.2, l4wepwChange: 3.1 },
  { user_id: "U03", user_display_name: "Aisha Patel", emoji_count: 31, most_recent_emoji_timestamp: 1716278200, oldest_emoji_timestamp: 1713686200, l4wepw: 8.7, l4wepwChange: 2.7 },
  { user_id: "U04", user_display_name: "Carlos Rodriguez", emoji_count: 27, most_recent_emoji_timestamp: 1716278100, oldest_emoji_timestamp: 1713686100, l4wepw: 7.3, l4wepwChange: 1.5 },
  { user_id: "U05", user_display_name: "Emma Wilson", emoji_count: 24, most_recent_emoji_timestamp: 1716278000, oldest_emoji_timestamp: 1713686000, l4wepw: 6.1, l4wepwChange: 0.0 }
];

// Async version for loading from file
export const loadDemoLeaderboard = async () => {
  try {
    // Client-side: use fetch
    let userData: any;
    if (typeof window === "undefined") {
      // Node.js (server-side)
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", "data", "demo-users.json");
      const fileContent = await fs.readFile(filePath, "utf-8");
      userData = JSON.parse(fileContent);
    } else {
      // Browser (client-side)
      const res = await fetch("/data/demo-users.json");
      userData = await res.json();
    }
    
    if (userData && userData.users && Array.isArray(userData.users)) {
      return userData.users;
    }
    
    // Fallback to default data if structure is unexpected
    return [
      { user_id: "U01", user_display_name: "Sarah Johnson", emoji_count: 42, most_recent_emoji_timestamp: 1716278400, oldest_emoji_timestamp: 1713686400, l4wepw: 12.5, l4wepwChange: 5.2 },
      { user_id: "U02", user_display_name: "Michael Chen", emoji_count: 38, most_recent_emoji_timestamp: 1716278300, oldest_emoji_timestamp: 1713686300, l4wepw: 9.2, l4wepwChange: 3.1 },
      { user_id: "U03", user_display_name: "Aisha Patel", emoji_count: 31, most_recent_emoji_timestamp: 1716278200, oldest_emoji_timestamp: 1713686200, l4wepw: 8.7, l4wepwChange: 2.7 },
      { user_id: "U04", user_display_name: "Carlos Rodriguez", emoji_count: 27, most_recent_emoji_timestamp: 1716278100, oldest_emoji_timestamp: 1713686100, l4wepw: 7.3, l4wepwChange: 1.5 },
      { user_id: "U05", user_display_name: "Emma Wilson", emoji_count: 24, most_recent_emoji_timestamp: 1716278000, oldest_emoji_timestamp: 1713686000, l4wepw: 6.1, l4wepwChange: 0.0 }
    ];
  } catch (err) {
    console.error("Failed to load demo user data:", err);
    return [
      { user_id: "U01", user_display_name: "Sarah Johnson", emoji_count: 42, most_recent_emoji_timestamp: 1716278400, oldest_emoji_timestamp: 1713686400, l4wepw: 12.5, l4wepwChange: 5.2 },
      { user_id: "U02", user_display_name: "Michael Chen", emoji_count: 38, most_recent_emoji_timestamp: 1716278300, oldest_emoji_timestamp: 1713686300, l4wepw: 9.2, l4wepwChange: 3.1 }
    ];
  }
}

// Synchronous version for backward compatibility
export const generateDemoChartData = (timeRange = "all") => {
  const now = new Date();
  let days = 30;
  
  switch (timeRange) {
    case "7d":
      days = 7;
      break;
    case "30d":
      days = 30;
      break;
    case "90d":
      days = 90;
      break;
    case "all":
    default:
      days = 180;
      break;
  }
  
  const data = [];
  const baseValue = 3;
  const trend = 0.05;
  const contributorRatio = 0.6;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i - 1));
    
    const dayOfWeek = date.getDay();
    const weekdayFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1.2;
    const randomFactor = 0.5 + Math.random();
    
    const created = Math.max(1, Math.round((baseValue + i * trend) * weekdayFactor * randomFactor));
    const uniqueContributors = Math.max(1, Math.round(created * contributorRatio * randomFactor));
    
    data.push({
      date: date.toISOString().split("T")[0],
      created,
      uniqueContributors,
    });
  }
  
  return data;
};

// Async version for loading from file
export const loadDemoChartData = async (timeRange = "all") => {
  try {
    // Client-side: use fetch
    let usageData: any;
    if (typeof window === "undefined") {
      // Node.js (server-side)
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", "data", "demo-emoji-usage.json");
      const fileContent = await fs.readFile(filePath, "utf-8");
      usageData = JSON.parse(fileContent);
    } else {
      // Browser (client-side)
      const res = await fetch("/data/demo-emoji-usage.json");
      usageData = await res.json();
    }
    
    if (!usageData) {
      throw new Error("Failed to load emoji usage data");
    }
    
    // Select the appropriate data based on timeRange
    let chartData = [];
    
    switch (timeRange) {
      case "7d":
        // Use the last 7 days from daily_usage
        if (usageData.daily_usage && Array.isArray(usageData.daily_usage)) {
          chartData = usageData.daily_usage.slice(-7).map((item: { date: string; count: number }) => ({
            date: item.date,
            created: item.count,
            uniqueContributors: Math.max(1, Math.round(item.count * 0.6))
          }));
        }
        break;
        
      case "30d":
        // Use the last 30 days from daily_usage
        if (usageData.daily_usage && Array.isArray(usageData.daily_usage)) {
          chartData = usageData.daily_usage.slice(-30).map((item: { date: string; count: number }) => ({
            date: item.date,
            created: item.count,
            uniqueContributors: Math.max(1, Math.round(item.count * 0.6))
          }));
        }
        break;
        
      case "90d":
        // Use weekly_trend data
        if (usageData.weekly_trend && Array.isArray(usageData.weekly_trend)) {
          chartData = usageData.weekly_trend.map((item: { week: string; count: number }) => ({
            date: item.week,
            created: item.count,
            uniqueContributors: Math.max(1, Math.round(item.count * 0.6))
          }));
        }
        break;
        
      case "all":
      default:
        // Use monthly_trend data
        if (usageData.monthly_trend && Array.isArray(usageData.monthly_trend)) {
          chartData = usageData.monthly_trend.map((item: { month: string; count: number }) => ({
            date: item.month,
            created: item.count,
            uniqueContributors: Math.max(1, Math.round(item.count * 0.6))
          }));
        }
        break;
    }
    
    return chartData;
  } catch (err) {
    console.error("Failed to load demo chart data:", err);
    
    // Fallback to generating data if loading fails
    const now = new Date();
    let days = 30;
    
    switch (timeRange) {
      case "7d":
        days = 7;
        break;
      case "30d":
        days = 30;
        break;
      case "90d":
        days = 90;
        break;
      case "all-time":
      default:
        days = 180;
        break;
    }
    
    const data = [];
    const baseValue = 3;
    const trend = 0.05;
    const contributorRatio = 0.6;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      
      const dayOfWeek = date.getDay();
      const weekdayFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1.2;
      const randomFactor = 0.5 + Math.random();
      
      const created = Math.max(1, Math.round((baseValue + i * trend) * weekdayFactor * randomFactor));
      const uniqueContributors = Math.max(1, Math.round(created * contributorRatio * randomFactor));
      
      data.push({
        date: date.toISOString().split("T")[0],
        created,
        uniqueContributors,
      });
    }
    
    return data;
  }
}

// Generate stats for the cards - synchronous version for backward compatibility
export const generateDemoStats = () => {
  return {
    totalEmojis: 2852, // Updated to match our actual emoji count
    totalCreators: 38,
    mostRecent: "party_parrot",
    mostRecentTimestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    emojisPerUser: 75.1, // Updated to reflect higher emoji count
    weeklyEmojisChange: 12.4,
  };
};

// Async version for loading from file
export const loadDemoStats = async () => {
  try {
    // Client-side: use fetch
    let usageData: any;
    if (typeof window === "undefined") {
      // Node.js (server-side)
      const fs = await import("fs/promises");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", "data", "demo-emoji-usage.json");
      const fileContent = await fs.readFile(filePath, "utf-8");
      usageData = JSON.parse(fileContent);
    } else {
      // Browser (client-side)
      const res = await fetch("/data/demo-emoji-usage.json");
      usageData = await res.json();
    }
    
    if (!usageData) {
      throw new Error("Failed to load emoji usage data");
    }
    
    // Calculate total emojis from category distribution
    let totalEmojis = 0;
    if (usageData.category_distribution && Array.isArray(usageData.category_distribution)) {
      totalEmojis = usageData.category_distribution.reduce((sum: number, category: { count: number }) => sum + category.count, 0);
    }
    
    // Get top emoji
    let mostRecent = "party_parrot";
    if (usageData.top_emojis && Array.isArray(usageData.top_emojis) && usageData.top_emojis.length > 0) {
      mostRecent = usageData.top_emojis[0].name.replace(/:/g, "");
    }
    
    // Get total creators from top_creators
    let totalCreators = 38;
    if (usageData.top_creators && Array.isArray(usageData.top_creators)) {
      totalCreators = usageData.top_creators.length;
    }
    
    // Calculate emojis per user
    const emojisPerUser = totalEmojis / totalCreators;
    
    // Calculate weekly change
    let weeklyEmojisChange = 12.4;
    if (usageData.weekly_trend && Array.isArray(usageData.weekly_trend) && usageData.weekly_trend.length >= 2) {
      const lastWeek = usageData.weekly_trend[usageData.weekly_trend.length - 1].count;
      const previousWeek = usageData.weekly_trend[usageData.weekly_trend.length - 2].count;
      if (previousWeek > 0) {
        weeklyEmojisChange = ((lastWeek - previousWeek) / previousWeek) * 100;
      }
    }
    
    return {
      totalEmojis,
      totalCreators,
      mostRecent,
      mostRecentTimestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      emojisPerUser,
      weeklyEmojisChange,
    };
  } catch (err) {
    console.error("Failed to load demo stats data:", err);
    
    // Fallback to default stats if loading fails
    return {
      totalEmojis: 2852, // Updated to match our actual emoji count
      totalCreators: 38,
      mostRecent: "party_parrot",
      mostRecentTimestamp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      emojisPerUser: 75.1, // Updated to reflect higher emoji count
      weeklyEmojisChange: 12.4,
    };
  }
}
