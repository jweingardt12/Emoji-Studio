"use client";

import { useEmojiNotifications } from '@/hooks/use-emoji-notifications';

export function NotificationManager() {
  // This hook handles all notification logic
  useEmojiNotifications();
  
  // This component doesn't render anything, it just manages notifications
  return null;
}