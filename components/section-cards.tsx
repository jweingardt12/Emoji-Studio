'use client';

import { useState, useEffect } from "react";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { useEmojiData } from "@/lib/hooks/use-emoji-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoDrawer } from "@/components/info-drawer";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, LabelList } from "recharts";

export function SectionCards() {
  const { stats, loading, emojiData, userLeaderboard, useDemoData } = useEmojiData();

  // Calculate time boundaries (hydration-safe)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
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
      <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4 px-2 xs:px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="@container/card">
            <CardHeader className="px-2 py-2 xs:px-2 xs:py-2 md:px-3 md:py-3">
              <Skeleton className="h-3 xs:h-4 w-16 xs:w-24" />
              <Skeleton className="h-6 xs:h-8 w-24 xs:w-32" />
            </CardHeader>
            <CardFooter className="px-2 xs:px-3 md:px-4 flex flex-col items-start gap-0.5 xs:gap-1 text-xs sm:text-sm md:text-base">
              <Skeleton className="h-3 xs:h-4 w-28 xs:w-40" />
              <Skeleton className="h-3 xs:h-4 w-24 xs:w-32" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats && !useDemoData) {
    return (
      <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4 px-2 xs:px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
        <Card className="@container/card col-span-full">
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
    <div>
      <div className="flex w-full overflow-x-auto snap-x snap-mandatory space-x-4 sm:grid sm:gap-4 sm:space-x-0 grid-cols-2 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 *:data-[slot=card]:shadow-xs *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
        {/* Total Emojis */}
        <div className="flex-none w-72 snap-start sm:flex-auto sm:w-auto min-h-[128px]">
          <InfoDrawer
            trigger={
              <Card tabIndex={0} role="button" className="@container/card cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader className="px-2 py-2 xs:px-2 xs:py-2 md:px-3 md:py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm xs:text-base md:text-lg font-semibold text-foreground cursor-pointer hover:opacity-80"><span className="border-b border-dotted border-muted-foreground">Total Emojis</span></CardTitle>
                    <div className="text-xs text-muted-foreground">All Unique Emojis</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base xs:text-lg sm:text-xl md:text-2xl xl:text-3xl font-semibold tabular-nums">
                      {totalNonAliasEmojis.toLocaleString()}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`flex gap-0.5 xs:gap-1 rounded-lg text-[10px] xs:text-xs ${
                        emojisLastYear.length > 0
                          ? totalNonAliasEmojis > emojisLastYear.length
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {emojisLastYear.length > 0 ? (
                        totalNonAliasEmojis > emojisLastYear.length ? (
                          <TrendingUpIcon className="size-2.5 xs:size-3" />
                        ) : (
                          <TrendingDownIcon className="size-2.5 xs:size-3" />
                        )
                      ) : (
                        <TrendingUpIcon className="size-2.5 xs:size-3" />
                      )}
                      {emojisLastYear.length > 0
                        ? (totalNonAliasEmojis > emojisLastYear.length ? "+" : "") +
                          `${((totalNonAliasEmojis - emojisLastYear.length) /
                            Math.max(1, emojisLastYear.length) *
                            100
                          ).toFixed(1)}% YoY`
                        : `+${stats?.weeklyEmojisChange?.toFixed(1) || "12.4"}%`}
                    </Badge>
                  </div>
                </CardHeader>
                <CardFooter className="px-2 xs:px-2 md:px-3 flex flex-col items-start gap-0.5 text-[10px] xs:text-xs md:text-sm">
                  <div className="flex gap-0.5 xs:gap-1 font-medium text-[10px] xs:text-xs">
                    {totalNonAliasEmojis > emojisLastYear.length
                      ? "Year-over-year growth"
                      : "Year-over-year decline"}
                  </div>
                  <div className="text-muted-foreground truncate whitespace-nowrap overflow-hidden text-[10px] xs:text-xs">
                    {emojisLastYear.length.toLocaleString()} emojis this time last year
                  </div>
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
          </InfoDrawer>
        </div>
        {/* AEU */}
        <div className="flex-none w-72 snap-start sm:flex-auto sm:w-auto min-h-[128px]">
          <InfoDrawer
            trigger={
              <Card tabIndex={0} role="button" className="@container/card cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader className="px-2 py-2 xs:px-2 xs:py-2 md:px-3 md:py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm xs:text-base md:text-lg font-semibold text-foreground cursor-pointer hover:opacity-80"><span className="border-b border-dotted border-muted-foreground">AEU</span></CardTitle>
                    <div className="text-xs text-muted-foreground">Active Emoji Uploaders</div>
                  </div>
                  <div className="flex items-center justify-between mt-1 xs:mt-2">
                    <CardTitle className="text-base xs:text-lg sm:text-xl md:text-2xl xl:text-3xl font-semibold tabular-nums">
                      {aeu.toLocaleString()}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`flex gap-0.5 xs:gap-1 rounded-lg text-[10px] xs:text-xs ${aeuChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {aeuChange >= 0 ? <TrendingUpIcon className="size-2.5 xs:size-3" /> : <TrendingDownIcon className="size-2.5 xs:size-3" />}
                      {Math.abs(aeuChange).toFixed(1)}% W/W
                    </Badge>
                  </div>
                </CardHeader>
                <CardFooter className="px-2 xs:px-2 md:px-3 flex flex-col items-start gap-0.5 text-[10px] xs:text-xs md:text-sm">
                  <div className="flex gap-0.5 xs:gap-1 font-medium text-[10px] xs:text-xs">
                    {aeuChange >= 0 ? "Active community" : "Stagnant participation"} {aeuChange >= 0 ? <TrendingUpIcon className="size-2.5 xs:size-3" /> : <TrendingDownIcon className="size-2.5 xs:size-3" />}
                  </div>
                  <div className="text-muted-foreground text-[10px] xs:text-xs">
                    {(stats?.totalCreators || 0) > 50 ? "Growing steadily" : "Needs more engagement"}
                  </div>
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
          </InfoDrawer>
        </div>
        {/* EPU */}
        <div className="flex-none w-72 snap-start sm:flex-auto sm:w-auto min-h-[128px]">
          <InfoDrawer
            trigger={
              <Card tabIndex={0} role="button" className="@container/card cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader className="px-2 py-2 sm:px-2 sm:py-2 md:px-3 md:py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm xs:text-base md:text-lg font-semibold text-foreground cursor-pointer hover:opacity-80"><span className="border-b border-dotted border-muted-foreground">EPU</span></CardTitle>
                    <div className="text-xs text-muted-foreground">Emojis Per User</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-xl md:text-2xl xl:text-3xl font-semibold tabular-nums">
                      {emojisPerUser.toFixed(2)}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`flex gap-1 rounded-lg text-xs ${emojisPerUser > 10 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {emojisPerUser > 10 ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
                      {emojisPerUser > 10 ? "+7.2% W/W" : "-3.5% W/W"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardFooter className="px-2 sm:px-2 md:px-3 flex flex-col items-start gap-0.5 text-xs sm:text-xs md:text-sm">
                  <div className="flex gap-1 font-medium text-xs">
                    {emojisPerUser > 10 ? "Healthy engagement" : "Low engagement"} {emojisPerUser > 10 ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
                  </div>
                  <div className="text-muted-foreground truncate whitespace-nowrap overflow-hidden text-xs">
                    {emojisPerUser > 15
                      ? "Above workspace average"
                      : emojisPerUser > 10
                        ? "Average engagement"
                        : "Below workspace average"}
                  </div>
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
          </InfoDrawer>
        </div>
        {/* EPW */}
        <div className="flex-none w-72 snap-start sm:flex-auto sm:w-auto min-h-[128px]">
          <InfoDrawer
            trigger={
              <Card tabIndex={0} role="button" className="@container/card cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader className="px-2 py-2 sm:px-2 sm:py-2 md:px-3 md:py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm xs:text-base md:text-lg font-semibold text-foreground cursor-pointer hover:opacity-80"><span className="border-b border-dotted border-muted-foreground">EPW</span></CardTitle>
                    <div className="text-xs text-muted-foreground">Emojis Per Week</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base xs:text-lg sm:text-xl md:text-2xl xl:text-3xl font-semibold tabular-nums">
                      {epw.toLocaleString()}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`flex gap-1 rounded-lg text-xs ${epwChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {epwChange >= 0 ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
                      {Math.abs(epwChange).toFixed(1)}% W/W
                    </Badge>
                  </div>
                </CardHeader>
                <CardFooter className="px-2 sm:px-2 md:px-3 flex flex-col items-start gap-0.5 text-xs sm:text-xs md:text-sm">
                  <div className="flex gap-1 font-medium text-xs">
                    {epwChange >= 0 ? "Growing steadily" : "Declining"} {epwChange >= 0 ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {epwChange >= 0 ? "Above workspace average" : "Below workspace average"}
                  </div>
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
          </InfoDrawer>
        </div>
      </div>
    </div>
  );
}
