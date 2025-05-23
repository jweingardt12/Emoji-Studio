"use client"

import React from "react"
import { InfoIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InfoTooltipProps {
  label: React.ReactNode
  children: React.ReactNode
}

export function InfoTooltip({ label, children }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-2 cursor-help">
          {label}
          <InfoIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" className="max-w-xs sm:max-w-sm">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
