"use client";

import { CartesianGrid, Line, LineChart, XAxis, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlowingLineChartProps {
  title: string;
  value: string | number;
  subtitle?: string;
  data: Array<{ value: number; label?: string }>;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
  gradientId?: string;
}

export function GlowingLineChart({
  title,
  value,
  subtitle,
  data,
  change,
  changeLabel,
  trend,
  onClick,
  className,
  icon,
  gradientId = "glowing-gradient"
}: GlowingLineChartProps) {
  // Ensure we have valid data
  const chartData = data && data.length > 0 ? data : Array.from({ length: 10 }, (_, i) => ({
    value: Math.floor(Math.random() * 50) + 10,
    label: `Point ${i + 1}`
  }));

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        "bg-linear-to-br from-background/95 to-background/90 border-primary/20",
        className
      )}
    >
      {/* Chart Background */}
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#0B84CE" stopOpacity={1} />
                <stop offset="20%" stopColor="#224CD1" stopOpacity={1} />
                <stop offset="40%" stopColor="#3A11C7" stopOpacity={1} />
                <stop offset="60%" stopColor="#7107C6" stopOpacity={1} />
                <stop offset="80%" stopColor="#C900BD" stopOpacity={1} />
                <stop offset="100%" stopColor="#D80155" stopOpacity={1} />
              </linearGradient>
              <filter
                id={`${gradientId}-glow`}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid 
              vertical={false} 
              strokeDasharray="3 3"
              stroke="var(--border)"
              strokeOpacity={0.1}
            />
            <XAxis
              dataKey="label"
              hide
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke={`url(#${gradientId})`}
              dot={false}
              strokeWidth={3}
              filter={`url(#${gradientId}-glow)`}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex items-start justify-between">
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
    </Card>
  );
}