import React, { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, LabelList, ResponsiveContainer } from "recharts"
import { TrendingUp, Calendar } from "lucide-react"
import { TimeRange } from "../use-visualization-data"

interface OverviewTabProps {
    chartData: any
    timeRange: TimeRange
    activeEmojiType: "image" | "gif"
    handleTypeChange: (type: "image" | "gif") => void
    handleDateClick: (data: any) => void
    isClient: boolean
    timeRangeOptions: { value: TimeRange; label: string }[]
}

export const OverviewTab = memo(({
    chartData,
    timeRange,
    activeEmojiType,
    handleTypeChange,
    handleDateClick,
    isClient,
    timeRangeOptions
}: OverviewTabProps) => {
    return (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Top Emoji Creation Days - Half width */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Top Emoji Creation Days</CardTitle>
                    <CardDescription>Days with the highest emoji creation activity</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                    <ChartContainer
                        className="h-[200px] sm:h-[300px] w-full max-w-full"
                        config={{
                            count: {
                                label: "",
                                color: "#4169E1"
                            },
                            label: {
                                color: "hsl(var(--background))"
                            }
                        }}
                    >
                        <BarChart
                            accessibilityLayer
                            data={chartData.creationTimeline.slice(0, 10)}
                            layout="vertical"
                            margin={{ right: 16 }}
                        >
                            <CartesianGrid horizontal={false} />
                            <YAxis
                                dataKey="date"
                                type="category"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                hide
                            />
                            <XAxis dataKey="count" type="number" hide />
                            <ChartTooltip
                                cursor={false}
                                content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <ChartTooltipContent>
                                                <div className="font-semibold">{payload[0].payload.date}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {payload[0].value} emojis
                                                </div>
                                            </ChartTooltipContent>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar
                                dataKey="count"
                                layout="vertical"
                                fill="#4169E1"
                                radius={4}
                                onClick={handleDateClick}
                                style={{ cursor: 'pointer' }}
                                isAnimationActive={false}
                            >
                                <LabelList
                                    dataKey="date"
                                    position="insideLeft"
                                    offset={8}
                                    className="fill-[--color-label] text-xs sm:text-sm"
                                    fontSize={12}
                                    formatter={(value: any) => {
                                        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                                        if (isMobile && typeof value === 'string') {
                                            const parts = value.split(' ');
                                            if (parts.length >= 2) {
                                                return `${parts[0]} ${parts[1].replace(',', '')}`;
                                            }
                                        }
                                        return value;
                                    }}
                                />
                                <LabelList
                                    dataKey="count"
                                    position="right"
                                    offset={8}
                                    className="fill-foreground"
                                    fontSize={12}
                                />
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        Peak day: {chartData.creationTimeline[0]?.date}
                        <TrendingUp className="h-4 w-4" />
                    </div>
                </CardFooter>
            </Card>

            {/* Monthly/Daily Trend - Half width */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>{timeRange === "7days" || timeRange === "30days" ? "Daily" : "Monthly"} Emoji Creation</CardTitle>
                    <CardDescription>{timeRange === "all" ? "All-time" : timeRangeOptions.find(o => o.value === timeRange)?.label || ""} trend of emoji creation</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                    <ChartContainer
                        className="aspect-[4/3] w-full max-w-full"
                        config={{
                            count: {
                                label: "",
                                theme: {
                                    light: "#8884d8",
                                    dark: "#8884d8"
                                }
                            }
                        }}
                    >
                        <LineChart
                            data={chartData.emojisByMonth}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                            />
                            <ChartTooltip
                                content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-background/90 border rounded-md shadow-md px-3 py-2 text-sm">
                                                <div className="font-semibold">{payload[0].payload.month}</div>
                                                <div className="text-muted-foreground">
                                                    {payload[0].value} emojis
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                                cursor={false}
                                offset={10}
                            />
                            <ChartLegend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                strokeWidth={2}
                                activeDot={{ r: 4, strokeWidth: 0, fill: "#008FFB" }}
                                dot={{ r: 2, strokeWidth: 0, fill: "#008FFB" }}
                                stroke="#008FFB"
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Image vs GIF Emojis - Interactive Chart */}
            <Card className="lg:col-span-2">
                <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
                    <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                        <CardTitle>Image vs GIF Emojis</CardTitle>
                        <CardDescription>
                            Breakdown of emoji types {timeRange === "all" ? "over all time" : `over the ${timeRangeOptions.find(o => o.value === timeRange)?.label.toLowerCase() || ""}`}
                        </CardDescription>
                    </div>
                    <div className="flex">
                        {(["image", "gif"] as const).map((key) => {
                            // Calculate total from the daily data for consistency
                            const total = chartData.emojiTypes.reduce((acc: number, curr: any) => acc + curr[key], 0);
                            const isActive = activeEmojiType === key;
                            return (
                                <button
                                    key={key}
                                    data-active={isActive}
                                    className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                                    onClick={() => handleTypeChange(key)}
                                >
                                    <span className="text-xs text-muted-foreground">
                                        {key === "image" ? "Static Images" : "Animated GIFs"}
                                    </span>
                                    <span className="text-lg font-bold leading-none sm:text-3xl">
                                        {total.toLocaleString()}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </CardHeader>
                <CardContent className="px-2 sm:p-6">
                    <ChartContainer
                        config={{
                            views: { label: "Emoji Count" },
                            image: { label: "Static Images", color: "#00E396" },
                            gif: { label: "Animated GIFs", color: "#FF4560" },
                        }}
                        className="aspect-auto h-[250px] w-full"
                    >
                        <BarChart
                            accessibilityLayer
                            data={chartData.emojiTypes}
                            margin={{ left: 12, right: 12 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(value: string) => {
                                    const date = new Date(value)
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    })
                                }}
                            />
                            <ChartTooltip
                                content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                                    if (active && payload && payload.length) {
                                        const date = new Date(payload[0].payload.date);
                                        return (
                                            <ChartTooltipContent>
                                                <div className="font-semibold">
                                                    {date.toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {payload[0].value} {activeEmojiType === "image" ? "static images" : "animated GIFs"}
                                                </div>
                                            </ChartTooltipContent>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Bar dataKey={activeEmojiType} fill={activeEmojiType === "image" ? "#00E396" : "#FF4560"} radius={4} isAnimationActive={false} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Community Growth */}
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Community Growth</CardTitle>
                    <CardDescription>Unique creators contributing over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer
                        config={{
                            count: { label: "Active Creators", color: "#06b6d4" },
                        }}
                        className="h-[300px] w-full"
                    >
                        <AreaChart
                            data={chartData.activeCreatorsTimeline}
                            margin={{ left: 12, right: 12, top: 12 }}
                        >
                            <defs>
                                <linearGradient id="fillCreators" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(value: string) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    });
                                }}
                            />
                            <YAxis tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Area
                                type="step"
                                dataKey="count"
                                stroke="#06b6d4"
                                fill="url(#fillCreators)"
                                fillOpacity={1}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter className="flex-col items-start gap-2 text-sm">
                    <div className="flex gap-2 font-medium leading-none">
                        {chartData.activeCreatorsTimeline.length > 0 && (
                            <>
                                Total contributors: {chartData.activeCreatorsTimeline[chartData.activeCreatorsTimeline.length - 1]?.count || 0}
                                <TrendingUp className="h-4 w-4" />
                            </>
                        )}
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
})

OverviewTab.displayName = "OverviewTab"
