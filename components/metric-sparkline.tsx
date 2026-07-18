"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, LabelList } from "recharts";

interface MetricSparklineProps {
  data: Record<string, unknown>[];
  dataKey: string;
  label: string;
  colorVar: string;
  showLabels?: boolean;
}

/**
 * Small monthly trend line used inside the dashboard metric info drawers.
 * Kept in its own module (loaded via next/dynamic) so recharts stays out of
 * the dashboard's initial chunk — the chart is only visible once a drawer
 * is opened.
 */
export default function MetricSparkline({ data, dataKey, label, colorVar, showLabels }: MetricSparklineProps) {
  return (
    <ChartContainer config={{ [dataKey]: { label, color: `var(${colorVar})` } }} className="w-full h-full">
      <LineChart data={data} margin={{ top: 15, left: 8, right: 8, bottom: 5 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 10 }} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Line dataKey={dataKey} type="natural" stroke={`var(${colorVar})`} strokeWidth={1.5} dot={{ fill: `var(${colorVar})`, r: 3 }} activeDot={{ r: 4 }}>
          {showLabels && <LabelList position="top" offset={8} className="fill-foreground" fontSize={10} />}
        </Line>
      </LineChart>
    </ChartContainer>
  );
}
