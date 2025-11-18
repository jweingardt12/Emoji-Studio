import React, { memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts"
import { Users, Activity } from "lucide-react"

interface CreatorsTabProps {
    chartData: any
}

export const CreatorsTab = memo(({ chartData }: CreatorsTabProps) => {
    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Creators & Community
                </h2>
                <p className="text-muted-foreground mb-4">Who creates emojis?</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* Top Creators Over Time - Stacked Area Chart */}
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Top Creators Contributions Over Time</CardTitle>
                        <CardDescription>Cumulative emoji creation by top 5 contributors</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                ...chartData.topCreatorNames.reduce((acc: Record<string, any>, name: string, index: number) => {
                                    const COLORS = ['#FF4560', '#00E396', '#FEB019', '#008FFB', '#775DD0', '#2E93FA', '#F9A3A4', '#26C6DA', '#64C2A6', '#AECB4F', '#EE6868', '#A86CE4'];
                                    acc[name] = {
                                        label: name,
                                        color: COLORS[index % COLORS.length],
                                    };
                                    return acc;
                                }, {}),
                            }}
                            className="h-[300px] w-full"
                        >
                            <AreaChart
                                data={chartData.creatorTimeline}
                                margin={{ left: 12, right: 12, top: 12 }}
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
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend />
                                {chartData.topCreatorNames.map((name: string, index: number) => {
                                    const COLORS = ['#FF4560', '#00E396', '#FEB019', '#008FFB', '#775DD0', '#2E93FA', '#F9A3A4', '#26C6DA', '#64C2A6', '#AECB4F', '#EE6868', '#A86CE4'];
                                    return (
                                        <Area
                                            key={name}
                                            type="monotone"
                                            dataKey={name}
                                            stackId="1"
                                            stroke={COLORS[index % COLORS.length]}
                                            fill={COLORS[index % COLORS.length]}
                                            fillOpacity={0.6}
                                        />
                                    )
                                })}
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            Tracking {chartData.topCreatorNames.length} top creators
                            <Activity className="h-4 w-4" />
                        </div>
                    </CardFooter>
                </Card>

                {/* New vs Returning Creators */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>New vs Returning Creators</CardTitle>
                        <CardDescription>Creator retention and community growth</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                newCreators: { label: "New Creators", color: "#00E396" },
                                returningCreators: { label: "Returning Creators", color: "#008FFB" },
                            }}
                            className="h-[300px] w-full"
                        >
                            <BarChart
                                data={chartData.newVsReturningCreators || []}
                                margin={{ left: 12, right: 12, top: 12 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    minTickGap={32}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend />
                                <Bar
                                    dataKey="newCreators"
                                    stackId="creators"
                                    fill="#00E396"
                                    radius={[0, 0, 0, 0]}
                                />
                                <Bar
                                    dataKey="returningCreators"
                                    stackId="creators"
                                    fill="#008FFB"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            {chartData.newVsReturningCreators && chartData.newVsReturningCreators.length > 0 && (
                                <>
                                    Latest: {chartData.newVsReturningCreators[chartData.newVsReturningCreators.length - 1]?.newCreators || 0} new, {chartData.newVsReturningCreators[chartData.newVsReturningCreators.length - 1]?.returningCreators || 0} returning
                                    <Users className="h-4 w-4" />
                                </>
                            )}
                        </div>
                    </CardFooter>
                </Card>

                {/* Creator Productivity Distribution */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Creator Productivity Distribution</CardTitle>
                        <CardDescription>Number of creators by emoji count</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer
                            config={{
                                count: { label: "Creators", color: "#775DD0" },
                            }}
                            className="h-[300px] w-full"
                        >
                            <BarChart
                                data={chartData.creatorProductivity || []}
                                margin={{ left: 12, right: 12, top: 12 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="range"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    label={{ value: 'Emojis Created', position: 'insideBottom', offset: -5 }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    label={{ value: 'Number of Creators', angle: -90, position: 'insideLeft' }}
                                />
                                <ChartTooltip
                                    content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <ChartTooltipContent>
                                                    <div className="font-semibold">{payload[0].payload.range} emojis</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {payload[0].value} creators
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Avg: {payload[0].payload.avgCount} emojis
                                                    </div>
                                                </ChartTooltipContent>
                                            )
                                        }
                                        return null
                                    }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#775DD0"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm">
                        <div className="flex gap-2 font-medium leading-none">
                            Total creators: {chartData.creatorProductivity?.reduce((sum: number, item: any) => sum + item.count, 0) || 0}
                            <Activity className="h-4 w-4" />
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
})

CreatorsTab.displayName = "CreatorsTab"
