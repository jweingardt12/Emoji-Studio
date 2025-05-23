import React from 'react';
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Type for chart tooltip props
export type ChartTooltipProps = {
  active?: boolean;
  payload?: any[];
};

// Typed version of ChartTooltip to avoid TypeScript errors
export const TypedChartTooltip = (props: {
  cursor?: boolean | object;
  content: (props: ChartTooltipProps) => React.ReactNode;
}) => {
  return <ChartTooltip {...props} />;
};

export { ChartTooltipContent };
