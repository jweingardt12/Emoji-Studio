"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/openpanel-client";

/**
 * Hook to automatically track page views
 * @param options Configuration options
 */
export function usePageView(options?: {
  /** Additional properties to include with the page view event */
  properties?: Record<string, any>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only track on the client side
    if (typeof window === "undefined") return;

    // Get the page name from the pathname
    const pageName = pathname.split("/").pop() || "home";
    
    // Track the page view
    trackPageView(pageName, {
      path: pathname,
      url: window.location.href,
      referrer: document.referrer,
      ...options?.properties,
    });
  }, [pathname, searchParams, options?.properties]);

  return null;
}
