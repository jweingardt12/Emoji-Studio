import React, { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, LabelList, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts"
import { TrendingUp, Activity } from "lucide-react"

interface ActivityTabProps {
    chartData: any
    isClient: boolean
}

export const ActivityTab = memo(({ chartData, isClient }: ActivityTabProps) => {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Activity className="h-6 w-6" />
                    Activity Patterns
                </h2>
                <p className="text-muted-foreground mb-4">When are emojis created?</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Emojis by Day of Week */}
                <Card className="md:col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Emojis by Day of Week</CardTitle>
                        <CardDescription>When emojis are typically created</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                count: { label: "Emojis Created", color: "#008FFB" },
                                label: { color: "hsl(var(--background))" }
                            }}
                            className="w-full h-auto aspect-[3/2]"
                        >
                            <BarChart
                                accessibilityLayer
                                data={chartData.weekdayDistribution}
                                layout="vertical"
                                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis
                                    dataKey="day"
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
                                                    <div className="font-semibold">{payload[0].payload.day}</div>
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
                                    fill="#008FFB"
                                    radius={4}
                                >
                                    <LabelList
                                        dataKey="day"
                                        position="insideLeft"
                                        offset={8}
                                        className="fill-[--color-label]"
                                        fontSize={12}
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
                            Most active day: {chartData.weekdayDistribution.sort((a: any, b: any) => b.count - a.count)[0]?.day}
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardFooter>
                </Card>

                {/* Emoji Creation by Hour - Fill remaining row space */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-4">
                        <CardTitle>Emoji Creation by Hour</CardTitle>
                        <CardDescription>When emojis are created</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-0">
                        {isClient && (
                            <ChartContainer
                                config={{
                                    count: { label: "Emojis Created", color: "#8b5cf6" }
                                }}
                                className="mx-auto aspect-square max-h-[350px]"
                            >
                                <RadarChart
                                    data={chartData.emojisByHour}
                                    outerRadius={120}
                                >
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                    <PolarAngleAxis
                                        dataKey="timeOfDay"
                                        tick={{ fill: '#a1a1aa' }}
                                        axisLine={{ stroke: '#3f3f46' }}
                                    />
                                    <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                                    <Radar
                                        name="Emojis Created"
                                        dataKey="count"
                                        fill="#8b5cf6"
                                        stroke="#8b5cf6"
                                        fillOpacity={0.6}
                                    />
                                </RadarChart>
                            </ChartContainer>
                        )}
                        {!isClient && (
                            <div className="flex items-center justify-center h-[350px]">
                                <p className="text-muted-foreground">Loading chart...</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col gap-2 text-sm">
                        <div className="flex items-center gap-2 font-medium leading-none">
                            Peak: {chartData.peakTimePeriod}
                            <TrendingUp className="h-4 w-4" />
                        </div>
                    </CardFooter>
                </Card>

                {/* Cumulative Emoji Growth - Stacked Area Chart */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Cumulative Emoji Growth</CardTitle>
                        <CardDescription>Total emoji library size over time (stacked by type)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                images: { label: "Static Images", color: "#00E396" },
                                gifs: { label: "Animated GIFs", color: "#FF4560" },
                            }}
                            className="h-[300px] w-full"
                        >
                            <AreaChart
                                data={chartData.cumulativeGrowth}
                                margin={{ left: 12, right: 12, top: 12 }}
                            >
                                <defs>
                                    <linearGradient id="fillImages" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00E396" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#00E396" stopOpacity={0.1} />
                                    </linearGradient>
                                    <linearGradient id="fillGifs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FF4560" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#FF4560" stopOpacity={0.1} />
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
                                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                <ChartLegend content={<ChartTooltipContent />} />
                                <Area
                                    type="monotone"
                                    dataKey="images"
                                    stackId="1"
                                    stroke="#00E396"
                                    fill="url(#fillImages)"
                                    fillOpacity={1}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="gifs"
                                    stackId="1"
                                    stroke="#FF4560"
                                    fill="url(#fillGifs)"
                                    fillOpacity={1}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            {chartData.cumulativeGrowth.length > 0 && (
                                <>
                                    Current total: {chartData.cumulativeGrowth[chartData.cumulativeGrowth.length - 1]?.total || 0} emojis
                                    <TrendingUp className="h-4 w-4" />
                                </>
                            )}
                        </div>
                    </CardFooter>
                </Card>

                {/* Seasonal Patterns - Multi-line Area Chart */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Seasonal Patterns</CardTitle>
                        <CardDescription>Emoji creation by month across years</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                ...chartData.seasonalYears.reduce((acc: Record<string, any>, year: string, index: number) => {
                                    const COLORS = ['#FF4560', '#00E396', '#FEB019', '#008FFB', '#775DD0', '#2E93FA', '#F9A3A4', '#26C6DA', '#64C2A6', '#AECB4F', '#EE6868', '#A86CE4'];
                                    acc[year] = {
                                        label: year,
                                        color: COLORS[index % COLORS.length],
                                    };
                                    return acc;
                                }, {}),
                            }}
                            className="h-[300px] w-full"
                        >
                            <AreaChart
                                data={chartData.seasonalData}
                                margin={{ left: 12, right: 12, top: 12 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend />
                                {chartData.seasonalYears.map((year: string, index: number) => {
                                    const COLORS = ['#FF4560', '#00E396', '#FEB019', '#008FFB', '#775DD0', '#2E93FA', '#F9A3A4', '#26C6DA', '#64C2A6', '#AECB4F', '#EE6868', '#A86CE4'];
                                    return (
                                        <Area
                                            key={year}
                                            type="monotone"
                                            dataKey={year}
                                            stroke={COLORS[index % COLORS.length]}
                                            fill={COLORS[index % COLORS.length]}
                                            fillOpacity={0.3}
                                        />
                                    )
                                })}
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Creation Velocity - Gradient Area Chart */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Emoji Creation Velocity</CardTitle>
                        <CardDescription>Weekly emoji creation rate with 4-week moving average</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                count: { label: "Emojis per Week", color: "#8b5cf6" },
                                movingAvg: { label: "4-Week Average", color: "#06b6d4" },
                            }}
                            className="h-[300px] w-full"
                        >
                            <AreaChart
                                data={chartData.creationVelocity}
                                margin={{ left: 12, right: 12, top: 12 }}
                            >
                                <defs>
                                    <linearGradient id="fillVelocity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="week"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={32}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                                <ChartLegend content={<ChartTooltipContent />} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8b5cf6"
                                    fill="url(#fillVelocity)"
                                    fillOpacity={1}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="movingAvg"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            {chartData.creationVelocity.length > 0 && (
                                <>
                                    Recent velocity: {chartData.creationVelocity[chartData.creationVelocity.length - 1]?.count || 0} emojis/week
                                    <Activity className="h-4 w-4" />
                                </>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
})

ActivityTab.displayName = "ActivityTab"
