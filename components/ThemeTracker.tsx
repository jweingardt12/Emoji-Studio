"use client";

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
// import { openpanel } from '@/lib/safe-openpanel'; // Temporarily commented out

export function ThemeTracker() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme) {
      // console.log("Current theme resolved:", resolvedTheme);
      // The openpanel.identify() calls have been removed due to type issues.
      // We are now investigating if trackAttributes={true} in OpenPanelComponent
      // automatically captures the theme class from the <html> tag.
    }
  }, [resolvedTheme]);

  return null; // This component doesn't render anything visible
}
