/**
 * @deprecated This file is deprecated and should not be used.
 *
 * IMPORTANT: This file uses window.openpanel which does NOT exist when using
 * the @openpanel/nextjs package (React context-based). All functions here
 * silently fail in production!
 *
 * Use these alternatives instead:
 * - For React components: import { useTrack } from "@/lib/hooks/use-track"
 * - For analytics with typed events: import { useAnalytics } from "@/lib/analytics"
 * - Direct access: import { useOpenPanel } from "@openpanel/nextjs"
 *
 * This file is kept for backwards compatibility but will be removed in a future update.
 */

// The OpenPanel types are already declared in @openpanel/web
// We'll use those instead of declaring our own

/**
 * @deprecated Use useOpenPanel from @openpanel/nextjs instead
 * Get the OpenPanel client instance
 * This safely accesses the global OpenPanel instance added via script tag
 */
export function getOpenPanel() {
  if (typeof window !== 'undefined' && window.openpanel) {
    return window.openpanel;
  }

  // Return a dummy implementation if OpenPanel is not available
  // WARNING: This means tracking silently fails when using @openpanel/nextjs
  return {
    track: (eventName: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[OpenPanel] DEPRECATED: Using openpanel-client.ts which does not work with @openpanel/nextjs. Use useTrack() hook instead.');
        console.log('[OpenPanel Not Loaded] Would track:', eventName, properties);
      }
    },
    identify: (user: { profileId: string; [key: string]: any }) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[OpenPanel] DEPRECATED: Using openpanel-client.ts which does not work with @openpanel/nextjs. Use useOpenPanel() from @openpanel/nextjs instead.');
        console.log('[OpenPanel Not Loaded] Would identify user:', user.profileId);
      }
    },
    screenView: (name: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('[OpenPanel] DEPRECATED: Using openpanel-client.ts which does not work with @openpanel/nextjs. Use useOpenPanel() from @openpanel/nextjs instead.');
        console.log('[OpenPanel Not Loaded] Would track screen view:', name, properties);
      }
    },
  };
}

/**
 * @deprecated Use useOpenPanel from @openpanel/nextjs instead
 * Hook to use OpenPanel in React components
 */
export function useOpenPanel() {
  return getOpenPanel();
}

/**
 * @deprecated Use useTrack from @/lib/hooks/use-track instead
 * Track a user action
 * @param eventName The name of the event to track
 * @param properties Additional properties to include with the event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  const op = getOpenPanel();
  op.track(eventName, properties);
}

/**
 * @deprecated Use useOpenPanel from @openpanel/nextjs and call screenView() instead
 * Track a page view
 * @param pageName The name of the page being viewed
 * @param properties Additional properties to include with the event
 */
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  const op = getOpenPanel();
  op.screenView(pageName, properties);
}

/**
 * @deprecated Use useOpenPanel from @openpanel/nextjs and call identify() instead
 * Identify a user
 * @param userId The unique identifier for the user
 * @param traits Additional user traits to track
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  const op = getOpenPanel();
  if ('identify' in op && typeof op.identify === 'function') {
    op.identify({ profileId: userId, ...traits });
  }
}
