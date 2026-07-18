"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { LineChart } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useEmojiData } from "@/lib/hooks/use-emoji-data";
import type { Emoji, UserWithEmojiCount } from "@/lib/services/emoji-service";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmojiDetailsModal } from "@/components/emoji-details-modal";
import EmojiOverlay from "@/components/emoji-overlay";
import UserOverlay from "@/components/user-overlay";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import {
  format as formatDate,
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  parseISO,
} from "date-fns";

const chartConfig = {
  emojis: { label: "Emojis" },
  created: { label: "Created Emojis", color: "var(--chart-1)" },
  uniqueContributors: {
    label: "Unique Contributors",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] =
    React.useState<"all" | "90d" | "30d" | "7d">("all");

  const {
    emojiData,
    useDemoData,
    demoChartData,
    setDemoTimeRange,
  } = useEmojiData();

  const [now, setNow] = React.useState<Date | null>(null);
  const [isClient, setIsClient] = React.useState(false);

  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [selectedEmojis, setSelectedEmojis] = React.useState<Emoji[]>([]);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isMonthView, setIsMonthView] = React.useState(false);
  const [selectedEmoji, setSelectedEmoji] = React.useState<Emoji | null>(null);
  const [selectedUser, setSelectedUser] =
    React.useState<UserWithEmojiCount | null>(null);

  /* -------------------------------------------------------------------- */
  /*  Initialise “now” on mount                                           */
  /* -------------------------------------------------------------------- */
  React.useEffect(() => {
    setIsClient(true);
    setNow(new Date());
  }, []);

  /* -------------------------------------------------------------------- */
  /*  Listen for emoji data updates to force re-render                   */
  /* -------------------------------------------------------------------- */
  React.useEffect(() => {
    const handleEmojiDataUpdated = (event: Event) => {
      setNow(new Date()); // Update the timestamp to force recalculation
    };

    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdated);

    return () => {
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdated);
    };
  }, []);

  /* -------------------------------------------------------------------- */
  /*  Keep demo range in sync                                             */
  /* -------------------------------------------------------------------- */
  React.useEffect(() => {
    if (useDemoData) setDemoTimeRange(timeRange);
  }, [timeRange, useDemoData, setDemoTimeRange]);

  /* -------------------------------------------------------------------- */
  /*  Build chart series                                                  */
  /* -------------------------------------------------------------------- */
  const chartData = React.useMemo(() => {
    if (useDemoData) return demoChartData;
    if (!emojiData.length || !now) return [];

    const todayStart = startOfDay(now);
    const todayEnd = now;

    /** work out starting point */
    let startDate: Date;
    switch (timeRange) {
      case "7d":
        startDate = subDays(todayStart, 6);
        break;
      case "30d":
        startDate = subDays(todayStart, 29);
        break;
      case "90d":
        startDate = subDays(todayStart, 89);
        break;
      default: {
        const oldest =
          [...emojiData].sort((a, b) => a.created - b.created)[0] ??
          ({ created: todayStart.getTime() / 1000 } as Emoji);
        startDate = startOfDay(new Date(oldest.created * 1000));
      }
    }

    /** if “all” spans > 1 year use monthly buckets */
    if (timeRange === "all") {
      const spanDays =
        (todayEnd.getTime() - startDate.getTime()) / 86_400_000;
      if (spanDays > 365) {
        const months: Date[] = [];
        let d = new Date(startDate);
        d.setDate(1);
        while (d <= todayEnd) {
          months.push(new Date(d));
          d.setMonth(d.getMonth() + 1);
        }
        // Single pass over the data instead of one filter per month.
        const first = months[0];
        const last = months[months.length - 1];
        const rangeStart = Math.floor(
          new Date(first.getFullYear(), first.getMonth(), 1).getTime() / 1000,
        );
        const rangeEnd = Math.floor(
          new Date(last.getFullYear(), last.getMonth() + 1, 0, 23, 59, 59, 999).getTime() / 1000,
        );
        const byMonth = new Map<string, { created: number; users: Set<string> }>();
        for (const em of emojiData) {
          if (em.created < rangeStart || em.created > rangeEnd) continue;
          const key = formatDate(new Date(em.created * 1000), "yyyy-MM");
          let bucket = byMonth.get(key);
          if (!bucket) {
            bucket = { created: 0, users: new Set() };
            byMonth.set(key, bucket);
          }
          bucket.created += 1;
          bucket.users.add(em.user_id);
        }
        return months.map((mDate) => {
          const bucket = byMonth.get(formatDate(mDate, "yyyy-MM"));
          return {
            date: formatDate(mDate, "yyyy-MM"),
            created: bucket?.created ?? 0,
            uniqueContributors: bucket?.users.size ?? 0,
            isMonthly: true,
          };
        });
      }
    }

    /** otherwise bucket by day — single pass over the data instead of one
     *  filter per day */
    const days = eachDayOfInterval({ start: startDate, end: todayEnd });
    const rangeStart = Math.floor(startOfDay(days[0]).getTime() / 1000);
    const rangeEnd = Math.floor(endOfDay(days[days.length - 1]).getTime() / 1000);
    const byDay = new Map<string, { created: number; users: Set<string> }>();
    for (const em of emojiData) {
      if (em.created < rangeStart || em.created > rangeEnd) continue;
      const key = formatDate(new Date(em.created * 1000), "yyyy-MM-dd");
      let bucket = byDay.get(key);
      if (!bucket) {
        bucket = { created: 0, users: new Set() };
        byDay.set(key, bucket);
      }
      bucket.created += 1;
      bucket.users.add(em.user_id);
    }
    return days.map((d) => {
      const key = formatDate(d, "yyyy-MM-dd");
      const bucket = byDay.get(key);
      return {
        date: key,
        created: bucket?.created ?? 0,
        uniqueContributors: bucket?.users.size ?? 0,
      };
    });
  }, [emojiData, now, timeRange, useDemoData, demoChartData]);

  /* -------------------------------------------------------------------- */
  /*  Handle click → open modal                                           */
  /* -------------------------------------------------------------------- */
  // Handle chart clicks - full functionality on desktop, dots only on mobile
  const handleDataPointClick = (d: any) => {
    // Handle the new event structure (chart area clicks)
    if (d && d.activeLabel && typeof d.activeIndex !== 'undefined') {
      const index = parseInt(d.activeIndex);
      if (chartData && chartData[index]) {
        const payload = chartData[index];
        processDataPoint(payload);
        return;
      }
    }

    // Handle direct dot click (when d is the data point itself)
    if (d && d.payload && d.payload.date) {
      const payload = d.payload;
      processDataPoint(payload);
      return;
    }

    // Handle chart area click (when d has activePayload) - legacy support
    if (d?.activePayload?.length && emojiData.length) {
      const payload = d.activePayload[0].payload;
      if (payload?.date) {
        processDataPoint(payload);
      }
    }
  };

  const processDataPoint = (payload: any) => {
    if (!payload?.date || !emojiData.length) return;

    try {
      const monthly =
        payload.isMonthly ||
        (payload.date.length === 7 && payload.date.indexOf("-") === 4);

      let selDate: Date;
      let start: number;
      let end: number;

      if (monthly) {
        const [y, m] = payload.date.split("-").map(Number);
        selDate = new Date(y, m - 1, 1);
        start = Math.floor(selDate.getTime() / 1000);
        end = Math.floor(
          new Date(y, m, 0, 23, 59, 59, 999).getTime() / 1000,
        );
      } else {
        const [y, m, dd] = payload.date.split("-").map(Number);
        selDate = new Date(y, m - 1, dd);
        selDate.setHours(0, 0, 0, 0);
        start = Math.floor(selDate.getTime() / 1000);
        end = start + 86_400 - 1;
      }

      const batch = emojiData
        .filter((em) => em.created >= start && em.created <= end)
        .sort((a, b) => b.created - a.created);

      setSelectedDate(selDate);
      setSelectedEmojis(batch);
      setIsMonthView(monthly);
      setIsModalOpen(true);
    } catch (e) {
    }
  };

  /* -------------------------------------------------------------------- */
  /*  Skeleton while hydrates                                             */
  /* -------------------------------------------------------------------- */
  if (!isClient || !now) {
    return (
      <Card className="border-muted/40 shadow-xs bg-card/50 py-0 gap-0 rounded-xl">
        <CardHeader className="relative">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="absolute right-4 top-4">
            <Skeleton className="h-8 w-40" />
          </div>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  /* -------------------------------------------------------------------- */
  /*  Render chart                                                         */
  /* -------------------------------------------------------------------- */
  return (
    <Card className="border-muted/40 shadow-xs bg-card/50 overflow-hidden py-0 gap-0 rounded-xl">
      <CardHeader className="relative px-3 xs:px-4 sm:px-6 py-2 xs:py-3 sm:py-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LineChart className="h-5 w-5" aria-hidden="true" />
            Emoji Trends
          </h2>
          {!isMobile && (
            <p className="text-xs text-muted-foreground mt-1">Click any data point to see emojis from that period</p>
          )}
        </div>

        {/* time-range controls */}
        <div className="absolute right-2 xs:right-3 sm:right-4 top-3 xs:top-4 flex items-center gap-1 xs:gap-2">
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => v && setTimeRange(v as any)}
            variant="outline"
            className="@[767px]/card:flex hidden"
          >
            <ToggleGroupItem value="all" className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs sm:text-sm">
              All Time
            </ToggleGroupItem>
            <ToggleGroupItem value="90d" className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs sm:text-sm">
              3 Months
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs sm:text-sm">
              30 Days
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="h-7 sm:h-8 px-2 sm:px-2.5 text-xs sm:text-sm">
              7 Days
            </ToggleGroupItem>
          </ToggleGroup>

          <Select
            value={timeRange}
            onValueChange={(v) => setTimeRange(v as any)}
          >
            <SelectTrigger className="@[767px]/card:hidden flex h-7 w-[110px] sm:h-8 sm:w-[130px] md:w-40 text-xs sm:text-sm">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="90d">3 Months</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-0 sm:px-4 pb-4">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] xs:h-[220px] sm:h-[250px] w-full"
          aria-label="Emoji creation trends chart showing emojis created and unique contributors over time"
        >
          <AreaChart
            data={chartData}
            onClick={!isMobile ? handleDataPointClick : undefined}
            style={{ cursor: !isMobile ? "pointer" : "default" }}
            margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            {/* X-axis */}
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{
                fontSize: isMobile ? 9 : 12,
                fontWeight: "bold",
                fill: "var(--primary)", // Stronger contrast for labels
              }}
              interval={"equidistantPreserveStart"} // Show labels at regular intervals
              angle={isMobile ? -35 : 0}
              height={40} // Consistent height
              minTickGap={isMobile ? 10 : 20} // Reduced gap to show more labels
              tickFormatter={(val: string) => {
                /** monthly labels */
                if (val.length === 7 && val.indexOf("-") === 4) {
                  const [y, m] = val.split("-");
                  const d = new Date(+y, +m - 1, 1);

                  if (timeRange === "all") {
                    // For all-time view
                    if (d.getMonth() === 0) {
                      return isMobile ? `'${y.slice(2)}` : y;
                    }
                    return d.toLocaleDateString("en-US", { month: "short" });
                  }

                  return d.getMonth() === 0
                    ? y
                    : d.toLocaleDateString("en-US", { month: "short" });
                }

                /** daily labels */
                const d = new Date(val);
                if (timeRange === "7d") {
                  // For 7-day view, show all weekday names
                  return isMobile
                    ? d.toLocaleDateString("en-US", { weekday: "narrow" })
                    : d.toLocaleDateString("en-US", { weekday: "short" });
                }

                if (timeRange === "30d") {
                  const day = d.getDate();
                  // Show 1st of month and more frequent day numbers
                  if (day === 1) {
                    return d.toLocaleDateString("en-US", { month: "short" });
                  }
                  return day.toString();
                }

                /* 90 days */
                if (d.getDate() === 1) {
                  // Always show month names
                  return d.toLocaleDateString("en-US", { month: "short" });
                }

                if (isMobile) {
                  // On mobile, show some day numbers
                  if (d.getDate() % 10 === 0) {
                    return d.getDate().toString();
                  }
                  return "";
                }

                // Desktop 90-day view
                if (d.getDate() % 10 === 0) {
                  return d.getDate().toString();
                }
                return "";
              }}
            />

            {/* Y-axis */}
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={25}
              domain={[0, 'dataMax + 5']} // Reduce empty space at top
              tick={{ fontSize: isMobile ? 10 : 12, fill: "var(--primary)" }}
            />

            {/* Tooltip */}
            <ChartTooltip
              content={({ active, payload, label }: { active: boolean; payload?: any[]; label: string }) => {
                if (!active || !payload?.length) return null;

                const monthly =
                  label.length === 7 && label.indexOf("-") === 4;

                const heading = monthly
                  ? (() => {
                    const [y, m] = label.split("-");
                    const d = new Date(+y, +m - 1, 1);
                    return d.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    });
                  })()
                  : parseISO(label).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: timeRange === "all" ? "numeric" : undefined,
                  });

                return (
                  <div className="rounded-lg bg-background p-2 xs:p-3 text-xs shadow-lg ring-1 ring-border">
                    <div className="mb-1 text-xs xs:text-sm font-medium">{heading}</div>
                    {payload.map((p: any) => (
                      <div key={p.dataKey} className="flex items-center gap-1.5 xs:gap-2">
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: p.color,
                            display: "inline-block",
                          }}
                        />
                        <span className="text-xs xs:text-sm">
                          {p.name}: <b>{p.value}</b>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />

            {/* Gradients */}
            <defs>
              <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-created)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-created)"
                  stopOpacity={0.0}
                />
              </linearGradient>
              <linearGradient
                id="contributorsGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* Areas */}
            <Area
              type="monotone"
              dataKey="created"
              name="Created Emojis"
              stroke="var(--color-created)"
              strokeWidth={2}
              fill="url(#createdGradient)"
              fillOpacity={0.3}
              dot={chartData.length <= 31 ? {
                r: isMobile ? 2 : 3,
                fill: "var(--color-created)",
                stroke: "var(--color-created)",
                strokeWidth: isMobile ? 1 : 2,
                style: { cursor: isMobile ? "default" : "pointer" },
              } : false}
              connectNulls
              isAnimationActive={false}
              onClick={handleDataPointClick}
            />
            <Area
              type="monotone"
              dataKey="uniqueContributors"
              name="Unique Contributors"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill="url(#contributorsGradient)"
              fillOpacity={0.3}
              dot={chartData.length <= 31 ? {
                r: isMobile ? 2 : 3,
                fill: "var(--chart-2)",
                stroke: "var(--chart-2)",
                strokeWidth: isMobile ? 1 : 2,
                style: { cursor: isMobile ? "default" : "pointer" },
              } : false}
              connectNulls
              isAnimationActive={false}
              onClick={handleDataPointClick}
            />

            <Legend verticalAlign="bottom" height={isMobile ? 28 : 36} iconType="plainline" />
          </AreaChart>
        </ChartContainer>
      </CardContent>

      {/* ------------------------------------------------------- Modals/Overlays */}
      <EmojiDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        emojis={selectedEmojis}
        date={selectedDate ?? new Date()}
        isMonthView={isMonthView}
        onEmojiClick={(em) => {
          setIsModalOpen(false);
          setSelectedEmoji(em);
        }}
        onUserClick={(u) => {
          setIsModalOpen(false);
          setSelectedUser(u);
        }}
      />

      {selectedEmoji && (
        <EmojiOverlay
          emoji={selectedEmoji}
          onClose={() => setSelectedEmoji(null)}
          onEmojiClick={setSelectedEmoji}
          onUserClick={(id, name) => {
            setSelectedEmoji(null);
            const userBatch = emojiData.filter((e) => e.user_id === id);
            const count = userBatch.filter((e) => !e.is_alias).length;
            const times = userBatch.map((e) => e.created);
            const mostRecent = Math.max(...times, 0);
            const oldest = Math.min(...times, 0);

            const ranking = emojiData
              .reduce((acc, e) => {
                const u = acc.find((x) => x.id === e.user_id);
                u ? (u.count += 1) : acc.push({ id: e.user_id, count: 1 });
                return acc;
              }, [] as { id: string; count: number }[])
              .sort((a, b) => b.count - a.count);
            const rank = ranking.findIndex((x) => x.id === id) + 1;

            setSelectedUser({
              user_id: id,
              user_display_name: name,
              emoji_count: count,
              most_recent_emoji_timestamp: mostRecent,
              oldest_emoji_timestamp: oldest,
              l4wepw: 0,
              l4wepwChange: 0,
              rank: rank || undefined,
            });
          }}
        />
      )}

      {selectedUser && (
        <UserOverlay
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onEmojiClick={(em) => {
            setSelectedUser(null);
            setSelectedEmoji(em);
          }}
        />
      )}
    </Card>
  );
} 