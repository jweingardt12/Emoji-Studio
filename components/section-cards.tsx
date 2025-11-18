'use client';

import { useState, useEffect, useRef } from "react";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useEmojiData } from "@/lib/hooks/use-emoji-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoDrawerResponsive } from "@/components/info-drawer-responsive";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, LabelList } from "recharts";

export function SectionCards() {
  const { stats, loading, emojiData, userLeaderboard, useDemoData, hasRealData } = useEmojiData();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftBlur, setShowLeftBlur] = useState(false);
  const [showRightBlur, setShowRightBlur] = useState(true);
  const [now, setNow] = useState<number | null>(null);



  // Calculate time boundaries (hydration-safe)
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
  }, []);

  // Force re-render when emoji data is updated
  useEffect(() => {
    const handleEmojiDataUpdated = (event: Event) => {
      setNow(Math.floor(Date.now() / 1000)); // Update the timestamp to force recalculation
    };

    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated);

    return () => {
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated);
    };
  }, []);

  // Handle scroll to show/hide blur effects
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftBlur(scrollLeft > 10);
      setShowRightBlur(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Check scroll position on mount and resize
  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, []);

  if (now === null) {
    return null;
  }

  // Filter out aliases from emoji data
  const nonAliasEmojis = emojiData ? emojiData.filter((emoji) => !emoji.is_alias) : [];

  // --- Move chart data calculations here, now that 'now' is guaranteed ---
  const months: { start: number; end: number; label: string }[] = [];
  const monthLabels: string[] = [];
  const nowDate = new Date(now * 1000);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    months.push({
      start: Math.floor(d.getTime() / 1000),
      end: Math.floor(new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() / 1000),
      label: d.toLocaleString('default', { month: 'short' }),
    });
    monthLabels.push(d.toLocaleString('default', { month: 'short' }));
  }

  const totalEmojisChartData = months.map((m) => {
    const count = nonAliasEmojis.filter(e => e.created < m.end).length;
    return { month: m.label, emojis: count };
  });

  const aeuChartData = months.map(m => {
    const users = new Set(nonAliasEmojis
      .filter(e => e.created >= m.start && e.created < m.end)
      .map(e => e.user_id));
    return { month: m.label, aeu: users.size };
  });

  const epuChartData = months.map(m => {
    const monthEmojis = nonAliasEmojis.filter(e => e.created >= m.start && e.created < m.end);
    const users = new Set(monthEmojis.map(e => e.user_id));
    return { month: m.label, epu: users.size ? monthEmojis.length / users.size : 0 };
  });

  const epwChartData = months.map(m => {
    const monthEmojis = nonAliasEmojis.filter(e => e.created >= m.start && e.created < m.end);
    const weeks = Math.max(1, Math.round((m.end - m.start) / (7 * 24 * 60 * 60)));
    return { month: m.label, epw: monthEmojis.length / weeks };
  });

  // Year-over-year
  const oneYearAgo = now - 365 * 24 * 60 * 60;
  const emojisLastYear = nonAliasEmojis.filter(e => e.created < oneYearAgo);

  // Last week metrics
  const oneWeekAgo = now - 7 * 24 * 60 * 60;
  const recentEmojis = nonAliasEmojis.filter(e => e.created >= oneWeekAgo);
  const activeUserIds = new Set(recentEmojis.map(e => e.user_id));
  const activeUsersCount = activeUserIds.size;
  const emojisPerUser = activeUsersCount > 0 ? recentEmojis.length / activeUsersCount : 0;

  const twoWeeksAgo = now - 14 * 24 * 60 * 60;
  const previousWeekEmojis = nonAliasEmojis
    .filter(e => e.created >= twoWeeksAgo && e.created < oneWeekAgo);
  const previousWeekUserIds = new Set(previousWeekEmojis.map(e => e.user_id));
  const previousAeu = previousWeekUserIds.size;
  const aeu = activeUsersCount;
  const aeuChange = previousAeu > 0 ? ((aeu - previousAeu) / previousAeu) * 100 : 0;

  const epw = userLeaderboard && userLeaderboard.length > 0
    ? Math.round(userLeaderboard.reduce((sum, user) => sum + (user.l4wepw || 0), 0))
    : 0;
  const epwChange = userLeaderboard && userLeaderboard.length > 0
    ? userLeaderboard.reduce((sum, user) => sum + (user.l4wepwChange || 0), 0) / userLeaderboard.length
    : 0;

  if (loading && !useDemoData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-muted/40 shadow-sm bg-card/50">
            <CardHeader className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
            <CardFooter className="p-4 pt-0">
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats && !useDemoData) {
    return (
      <div className="*:data-[slot=card]:shadow-xs *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
        <Card className="@container/card">
          <CardHeader className="text-center py-4 xs:py-6">
            <CardTitle className="text-base xs:text-lg sm:text-xl">No Emoji Data Yet</CardTitle>
            <CardDescription className="text-xs xs:text-sm">Use the form above to fetch emoji data from your Slack workspace</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const totalNonAliasEmojis = nonAliasEmojis.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Emojis */}
      <div className="min-w-0">
        <InfoDrawerResponsive
          trigger={
            <Card tabIndex={0} role="button" className="group relative overflow-hidden border-muted/40 bg-gradient-to-br from-card to-card/50 hover:from-card hover:to-card hover:shadow-md transition-all duration-300 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Emojis</CardTitle>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] px-1.5 py-0.5 h-5",
                      emojisLastYear.length > 0
                        ? totalNonAliasEmojis > emojisLastYear.length
                          ? "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20"
                          : "text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20"
                        : "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20"
                    )}
                  >
                    {emojisLastYear.length > 0 ? (
                      totalNonAliasEmojis > emojisLastYear.length ? (
                        <TrendingUpIcon className="mr-1 h-3 w-3" />
                      ) : (
                        <TrendingDownIcon className="mr-1 h-3 w-3" />
                      )
                    ) : (
                      <TrendingUpIcon className="mr-1 h-3 w-3" />
                    )}
                    {emojisLastYear.length > 0
                      ? `${((totalNonAliasEmojis - emojisLastYear.length) / Math.max(1, emojisLastYear.length) * 100).toFixed(1)}%`
                      : `+${stats?.weeklyEmojisChange?.toFixed(1) || "12.4"}%`}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight tabular-nums">
                    {totalNonAliasEmojis.toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0">
                <p className="text-xs text-muted-foreground">
                  {totalNonAliasEmojis > emojisLastYear.length ? "Up from" : "Down from"} {emojisLastYear.length.toLocaleString()} last year
                </p>
              </CardFooter>
            </Card>
          }
          title="Total Emojis"
          description={`Total number of unique emojis in the workspace. Last year: ${emojisLastYear.length.toLocaleString()}`}
        >
          <div className="w-full aspect-[2/1] mb-2">
            <ChartContainer config={{ emojis: { label: "Emojis", color: "hsl(var(--chart-1))" } }} className="w-full h-full">
              <LineChart data={totalEmojisChartData} margin={{ top: 15, left: 8, right: 8, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Line dataKey="emojis" type="natural" stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={{ fill: "hsl(var(--chart-1))", r: 3 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>What:</strong> Total number of unique emojis.</p>
            <p><strong>Why:</strong> Reflects team creativity and engagement.</p>
          </div>
        </InfoDrawerResponsive>
      </div>
      {/* AEU */}
      <div className="min-w-0">
        <InfoDrawerResponsive
          trigger={
            <Card tabIndex={0} role="button" className="group relative overflow-hidden border-muted/40 bg-gradient-to-br from-card to-card/50 hover:from-card hover:to-card hover:shadow-md transition-all duration-300 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Uploaders</CardTitle>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] px-1.5 py-0.5 h-5",
                      aeuChange >= 0
                        ? "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20"
                        : "text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20"
                    )}
                  >
                    {aeuChange >= 0 ? <TrendingUpIcon className="mr-1 h-3 w-3" /> : <TrendingDownIcon className="mr-1 h-3 w-3" />}
                    {Math.abs(aeuChange).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight tabular-nums">
                    {aeu.toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0">
                <p className="text-xs text-muted-foreground">
                  {aeu === 0
                    ? "No active uploaders this week"
                    : aeuChange >= 0
                      ? "Active community participation"
                      : "Decrease in active uploaders"}
                </p>
              </CardFooter>
            </Card>
          }
          title="AEU"
          description="Number of unique users who have added emojis in the last 7 days"
        >
          <div className="w-full aspect-[2/1] mb-2">
            <ChartContainer config={{ aeu: { label: "Active Users", color: "hsl(var(--chart-2))" } }} className="w-full h-full">
              <LineChart data={aeuChartData} margin={{ top: 15, left: 8, right: 8, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Line dataKey="aeu" type="natural" stroke="hsl(var(--chart-2))" strokeWidth={1.5} dot={{ fill: "hsl(var(--chart-2))", r: 3 }} activeDot={{ r: 4 }}>
                  <LabelList position="top" offset={8} className="fill-foreground" fontSize={10} />
                </Line>
              </LineChart>
            </ChartContainer>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>What:</strong> Number of unique users who have added emojis in the last 7 days.</p>
            <p><strong>Why:</strong> Shows team's engagement and participation.</p>
          </div>
        </InfoDrawerResponsive>
      </div>
      {/* EPU */}
      <div className="min-w-0">
        <InfoDrawerResponsive
          trigger={
            <Card tabIndex={0} role="button" className="group relative overflow-hidden border-muted/40 bg-gradient-to-br from-card to-card/50 hover:from-card hover:to-card hover:shadow-md transition-all duration-300 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Emojis Per User</CardTitle>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] px-1.5 py-0.5 h-5",
                      activeUsersCount === 0
                        ? "text-muted-foreground bg-muted"
                        : emojisPerUser > 10
                          ? "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20"
                          : "text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20"
                    )}
                  >
                    {activeUsersCount === 0 ? (
                      "N/A"
                    ) : (
                      <>
                        {emojisPerUser > 10 ? <TrendingUpIcon className="mr-1 h-3 w-3" /> : <TrendingDownIcon className="mr-1 h-3 w-3" />}
                        {emojisPerUser > 10 ? "+7.2%" : "-3.5%"}
                      </>
                    )}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight tabular-nums">
                    {emojisPerUser.toFixed(1)}
                  </span>
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0">
                <p className="text-xs text-muted-foreground">
                  {activeUsersCount === 0
                    ? "No activity this week"
                    : emojisPerUser > 10
                      ? "Healthy engagement levels"
                      : "Low engagement per user"}
                </p>
              </CardFooter>
            </Card>
          }
          title="EPU"
          description="Average number of emojis added per active user in the last 7 days"
        >
          <div className="w-full aspect-[2/1] mb-2">
            <ChartContainer config={{ epu: { label: "EPU", color: "hsl(var(--chart-3))" } }} className="w-full h-full">
              <LineChart data={epuChartData} margin={{ top: 15, left: 8, right: 8, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Line dataKey="epu" type="natural" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={{ fill: "hsl(var(--chart-3))", r: 3 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>What:</strong> Avg. emojis per active user in 7 days.</p>
            <p><strong>Why:</strong> Shows how prolific your emoji creators are.</p>
          </div>
        </InfoDrawerResponsive>
      </div>
      {/* EPW */}
      <div className="min-w-0">
        <InfoDrawerResponsive
          trigger={
            <Card tabIndex={0} role="button" className="group relative overflow-hidden border-muted/40 bg-gradient-to-br from-card to-card/50 hover:from-card hover:to-card hover:shadow-md transition-all duration-300 cursor-pointer h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Emojis Per Week</CardTitle>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "font-mono text-[10px] px-1.5 py-0.5 h-5",
                      epwChange >= 0
                        ? "text-green-600 bg-green-500/10 dark:text-green-400 dark:bg-green-500/20"
                        : "text-red-600 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20"
                    )}
                  >
                    {epwChange >= 0 ? <TrendingUpIcon className="mr-1 h-3 w-3" /> : <TrendingDownIcon className="mr-1 h-3 w-3" />}
                    {Math.abs(epwChange).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight tabular-nums">
                    {epw.toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0">
                <p className="text-xs text-muted-foreground">
                  {epw === 0
                    ? "No weekly activity"
                    : epwChange >= 0
                      ? "Growing steadily"
                      : "Declining activity"}
                </p>
              </CardFooter>
            </Card>
          }
          title="EPW"
          description="Average number of emojis added per week in the last 4 weeks"
        >
          <div className="w-full aspect-[2/1] mb-2">
            <ChartContainer config={{ epw: { label: "EPW", color: "hsl(var(--chart-4))" } }} className="w-full h-full">
              <LineChart data={epwChartData} margin={{ top: 15, left: 8, right: 8, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10 }} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                <Line dataKey="epw" type="natural" stroke="hsl(var(--chart-4))" strokeWidth={1.5} dot={{ fill: "hsl(var(--chart-4))", r: 3 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>What:</strong> Avg. emojis per week in 4 weeks.</p>
            <p><strong>Why:</strong> Shows team's emoji creation pace.</p>
          </div>
        </InfoDrawerResponsive>
      </div>
    </div>

  );
}
