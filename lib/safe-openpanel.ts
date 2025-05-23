/**
 * Complete dummy implementation of OpenPanel to prevent 'process is not defined' errors
 */

// Create a complete dummy implementation of the OpenPanel API
export function useOpenPanel() {
  // Create a no-op function that can be used for any method
  const noop = (...args: any[]) => {
    // In development, log that a method was called but disabled
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log('[OpenPanel Disabled] Method called with:', args);
    }
    // Return an empty object for chaining
    return {};
  };

  // Create specific implementations for commonly used methods
  const dummyTrack = (eventName: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log('[OpenPanel Disabled] Would track:', eventName, properties);
    }
  };

  const dummyIdentify = (user: { profileId: string; [key: string]: any }) => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log('[OpenPanel Disabled] Would identify user:', user.profileId);
    }
  };

  const dummyScreenView = (name: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      console.log('[OpenPanel Disabled] Would track screen view:', name, properties);
    }
  };

  // Return a comprehensive dummy implementation
  return {
    // Common methods
    track: dummyTrack,
    identify: dummyIdentify,
    screenView: dummyScreenView,
    // Handle any other method calls with the noop function
    group: noop,
    reset: noop,
    alias: noop,
    page: noop,
    // Use a Proxy to handle any unexpected method calls
    __proto__: new Proxy({}, {
      get: (target, prop) => {
        if (typeof prop === 'string' && !(prop in target)) {
          return noop;
        }
        return (target as any)[prop];
      }
    })
  };
}
