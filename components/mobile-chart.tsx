"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileChartProps {
  data: any[];
  title?: string;
  description?: string;
  className?: string;
  onDataPointClick?: (data: any) => void;
  height?: number;
}

export function MobileChart({
  data,
  title,
  description,
  className,
  onDataPointClick,
  height = 280,
}: MobileChartProps) {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [panOffset, setPanOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, offset: 0 });
  const [touchDistance, setTouchDistance] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Handle touch gestures for pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchDistance(distance);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX,
        offset: panOffset,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance > 0) {
      const newDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = newDistance / touchDistance;
      setZoomLevel((prev) => Math.max(0.5, Math.min(3, prev * scale)));
      setTouchDistance(newDistance);
    } else if (e.touches.length === 1 && isDragging) {
      const deltaX = e.touches[0].clientX - dragStart.x;
      setPanOffset(dragStart.offset + deltaX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setTouchDistance(0);
  };

  // Mouse events for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      offset: panOffset,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      setPanOffset(dragStart.offset + deltaX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(3, prev + 0.25));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.5, prev - 0.25));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset(0);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && chartRef.current) {
      if (chartRef.current.requestFullscreen) {
        chartRef.current.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Visible data based on zoom and pan
  const visibleData = React.useMemo(() => {
    if (zoomLevel === 1 && panOffset === 0) return data;
    
    const totalWidth = data.length;
    const visibleWidth = Math.floor(totalWidth / zoomLevel);
    const startIndex = Math.max(0, Math.floor(-panOffset / (100 / zoomLevel)));
    const endIndex = Math.min(data.length, startIndex + visibleWidth);
    
    return data.slice(startIndex, endIndex);
  }, [data, zoomLevel, panOffset]);

  const chartConfig = {
    created: { label: "Created", color: "hsl(var(--chart-1))" },
    uniqueContributors: { label: "Contributors", color: "hsl(var(--chart-2))" },
  };

  return (
    <Card 
      ref={chartRef}
      className={cn(
        "relative touch-none select-none",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}

      <CardContent className="relative p-2">
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
            <span className="sr-only">Zoom out</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
          >
            <ZoomIn className="h-4 w-4" />
            <span className="sr-only">Zoom in</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="sr-only">Reset zoom</span>
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="h-4 w-4" />
            <span className="sr-only">Toggle fullscreen</span>
          </Button>
        </div>

        {/* Zoom Level Indicator */}
        {zoomLevel !== 1 && (
          <div className="absolute top-2 left-2 z-10 rounded bg-background/80 px-2 py-1 text-xs font-medium">
            {Math.round(zoomLevel * 100)}%
          </div>
        )}

        {/* Chart Container */}
        <div
          className="relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          <ChartContainer
            config={chartConfig}
            className={cn(
              "w-full transition-transform",
              `h-[${height}px]`
            )}
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center",
            }}
          >
            <AreaChart
              data={visibleData}
              onClick={onDataPointClick}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                angle={-35}
                height={40}
              />
              
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                width={30}
              />
              
              <ChartTooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg bg-background p-2 text-xs shadow-lg">
                      <div className="font-medium">{payload[0].payload.date}</div>
                      {payload.map((p: any) => (
                        <div key={p.dataKey} className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>
                            {p.name}: <b>{p.value}</b>
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              
              <defs>
                <linearGradient id="createdGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-created)" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="var(--color-created)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="contributorsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF00B8" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#FF00B8" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              
              <Area
                type="monotone"
                dataKey="created"
                name="Created"
                stroke="var(--color-created)"
                strokeWidth={2}
                fill="url(#createdGradient)"
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="uniqueContributors"
                name="Contributors"
                stroke="#FF00B8"
                strokeWidth={2}
                fill="url(#contributorsGradient)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* Instructions */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          <span className="inline-block sm:hidden">
            Pinch to zoom • Drag to pan • Tap for details
          </span>
          <span className="hidden sm:inline-block">
            Use controls to zoom • Click and drag to pan
          </span>
        </div>
      </CardContent>
    </Card>
  );
}