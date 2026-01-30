import { useCallback } from 'react';
import { useOpenPanel } from '@openpanel/nextjs';

/**
 * Get workspace for tracking with better fallback logic.
 */
export function getWorkspaceForTracking(): string {
  if (typeof window === "undefined") return "unknown";

  // Try localStorage first
  const workspace = localStorage.getItem("workspace");
  if (workspace && workspace !== "unknown") return workspace;

  // Check if we're in demo mode
  const isDemo = localStorage.getItem("useDemoData") === "true";
  if (isDemo) return "demo-workspace";

  return "not-connected";
}

/**
 * Hook that wraps OpenPanel's track() to automatically include workspace,
 * user_id, is_pwa, and platform in all analytics events.
 *
 * Reads workspace from localStorage to work in any component context.
 */
export function useTrack() {
  const openpanel = useOpenPanel();

  return useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      const workspace = getWorkspaceForTracking();
      const userId = typeof window !== 'undefined' ? localStorage.getItem('mobileUserId') : null;

      // Detect PWA mode
      const isPWA = typeof window !== 'undefined' &&
        window.matchMedia('(display-mode: standalone)').matches;

      // Detect platform
      const platform = typeof navigator !== 'undefined' &&
        /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

      openpanel.track(event, {
        ...properties,
        workspace,
        user_id: userId || undefined,
        is_pwa: isPWA,
        platform,
      });
    },
    [openpanel]
  );
}
