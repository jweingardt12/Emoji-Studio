"use client"

import { useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bell, Clock } from "lucide-react"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { openpanel } from "@/lib/safe-openpanel"
import { toast } from "sonner"

interface NotificationsSectionProps {
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void
  notificationFrequency: string
  setNotificationFrequency: (frequency: string) => void
  notificationTime: string
  setNotificationTime: (time: string) => void
  permissionStatus: 'granted' | 'denied' | 'default' | null
  setPermissionStatus: (status: 'granted' | 'denied' | 'default' | null) => void
  hasExtension: boolean
  hasSlack: boolean
  hasUserInteractedRef: React.MutableRefObject<boolean>
}

export function NotificationsSection({
  notificationsEnabled,
  setNotificationsEnabled,
  notificationFrequency,
  setNotificationFrequency,
  notificationTime,
  setNotificationTime,
  permissionStatus,
  setPermissionStatus,
  hasExtension,
  hasSlack,
  hasUserInteractedRef,
}: NotificationsSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure when and how you receive emoji notifications
        </p>
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="mb-2">
            <h3 className="font-semibold">New Emoji Notifications</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get alerts when new emojis are added to your workspace. Requires the Chrome extension for background checks.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications-enabled">Enable Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive browser notifications about new emojis
              </p>
            </div>
            <Switch
              id="notifications-enabled"
              checked={notificationsEnabled}
              onCheckedChange={async (checked) => {
                openpanel.track('Settings: Notification Toggle', { enabled: checked });

                if (checked && permissionStatus !== 'granted') {
                  if ('Notification' in window) {
                    const permission = await Notification.requestPermission();
                    setPermissionStatus(permission);
                    openpanel.track('Settings: Notification Permission Request', { result: permission });

                    if (permission !== 'granted') {
                      toast.error('Notification permission denied. Please enable notifications in your browser settings.');
                      return;
                    }
                  }
                }
                hasUserInteractedRef.current = true;
                setNotificationsEnabled(checked);
              }}
            />
          </div>

          {notificationsEnabled && (
            <>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs space-y-1">
                <p className="font-medium text-primary">How it works:</p>
                <ul className="space-y-0.5 text-muted-foreground ml-4 list-disc">
                  <li>Chrome extension checks for new emojis in the background</li>
                  <li>Works even when Emoji Studio tabs are closed</li>
                  <li>You'll get desktop notifications when new emojis are found</li>
                  <li>Click notifications to view new emojis in Explorer</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notification-frequency">Check Frequency</Label>
                <Select value={notificationFrequency} onValueChange={(value) => {
                  hasUserInteractedRef.current = true;
                  setNotificationFrequency(value);
                }}>
                  <SelectTrigger id="notification-frequency" className="w-full sm:w-1/2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Every 15 minutes</SelectItem>
                    <SelectItem value="hourly">Every hour</SelectItem>
                    <SelectItem value="daily">Once per day</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How often to check for new emojis while the tab is open
                </p>
              </div>

              {notificationFrequency === 'daily' && (
                <div className="space-y-2">
                  <Label htmlFor="notification-time" className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Daily Check Time
                  </Label>
                  <Input
                    id="notification-time"
                    type="time"
                    value={notificationTime}
                    onChange={(e) => {
                      hasUserInteractedRef.current = true;
                      setNotificationTime(e.target.value);
                    }}
                    className="w-full sm:w-1/2"
                  />
                  <p className="text-xs text-muted-foreground">
                    What time to check for new emojis each day (your local time)
                  </p>
                </div>
              )}
            </>
          )}

          {!hasExtension && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Chrome extension required:</strong> Install the Emoji Studio extension to receive background notifications.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                asChild
              >
                <a
                  href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ChromeIcon className="h-3 w-3" />
                  Install Extension
                </a>
              </Button>
            </div>
          )}

          {!hasSlack && hasExtension && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                Connect your Slack workspace to start receiving notifications about new emojis.
              </p>
            </div>
          )}

          {permissionStatus === 'denied' && (
            <div className="rounded-lg bg-destructive/10 p-3">
              <p className="text-xs text-destructive">
                Notification permissions are blocked. Please enable notifications in your browser settings to use this feature.
              </p>
            </div>
          )}

          {notificationsEnabled && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  console.log('[Sample Notification] Button clicked');
                  openpanel.track('Settings: Sample Notification Clicked');

                  if (!('Notification' in window)) {
                    toast.error('Notifications are not supported in this browser');
                    openpanel.track('Settings: Sample Notification Failed', { reason: 'not_supported' });
                    return;
                  }

                  if (Notification.permission !== 'granted') {
                    toast.error('Please enable notifications first');
                    openpanel.track('Settings: Sample Notification Failed', { reason: 'permission_denied' });
                    return;
                  }

                  try {
                    // Simulate finding new emojis
                    const sampleEmojis = ['party-parrot', 'celebrate', 'awesome', 'ship-it', 'rocket'];
                    const randomCount = Math.floor(Math.random() * 3) + 1;
                    const selectedEmojis = sampleEmojis.slice(0, randomCount);

                    const title = randomCount === 1
                      ? `New emoji: :${selectedEmojis[0]}:`
                      : `${randomCount} new emojis added`;

                    const notification = new Notification('Emoji Studio', {
                      body: title + '\nClick to view in Explorer',
                      icon: '/logo-192.png',
                      badge: '/logo-192.png',
                      tag: `new-emojis-sample-${Date.now()}`,
                      requireInteraction: false
                    });

                    notification.onclick = () => {
                      openpanel.track('Settings: Sample Notification Clicked Through');
                      // Navigate to explorer with a sample date filter
                      const sinceTimestamp = Math.floor(Date.now() / 1000 - 86400); // 24 hours ago
                      window.location.href = `/explorer?since=${sinceTimestamp}`;
                      notification.close();
                    };

                    toast.success('Sample notification sent! This is what you\'ll see when new emojis are found.');
                    console.log('[Sample Notification] Created successfully');
                    openpanel.track('Settings: Sample Notification Sent', { emojiCount: randomCount });
                  } catch (error) {
                    console.error('[Sample Notification] Failed:', error);
                    toast.error('Failed to send sample notification');
                    openpanel.track('Settings: Sample Notification Error', { error: String(error) });
                  }
                }}
              >
                <Bell className="h-4 w-4 mr-2" />
                Try Sample Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
