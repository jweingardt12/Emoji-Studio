"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A line chart with emoji count labels"

interface LineChartLabelProps {
  data?: Array<{ value: number; label: string }>;
  title?: string;
  subtitle?: string;
  onClick?: () => void;
}

const chartConfig = {
  count: {
    label: "Emojis",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function LineChartLabel({ data, title = "Emoji Creation Trend", subtitle = "Monthly emoji count for 2024", onClick }: LineChartLabelProps) {
  // Transform the data format from { value, label } to { month, count }
  const chartData = data ? data.map(item => ({
    month: item.label,
    count: item.value
  })) : [
    // Fallback demo data if no data provided
    { month: "Jan", count: 0 },
    { month: "Feb", count: 0 },
    { month: "Mar", count: 0 },
    { month: "Apr", count: 0 },
    { month: "May", count: 0 },
    { month: "Jun", count: 0 },
    { month: "Jul", count: 0 },
    { month: "Aug", count: 0 },
    { month: "Sep", count: 0 },
    { month: "Oct", count: 0 },
    { month: "Nov", count: 0 },
    { month: "Dec", count: 0 },
  ];

  const total = chartData.reduce((sum, item) => sum + item.count, 0)
  const average = Math.round(total / chartData.length)
  const lastMonth = chartData[chartData.length - 1]?.count || 0;
  const secondLastMonth = chartData[chartData.length - 2]?.count || 0;
  const trend = secondLastMonth > 0 
    ? ((lastMonth - secondLastMonth) / secondLastMonth * 100).toFixed(1)
    : "0";

  return (
    <Card 
      className="w-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="count"
              type="natural"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-count)",
              }}
              activeDot={{
                r: 6,
              }}
            >
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {Number(trend) > 0 ? (
            <>Trending up by {Math.abs(Number(trend))}% this month <TrendingUp className="h-4 w-4" /></>
          ) : (
            <>Trending down by {Math.abs(Number(trend))}% this month</>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Average: {average} emojis per month
        </div>
      </CardFooter>
    </Card>
  )
}