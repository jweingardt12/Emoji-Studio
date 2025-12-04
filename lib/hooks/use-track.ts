import { useCallback } from 'react';
import { useOpenPanel } from '@openpanel/nextjs';

/**
 * Hook that wraps OpenPanel's track() to automatically include workspace
 * in all analytics events.
 *
 * Reads workspace from localStorage to work in any component context.
 */
export function useTrack() {
  const openpanel = useOpenPanel();

  return useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      const workspace =
        (typeof window !== 'undefined' ? localStorage.getItem('workspace') : null) ||
        'unknown';

      openpanel.track(event, {
        ...properties,
        workspace,
      });
    },
    [openpanel]
  );
}
