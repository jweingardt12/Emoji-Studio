'use client';

import { Search, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
  onSearchClick?: () => void;
  onFilterClick?: () => void;
  onDateRangeClick?: () => void;
}

export function DashboardQuickActions({ 
  onSearchClick, 
  onFilterClick, 
  onDateRangeClick 
}: QuickActionsProps) {
  const router = useRouter();

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
    } else {
      // Navigate to explorer with search focus
      router.push('/explorer?focus=search');
    }
  };

  const handleFilterClick = () => {
    if (onFilterClick) {
      onFilterClick();
    } else {
      // Show filter modal or navigate
      router.push('/explorer');
    }
  };

  const handleDateRangeClick = () => {
    if (onDateRangeClick) {
      onDateRangeClick();
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
      <Button
        variant="outline"
        size="default"
        onClick={handleSearchClick}
        className="flex items-center gap-2 whitespace-nowrap min-h-[44px] px-4 hover:bg-accent/50 active:scale-95 transition-all"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search</span>
      </Button>
      
      <Button
        variant="outline"
        size="default"
        onClick={handleFilterClick}
        className="flex items-center gap-2 whitespace-nowrap min-h-[44px] px-4 hover:bg-accent/50 active:scale-95 transition-all"
      >
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filter</span>
      </Button>
      
      <Button
        variant="outline"
        size="default"
        onClick={handleDateRangeClick}
        className="flex items-center gap-2 whitespace-nowrap min-h-[44px] px-4 hover:bg-accent/50 active:scale-95 transition-all"
      >
        <Calendar className="h-4 w-4" />
        <span className="hidden sm:inline">Date Range</span>
      </Button>
    </div>
  );
}