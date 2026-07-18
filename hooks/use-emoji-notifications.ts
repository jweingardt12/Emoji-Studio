import { useEffect, useRef, useState } from 'react';
import { useEmojiData } from '@/lib/hooks/use-emoji-data';

/** Event dispatched by the settings page when notification settings change. */
export const NOTIFICATION_SETTINGS_CHANGED_EVENT = 'notificationSettingsChanged';

export function useEmojiNotifications() {
  const { emojiData } = useEmojiData();
  const lastCheckRef = useRef<{ [key: string]: number }>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // The polling interval reads the latest data through a ref so it isn't
  // torn down and recreated on every emojiData change.
  const emojiDataRef = useRef(emojiData);
  const checkFnRef = useRef<(() => void) | null>(null);

  // Re-run the setup effect when settings change (same tab via custom event,
  // other tabs via the storage event) so toggles apply without a reload.
  const [settingsVersion, setSettingsVersion] = useState(0);
  useEffect(() => {
    const bump = () => setSettingsVersion((v) => v + 1);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'notificationSettings') bump();
    };
    window.addEventListener(NOTIFICATION_SETTINGS_CHANGED_EVENT, bump);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(NOTIFICATION_SETTINGS_CHANGED_EVENT, bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const hadData = emojiDataRef.current && emojiDataRef.current.length > 0;
    emojiDataRef.current = emojiData;
    // Run a check as soon as data first arrives (e.g. after a sync) so the
    // baseline snapshot is seeded without waiting for the next interval tick.
    if (!hadData && emojiData && emojiData.length > 0) {
      checkFnRef.current?.();
    }
  }, [emojiData]);

  useEffect(() => {
    // Check if notifications are enabled
    let notificationSettings: any;
    try {
      const settings = localStorage.getItem('notificationSettings');
      if (!settings) return;
      notificationSettings = JSON.parse(settings);
    } catch (e) {
      return;
    }

    if (!notificationSettings.enabled) return;

    // Check for notification permission
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // Function to safely access localStorage with quota handling
    const safeLocalStorageSet = (key: string, value: string) => {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          // Try to clean up old data
          try {
            // Remove old tracking data
            const keysToRemove = ['lastEmojiCheck', 'emojiData', 'emojiCacheTimestamp'];
            keysToRemove.forEach(k => {
              if (k !== key) {
                localStorage.removeItem(k);
              }
            });
            // Try again
            localStorage.setItem(key, value);
          } catch (retryError) {
          }
        } else {
        }
      }
    };

    // Function to check for new emojis
    const checkForNewEmojis = () => {
      const currentData = emojiDataRef.current;
      if (!currentData || currentData.length === 0) return;

      // Get last known emoji state - only store names and timestamps
      let lastCheck: { [name: string]: number } = {};
      try {
        const storedLastCheck = localStorage.getItem('lastEmojiCheck');
        if (storedLastCheck) {
          lastCheck = JSON.parse(storedLastCheck);
        }
      } catch (e) {
        localStorage.removeItem('lastEmojiCheck');
      }

      // Create a lightweight map of current emojis (only names and timestamps)
      const currentEmojis: { [name: string]: number } = {};
      currentData.forEach(emoji => {
        currentEmojis[emoji.name] = emoji.created || 0;
      });

      // Check if this is first run
      if (Object.keys(lastCheck).length === 0) {
        safeLocalStorageSet('lastEmojiCheck', JSON.stringify(currentEmojis));
        lastCheckRef.current = currentEmojis;
        return;
      }

      // Find new emojis
      const newEmojis: string[] = [];
      const now = Date.now() / 1000;
      const checkWindow = 86400; // 24 hours in seconds

      for (const [name, created] of Object.entries(currentEmojis)) {
        // Check if emoji is new (not in last check)
        if (!lastCheck[name]) {
          // Check if emoji was created recently
          if (created && (now - created) < checkWindow) {
            newEmojis.push(name);
          }
        }
      }

      // Show notification if new emojis found
      if (newEmojis.length > 0) {
        const title = newEmojis.length === 1
          ? `New emoji: :${newEmojis[0]}:`
          : `${newEmojis.length} new emojis added`;

        const notification = new Notification('Emoji Studio', {
          body: title + '\nClick to view in Explorer',
          icon: '/logo-192.png',
          badge: '/logo-192.png',
          tag: `new-emojis-${Date.now()}`,
          requireInteraction: false
        });

        notification.onclick = () => {
          // Open explorer with date filter
          const sinceTimestamp = Math.floor(now - checkWindow);
          window.location.href = `/explorer?since=${sinceTimestamp}`;
          notification.close();
        };

        // Update last check with lightweight data
        safeLocalStorageSet('lastEmojiCheck', JSON.stringify(currentEmojis));
        lastCheckRef.current = currentEmojis;
      }
    };

    checkFnRef.current = checkForNewEmojis;

    // Check immediately on mount
    checkForNewEmojis();

    // Set up interval based on frequency setting
    const frequency = notificationSettings.frequency || 'hourly';
    let intervalMs: number;
    let dailyTimeout: NodeJS.Timeout | null = null;

    switch (frequency) {
      case 'realtime':
        intervalMs = 15 * 60 * 1000; // 15 minutes
        break;
      case 'hourly':
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'daily':
        // For daily, calculate time until preferred time
        if (notificationSettings.time) {
          const now = new Date();
          const [hours, minutes] = notificationSettings.time.split(':').map(Number);
          const targetTime = new Date();
          targetTime.setHours(hours, minutes, 0, 0);

          // If target time has passed today, set for tomorrow
          if (targetTime <= now) {
            targetTime.setDate(targetTime.getDate() + 1);
          }

          // Set initial timeout to reach target time, then repeat daily
          const msUntilTarget = targetTime.getTime() - now.getTime();
          dailyTimeout = setTimeout(() => {
            checkForNewEmojis();
            // Then check every 24 hours
            intervalRef.current = setInterval(checkForNewEmojis, 24 * 60 * 60 * 1000);
          }, msUntilTarget);

          // Exit early since we set up custom timing
          return () => {
            if (dailyTimeout) clearTimeout(dailyTimeout);
            if (intervalRef.current) clearInterval(intervalRef.current);
            checkFnRef.current = null;
          };
        } else {
          intervalMs = 24 * 60 * 60 * 1000; // Default to 24 hours if no time specified
        }
        break;
      default:
        intervalMs = 60 * 60 * 1000; // Default to hourly
        break;
    }

    // For testing, you can use a shorter interval
    if (process.env.NODE_ENV === 'development') {
      intervalMs = 60 * 1000; // Check every minute in development
    }

    intervalRef.current = setInterval(checkForNewEmojis, intervalMs);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      checkFnRef.current = null;
    };
  }, [settingsVersion]);
}
