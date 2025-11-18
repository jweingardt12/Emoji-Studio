import React, { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts"
import { FileText, Activity, TrendingUp } from "lucide-react"

interface ContentTabProps {
    chartData: any
    handleNameLengthClick: (data: any) => void
}

export const ContentTab = memo(({ chartData, handleNameLengthClick }: ContentTabProps) => {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    Content & Naming
                </h2>
                <p className="text-muted-foreground mb-4">What do emojis look like?</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Emoji Name Length Distribution */}
                <Card className="md:col-span-2 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Name Length Distribution</CardTitle>
                        <CardDescription>Tap to see emojis</CardDescription>
                    </CardHeader>
                    <CardContent className="p-2">
                        <ChartContainer
                            className="w-full h-[400px]"
                            config={{
                                count: {
                                    label: "",
                                    theme: {
                                        light: "#82ca9d",
                                        dark: "#82ca9d"
                                    }
                                }
                            }}
                        >
                            <BarChart
                                data={chartData.emojiDistribution}
                                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                <XAxis
                                    dataKey="length"
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
                                                <ChartTooltipContent>
                                                    <div className="font-semibold">{payload[0].payload.length} characters</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {payload[0].value} emojis
                                                    </div>
                                                </ChartTooltipContent>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <ChartLegend />
                                <Bar
                                    dataKey="count"
                                    fill="#00E396"
                                    radius={[4, 4, 0, 0]}
                                    onClick={handleNameLengthClick}
                                    cursor="pointer"
                                    background={{ fill: 'transparent' }}
                                    minPointSize={5}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* Average Emoji Name Length Trend */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Average Emoji Name Length Trend</CardTitle>
                        <CardDescription>How emoji naming creativity has evolved</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                avgLength: { label: "Avg Characters", color: "#f59e0b" },
                            }}
                            className="h-[300px] w-full"
                        >
                            <AreaChart
                                data={chartData.nameLengthTrend}
                                margin={{ left: 12, right: 12, top: 12 }}
                            >
                                <defs>
                                    <linearGradient id="fillNameLength" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={32}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip
                                    content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                                        if (active && payload && payload.length) {
                                            const date = payload[0].payload.date;
                                            const avgLength = payload[0].payload.avgLength;
                                            return (
                                                <ChartTooltipContent>
                                                    <div className="font-semibold">Week of {date}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Avg: {avgLength} characters
                                                    </div>
                                                </ChartTooltipContent>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="avgLength"
                                    stroke="#f59e0b"
                                    fill="url(#fillNameLength)"
                                    fillOpacity={1}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            {chartData.nameLengthTrend.length > 0 && (
                                <>
                                    Current avg: {chartData.nameLengthTrend[chartData.nameLengthTrend.length - 1]?.avgLength || 0} characters
                                    <Activity className="h-4 w-4" />
                                </>
                            )}
                        </div>
                    </CardFooter>
                </Card>

                {/* Emoji Type Market Share */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Emoji Type Market Share</CardTitle>
                        <CardDescription>GIF vs Image distribution over time (percentage)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                imagePercent: { label: "Static Images", color: "#00E396" },
                                gifPercent: { label: "Animated GIFs", color: "#FF4560" },
                            }}
                            className="h-[300px] w-full"
                        >
                            <AreaChart
                                data={chartData.typePercentages}
                                margin={{ left: 12, right: 12, top: 12 }}
                                stackOffset="expand"
                            >
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
                                <YAxis tickLine={false} axisLine={false} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} />
                                <ChartTooltip
                                    content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                                        if (active && payload && payload.length) {
                                            const date = new Date(payload[0].payload.date);
                                            const imagePercent = payload[0].payload.imagePercent;
                                            const gifPercent = payload[0].payload.gifPercent;
                                            return (
                                                <ChartTooltipContent>
                                                    <div className="font-semibold">
                                                        {date.toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })}
                                                    </div>
                                                    <div className="text-xs space-y-1 mt-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#00E396" }} />
                                                            <span className="text-muted-foreground">{imagePercent}% images</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#FF4560" }} />
                                                            <span className="text-muted-foreground">{gifPercent}% GIFs</span>
                                                        </div>
                                                    </div>
                                                </ChartTooltipContent>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="imagePercent"
                                    stackId="1"
                                    stroke="#00E396"
                                    fill="#00E396"
                                    fillOpacity={0.6}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="gifPercent"
                                    stackId="1"
                                    stroke="#FF4560"
                                    fill="#FF4560"
                                    fillOpacity={0.6}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            {chartData.typePercentages.length > 0 && (
                                <>
                                    Current: {chartData.typePercentages[chartData.typePercentages.length - 1]?.imagePercent || 0}% images, {chartData.typePercentages[chartData.typePercentages.length - 1]?.gifPercent || 0}% GIFs
                                    <TrendingUp className="h-4 w-4" />
                                </>
                            )}
                        </div>
                    </CardFooter>
                </Card>

                {/* Common Words in Emoji Names - Chart */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Common Words in Emoji Names</CardTitle>
                        <CardDescription>Most frequently used words in emoji names</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                count: { label: "Occurrences" },
                                ...chartData.commonWords.reduce((acc: Record<string, any>, item: any, index: number) => {
                                    acc[item.word] = {
                                        label: item.word,
                                        color: `hsl(var(--chart-${(index % 8) + 1}))`
                                    }
                                    return acc
                                }, {})
                            }}
                            className="h-[300px] w-full"
                        >
                            <BarChart
                                accessibilityLayer
                                data={chartData.commonWords.slice(0, 10)}
                                layout="vertical"
                                margin={{ left: 0, right: 16 }}
                            >
                                <CartesianGrid horizontal={false} />
                                <YAxis
                                    dataKey="word"
                                    type="category"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    width={80}
                                />
                                <XAxis dataKey="count" type="number" hide />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent />}
                                />
                                <Bar
                                    dataKey="count"
                                    layout="vertical"
                                    radius={4}
                                >
                                    {chartData.commonWords.slice(0, 10).map((entry: any, index: number) => (
                                        <cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 8) + 1}))`} />
                                    ))}
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
                </Card>
            </div>
        </div>
    )
})

ContentTab.displayName = "ContentTab"
