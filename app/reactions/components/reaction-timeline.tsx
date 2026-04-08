"use client"

import { useMemo } from "react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ReactionTimelineProps {
  data: { date: string; count: number }[]
}

const chartConfig = {
  reactions: { label: "Reactions", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

export function ReactionTimeline({ data }: ReactionTimelineProps) {
  if (!data || data.length === 0) return null

  const { total, peak } = useMemo(() => {
    let total = 0
    let peak = { date: "", count: 0 }
    for (const d of data) {
      total += d.count
      if (d.count > peak.count) peak = d
    }
    return { total, peak }
  }, [data])

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle className="text-base">Reaction Activity</CardTitle>
          <CardDescription>
            {total.toLocaleString()} total reactions over the scanned period
          </CardDescription>
        </div>
        {peak.date && (
          <div className="flex items-center justify-center border-t px-6 py-3 sm:border-l sm:border-t-0 sm:py-0">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Peak</p>
              <p className="text-lg font-bold tabular-nums">{peak.count.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{peak.date}</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[200px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="reactionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-reactions)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-reactions)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <ChartTooltip
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              type="natural"
              dataKey="count"
              name="reactions"
              stroke="var(--color-reactions)"
              strokeWidth={2}
              fill="url(#reactionsGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-reactions)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
