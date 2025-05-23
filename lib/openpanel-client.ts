/**
 * OpenPanel client for tracking user actions
 * This file provides a wrapper around the OpenPanel script tag implementation
 */

// Define the OpenPanel window object type
interface OpenPanelClient {
  track: (eventName: string, properties?: Record<string, any>) => void;
  identify: (user: { profileId: string; [key: string]: any }) => void;
  screenView: (name: string, properties?: Record<string, any>) => void;
  [key: string]: any;
}

declare global {
  interface Window {
    op?: OpenPanelClient;
  }
}

/**
 * Get the OpenPanel client instance
 * This safely accesses the global OpenPanel instance added via script tag
 */
export function getOpenPanel() {
  if (typeof window !== 'undefined' && window.op) {
    return window.op;
  }
  
  // Return a dummy implementation if OpenPanel is not available
  return {
    track: (eventName: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[OpenPanel Not Loaded] Would track:', eventName, properties);
      }
    },
    identify: (user: { profileId: string; [key: string]: any }) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[OpenPanel Not Loaded] Would identify user:', user.profileId);
      }
    },
    screenView: (name: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[OpenPanel Not Loaded] Would track screen view:', name, properties);
      }
    },
  };
}

/**
 * Hook to use OpenPanel in React components
 */
export function useOpenPanel() {
  return getOpenPanel();
}

/**
 * Track a user action
 * @param eventName The name of the event to track
 * @param properties Additional properties to include with the event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  const op = getOpenPanel();
  op.track(eventName, properties);
}

/**
 * Track a page view
 * @param pageName The name of the page being viewed
 * @param properties Additional properties to include with the event
 */
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  const op = getOpenPanel();
  op.screenView(pageName, properties);
}

/**
 * Identify a user
 * @param userId The unique identifier for the user
 * @param traits Additional user traits to track
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  const op = getOpenPanel();
  op.identify({ profileId: userId, ...traits });
}
