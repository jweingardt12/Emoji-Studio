"use client";

import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";
import { useRef, useState } from "react";
import { useSpring, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedAreaChartProps {
  data: Array<{ value: number; label?: string }>;
  height?: number;
  className?: string;
  color?: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  gradientId?: string;
}

export function AnimatedAreaChart({ 
  data, 
  height = 60,
  className,
  color = "var(--primary)",
  showGrid = false,
  showXAxis = false,
  gradientId = "animated-gradient"
}: AnimatedAreaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [axis, setAxis] = useState(0);

  // Motion values for smooth animations
  const springX = useSpring(0, {
    damping: 30,
    stiffness: 100,
  });
  const springY = useSpring(0, {
    damping: 30,
    stiffness: 100,
  });

  useMotionValueEvent(springX, "change", (latest) => {
    setAxis(latest);
  });

  return (
    <div ref={chartRef} className={cn("w-full relative", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          onMouseMove={(state: any) => {
            const x = state.activeCoordinate?.x;
            const dataValue = state.activePayload?.[0]?.value;
            if (x && dataValue !== undefined) {
              springX.set(x);
              springY.set(dataValue);
            }
          }}
          onMouseLeave={() => {
            springX.set(chartRef.current?.getBoundingClientRect().width || 0);
            springY.jump(data[data.length - 1].value);
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <clipPath id={`clip-${gradientId}`}>
              <rect 
                x="0" 
                y="0" 
                width={axis || "100%"} 
                height="100%" 
              />
            </clipPath>
          </defs>
          
          {showGrid && (
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
              strokeOpacity={0.3}
            />
          )}
          
          {showXAxis && (
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={false}
            />
          )}
          
          {/* Background area (ghost) */}
          <Area
            dataKey="value"
            type="monotone"
            fill={`url(#${gradientId})`}
            fillOpacity={0.1}
            stroke={color}
            strokeWidth={1}
            strokeOpacity={0.2}
          />
          
          {/* Animated clipped area */}
          <Area
            dataKey="value"
            type="monotone"
            fill={`url(#${gradientId})`}
            fillOpacity={0.4}
            stroke={color}
            strokeWidth={1.5}
            clipPath={`url(#clip-${gradientId})`}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          
          {/* Vertical indicator line */}
          {axis > 0 && (
            <line
              x1={axis}
              y1={0}
              x2={axis}
              y2="100%"
              stroke={color}
              strokeDasharray="3 3"
              strokeLinecap="round"
              strokeOpacity={0.3}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}