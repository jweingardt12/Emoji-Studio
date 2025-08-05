import { useEffect, useRef } from 'react';
import { useEmojiData } from '@/lib/hooks/use-emoji-data';

export function useEmojiNotifications() {
  const { emojiData } = useEmojiData();
  const lastCheckRef = useRef<{ [key: string]: any }>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if notifications are enabled
    const settings = localStorage.getItem('notificationSettings');
    if (!settings) return;

    const notificationSettings = JSON.parse(settings);
    if (!notificationSettings.enabled) return;

    // Check for notification permission
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('[Notifications] Not available or not granted');
      return;
    }

    // Function to check for new emojis
    const checkForNewEmojis = () => {
      if (!emojiData || emojiData.length === 0) return;

      // Get last known emoji state
      const storedLastCheck = localStorage.getItem('lastEmojiCheck');
      const lastCheck = storedLastCheck ? JSON.parse(storedLastCheck) : {};
      
      // Create a map of current emojis
      const currentEmojis: { [name: string]: any } = {};
      emojiData.forEach(emoji => {
        currentEmojis[emoji.name] = emoji;
      });

      // Check if this is first run
      if (Object.keys(lastCheck).length === 0) {
        console.log('[Notifications] First run, storing initial state');
        localStorage.setItem('lastEmojiCheck', JSON.stringify(currentEmojis));
        lastCheckRef.current = currentEmojis;
        return;
      }

      // Find new emojis
      const newEmojis: string[] = [];
      const now = Date.now() / 1000;
      const checkWindow = 86400; // 24 hours in seconds

      for (const [name, emoji] of Object.entries(currentEmojis)) {
        // Check if emoji is new (not in last check)
        if (!lastCheck[name]) {
          // Check if emoji was created recently
          if (emoji.created && (now - emoji.created) < checkWindow) {
            newEmojis.push(name);
          }
        }
      }

      // Show notification if new emojis found
      if (newEmojis.length > 0) {
        console.log(`[Notifications] Found ${newEmojis.length} new emojis:`, newEmojis);
        
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

        // Update last check
        localStorage.setItem('lastEmojiCheck', JSON.stringify(currentEmojis));
        lastCheckRef.current = currentEmojis;
      }
    };

    // Check immediately on mount
    checkForNewEmojis();

    // Set up interval based on frequency setting
    const frequency = notificationSettings.frequency || 'hourly';
    let intervalMs: number;
    
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
          setTimeout(() => {
            checkForNewEmojis();
            // Then check every 24 hours
            intervalRef.current = setInterval(checkForNewEmojis, 24 * 60 * 60 * 1000);
          }, msUntilTarget);
          
          console.log(`[Notifications] Will check daily at ${notificationSettings.time}`);
          return; // Exit early since we set up custom timing
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
    console.log(`[Notifications] Checking for new emojis every ${intervalMs}ms`);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [emojiData]);
}