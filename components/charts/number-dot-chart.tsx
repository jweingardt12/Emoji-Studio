"use client";

import { CartesianGrid, Line, LineChart, XAxis, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumberDotChartProps {
  title: string;
  value: string | number;
  subtitle?: string;
  data: Array<{ value: number; label: string }>;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

const CustomizedDot = (
  props: React.SVGProps<SVGCircleElement> & { value?: number; payload?: any }
) => {
  const { cx, cy, payload } = props;
  
  return (
    <g>
      {/* Outer glow circle */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={12} 
        fill="hsl(var(--primary))" 
        opacity={0.2}
      />
      {/* Main dot */}
      <circle 
        cx={cx} 
        cy={cy} 
        r={8} 
        fill="hsl(var(--primary))"
      />
      {/* Value text */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dy={3}
        fontSize={9}
        fontWeight={700}
        fill="hsl(var(--primary-foreground))"
      >
        {payload?.value || 0}
      </text>
    </g>
  );
};

export function NumberDotChart({
  title,
  value,
  subtitle,
  data,
  change,
  trend,
  onClick,
  className,
  icon
}: NumberDotChartProps) {
  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20",
        className
      )}
    >
      {/* Content */}
      <div className="p-5 sm:p-6 pb-2">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">
              {title}
            </p>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl sm:text-4xl md:text-5xl font-bold">
                {value}
              </span>
              {change !== undefined && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "border-none",
                    trend === 'up' 
                      ? "text-green-500 bg-green-500/10" 
                      : trend === 'down' 
                      ? "text-red-500 bg-red-500/10"
                      : "text-muted-foreground bg-muted"
                  )}
                >
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  ) : null}
                  <span>{change > 0 ? '+' : ''}{change}%</span>
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                {subtitle}
              </p>
            )}
          </div>
          {icon && (
            <div className="rounded-lg bg-primary/10 p-2.5 sm:p-3">
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-20 sm:h-24 px-4 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
          >
            <CartesianGrid 
              vertical={false} 
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.2}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value: string) => value.slice(0, 3)}
            />
            <Line
              dataKey="value"
              type="linear"
              stroke="hsl(var(--primary))"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              dot={<CustomizedDot />}
              activeDot={false}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}