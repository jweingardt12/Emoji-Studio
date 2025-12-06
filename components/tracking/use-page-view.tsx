"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useOpenPanel } from "@openpanel/nextjs";

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
  const op = useOpenPanel();

  useEffect(() => {
    // Only track on the client side
    if (typeof window === "undefined") return;

    // Get the page name from the pathname
    const pageName = pathname.split("/").pop() || "home";

    // Get workspace from localStorage for consistent tracking
    const workspace = localStorage.getItem("workspace") || "unknown";

    // Track the page view
    op.screenView(pageName, {
      path: pathname,
      url: window.location.href,
      referrer: document.referrer,
      workspace,
      ...options?.properties,
    });
  }, [pathname, searchParams, options?.properties, op]);

  return null;
}
