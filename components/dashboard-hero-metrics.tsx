'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { TrendingDownIcon, TrendingUpIcon, Users, Clock, Activity, Calendar } from "lucide-react";
import { useEmojiData } from "@/lib/hooks/use-emoji-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  onClick?: () => void;
  chartData?: Array<{ value: number; label: string; [key: string]: any }>;
  chartType?: 'area' | 'bar';
  chartConfig?: ChartConfig;
  dataKey?: string;
}

function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  trend, 
  subtitle, 
  onClick, 
  chartData, 
  chartType = 'bar',
  chartConfig,
  dataKey = 'value'
}: MetricCardProps) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer select-none",
        "h-[200px] transition-all hover:shadow-md"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{value}</span>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {trend === 'up' ? (
                    <TrendingUpIcon className="h-3 w-3 text-green-500" />
                  ) : trend === 'down' ? (
                    <TrendingDownIcon className="h-3 w-3 text-red-500" />
                  ) : null}
                  <span className={cn(
                    "text-xs font-medium",
                    trend === 'up' ? "text-green-500" : 
                    trend === 'down' ? "text-red-500" : 
                    "text-muted-foreground"
                  )}>
                    {trend === 'up' ? '+' : ''}{change}%
                    {changeLabel && ` ${changeLabel}`}
                  </span>
                </div>
              )}
            </div>
            {subtitle && (
              <CardDescription className="text-xs">
                {subtitle}
              </CardDescription>
            )}
          </div>
          <div className="text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {chartData && chartData.length > 0 && chartConfig && (
          <ChartContainer config={chartConfig} className="h-[80px] w-full">
            {chartType === 'area' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={`var(--color-${dataKey})`}
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent hideLabel />}
                  cursor={false}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              >
                <Bar
                  dataKey={dataKey}
                  fill={`var(--color-${dataKey})`}
                  radius={[2, 2, 0, 0]}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent hideLabel />}
                  cursor={false}
                />
              </BarChart>
            )}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// Main Total Emojis card with full area chart
function TotalEmojisCard({ 
  data, 
  value, 
  subtitle, 
  change, 
  trend, 
  onClick 
}: {
  data: Array<{ month: string; total: number; }>;
  value: number;
  subtitle: string;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}) {
  const chartConfig = {
    total: {
      label: "Total Emojis",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;

  return (
    <Card 
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer select-none h-[200px] transition-all hover:shadow-md"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Emojis
            </CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{value.toLocaleString()}</span>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {trend === 'up' ? (
                    <TrendingUpIcon className="h-3 w-3 text-green-500" />
                  ) : trend === 'down' ? (
                    <TrendingDownIcon className="h-3 w-3 text-red-500" />
                  ) : null}
                  <span className={cn(
                    "text-xs font-medium",
                    trend === 'up' ? "text-green-500" : 
                    trend === 'down' ? "text-red-500" : 
                    "text-muted-foreground"
                  )}>
                    {trend === 'up' ? '+' : ''}{change}% vs last year
                  </span>
                </div>
              )}
            </div>
            <CardDescription className="text-xs">
              {subtitle}
            </CardDescription>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <ChartContainer config={chartConfig} className="h-[80px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              hide 
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-total)"
              strokeWidth={2}
              fill="url(#totalGradient)"
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  hideLabel
                  formatter={(value: any) => value.toLocaleString()}
                />
              }
              cursor={false}
            />
          </AreaChart>
        </ChartContainer>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-1 px-1">
          {data.map((item, index) => {
            const monthsFromEnd = data.length - 1 - index;
            const shouldShow = monthsFromEnd % 2 === 0;
            return (
              <div key={index} className="flex-1 text-center">
                {shouldShow && (
                  <span className="text-[10px] text-muted-foreground">
                    {item.month}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardHeroMetrics() {
  const router = useRouter();
  const { emojiData } = useEmojiData();
  const [isClient, setIsClient] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter out aliases from emojiData
  const nonAliasEmojis = emojiData.filter(e => !e.is_alias);

  // Calculate metrics
  const now = Math.floor(Date.now() / 1000);
  const weekAgo = now - (7 * 24 * 60 * 60);
  const monthAgo = now - (30 * 24 * 60 * 60);
  const yearAgo = now - (365 * 24 * 60 * 60);
  
  const weeklyEmojis = nonAliasEmojis.filter(e => e.created && e.created > weekAgo).length;
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const todayEmojis = nonAliasEmojis.filter(e => e.created && e.created >= todayStart).length;
  
  // Active users
  const activeUsers = new Set(
    nonAliasEmojis
      .filter(e => e.created && e.created > monthAgo)
      .map(e => e.user_id)
  ).size;
  
  // Calculate trends
  const twoWeeksAgo = now - (14 * 24 * 60 * 60);
  const previousWeekEmojis = nonAliasEmojis.filter(e => 
    e.created && e.created > twoWeeksAgo && e.created <= weekAgo
  ).length;
  
  const weeklyGrowth = previousWeekEmojis > 0 
    ? Math.round(((weeklyEmojis - previousWeekEmojis) / previousWeekEmojis) * 100)
    : 0;

  // EPW
  const fourWeeksAgo = now - (28 * 24 * 60 * 60);
  const emojisLast4Weeks = nonAliasEmojis.filter(e => e.created && e.created > fourWeeksAgo).length;
  const epw = (emojisLast4Weeks / 4).toFixed(1);

  // Year over year
  const emojisLastYear = nonAliasEmojis.filter(e => e.created && e.created > yearAgo).length;
  const emojisYearBefore = nonAliasEmojis.filter(e => 
    e.created && e.created > (yearAgo - (365 * 24 * 60 * 60)) && e.created <= yearAgo
  ).length;
  const yearlyGrowth = emojisYearBefore > 0 
    ? Math.round(((emojisLastYear - emojisYearBefore) / emojisYearBefore) * 100)
    : 0;

  // Prepare chart data for Total Emojis (cumulative)
  const totalEmojisData = useMemo(() => {
    const months = 12;
    const data = [];
    const currentDate = new Date();
    let cumulativeTotal = 0;
    
    const twelveMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - months + 1, 1);
    const startTimestamp = Math.floor(twelveMonthsAgo.getTime() / 1000);
    cumulativeTotal = nonAliasEmojis.filter(e => e.created && e.created < startTimestamp).length;
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = Math.floor(monthDate.getTime() / 1000);
      const monthEnd = Math.floor(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59).getTime() / 1000);
      
      const monthCount = nonAliasEmojis.filter(e => 
        e.created && e.created >= monthStart && e.created <= monthEnd
      ).length;
      
      cumulativeTotal += monthCount;
      
      data.push({ 
        month: format(monthDate, 'MMM'),
        total: cumulativeTotal,
        value: cumulativeTotal
      });
    }
    
    return data;
  }, [nonAliasEmojis]);

  // Daily data for Active Users
  const dailyData = useMemo(() => {
    const days = 30;
    const data = [];
    const currentDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const dayDate = new Date(currentDate);
      dayDate.setDate(currentDate.getDate() - i);
      const dayStart = Math.floor(dayDate.setHours(0, 0, 0, 0) / 1000);
      const dayEnd = Math.floor(dayDate.setHours(23, 59, 59, 999) / 1000);
      
      const count = nonAliasEmojis.filter(e => 
        e.created && e.created >= dayStart && e.created <= dayEnd
      ).length;
      
      data.push({ 
        value: count,
        label: format(dayDate, 'd')
      });
    }
    
    return data;
  }, [nonAliasEmojis]);

  // Weekly data
  const weeklyData = useMemo(() => {
    const weeks = 12;
    const data = [];
    const currentDate = new Date();
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - (i * 7) - currentDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const count = nonAliasEmojis.filter(e => 
        e.created && e.created >= Math.floor(weekStart.getTime() / 1000) && 
        e.created <= Math.floor(weekEnd.getTime() / 1000)
      ).length;
      
      data.push({ 
        value: count,
        label: `W${weeks - i}`
      });
    }
    
    return data;
  }, [nonAliasEmojis]);

  const metrics = [
    {
      title: "Active Users",
      value: activeUsers,
      icon: <Users className="h-4 w-4" />,
      subtitle: "Last 30 days",
      onClick: () => router.push('/leaderboard'),
      chartData: dailyData.slice(-14), // Last 14 days
      chartType: 'bar' as const,
      chartConfig: {
        value: {
          label: "Users",
          color: "hsl(var(--chart-2))",
        },
      } satisfies ChartConfig,
    },
    {
      title: "This Week",
      value: weeklyEmojis,
      icon: <Calendar className="h-4 w-4" />,
      change: weeklyGrowth,
      changeLabel: "vs last week",
      trend: weeklyGrowth > 0 ? 'up' as const : weeklyGrowth < 0 ? 'down' as const : 'neutral' as const,
      onClick: () => router.push('/explorer'),
      chartData: weeklyData,
      chartType: 'bar' as const,
      chartConfig: {
        value: {
          label: "Emojis",
          color: "hsl(var(--chart-3))",
        },
      } satisfies ChartConfig,
    },
    {
      title: "Today",
      value: todayEmojis,
      icon: <Clock className="h-4 w-4" />,
      subtitle: "So far today",
      onClick: () => router.push('/explorer'),
      chartData: dailyData.slice(-7), // Last 7 days
      chartType: 'bar' as const,
      chartConfig: {
        value: {
          label: "Emojis",
          color: "hsl(var(--chart-4))",
        },
      } satisfies ChartConfig,
    },
    {
      title: "EPW",
      value: epw,
      icon: <TrendingUpIcon className="h-4 w-4" />,
      subtitle: "4 week average",
      onClick: () => router.push('/visualizations'),
      chartData: weeklyData.slice(-8), // Last 8 weeks
      chartType: 'area' as const,
      chartConfig: {
        value: {
          label: "EPW",
          color: "hsl(var(--chart-5))",
        },
      } satisfies ChartConfig,
    },
    {
      title: "Daily Avg",
      value: Math.round(weeklyEmojis / 7),
      icon: <Activity className="h-4 w-4" />,
      subtitle: "7 day average",
      onClick: () => router.push('/visualizations'),
      chartData: dailyData.slice(-14), // Last 14 days
      chartType: 'area' as const,
      chartConfig: {
        value: {
          label: "Daily",
          color: "hsl(var(--chart-1))",
        },
      } satisfies ChartConfig,
    }
  ];

  if (!isClient) return null;

  return (
    <div className="relative">
      {/* Gradient fade indicators */}
      {showLeftGradient && (
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-r from-background via-background/50 to-transparent z-10 pointer-events-none" />
      )}
      {showRightGradient && (
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-12 bg-gradient-to-l from-background via-background/50 to-transparent z-10 pointer-events-none" />
      )}
      
      {/* Scrollable container */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto scrollbar-hide scroll-smooth"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch'
        }}
        onScroll={(e) => {
          const container = e.currentTarget;
          const scrollPosition = container.scrollLeft;
          const maxScroll = container.scrollWidth - container.clientWidth;
          
          setShowLeftGradient(scrollPosition > 10);
          setShowRightGradient(scrollPosition < maxScroll - 10);
          
          const cardWidth = container.firstElementChild?.firstElementChild?.clientWidth || 280;
          const gap = 12;
          const newIndex = Math.round(scrollPosition / (cardWidth + gap));
          setActiveIndex(newIndex);
        }}
      >
        <div className="flex gap-3 pb-2">
          {/* Total Emojis Card - First */}
          <div 
            className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[340px]"
            style={{ scrollSnapAlign: 'start' }}
          >
            <TotalEmojisCard
              data={totalEmojisData}
              value={nonAliasEmojis.length}
              subtitle={`${emojisLastYear} this year`}
              change={yearlyGrowth}
              trend={yearlyGrowth > 0 ? 'up' : yearlyGrowth < 0 ? 'down' : 'neutral'}
              onClick={() => router.push('/explorer')}
            />
          </div>
          
          {/* Other Metric Cards */}
          {metrics.map((metric, index) => (
            <div 
              key={index} 
              className="flex-shrink-0 w-[260px] sm:w-[280px] md:w-[300px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <MetricCard {...metric} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Scroll indicators */}
      <div className="flex justify-center gap-1 mt-2">
        {[...Array(metrics.length + 1)].map((_, index) => (
          <div
            key={index}
            className={cn(
              "rounded-full transition-all duration-300 cursor-pointer",
              activeIndex === index 
                ? "bg-primary" 
                : "bg-muted-foreground/30"
            )}
            style={{
              height: '3px',
              width: activeIndex === index ? '12px' : '3px'
            }}
            onClick={() => {
              if (scrollContainerRef.current) {
                const cards = scrollContainerRef.current.querySelectorAll('.flex-shrink-0');
                const gap = 12;
                
                let targetPosition = 0;
                for (let i = 0; i < index; i++) {
                  const card = cards[i];
                  targetPosition += (card?.clientWidth || 280) + gap;
                }
                
                scrollContainerRef.current.scrollTo({
                  left: targetPosition,
                  behavior: 'smooth'
                });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}