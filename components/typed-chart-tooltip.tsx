import React from 'react';
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: any[];
  label?: string;
};

interface TypedChartTooltipProps {
  cursor?: boolean | object;
  content: (props: ChartTooltipContentProps) => React.ReactNode;
  offset?: number;
}

export function TypedChartTooltip({ content, ...props }: TypedChartTooltipProps) {
  // This wrapper component properly types the content function
  return <ChartTooltip content={content} {...props} />;
}

export { ChartTooltipContent };
export type { ChartTooltipContentProps };
