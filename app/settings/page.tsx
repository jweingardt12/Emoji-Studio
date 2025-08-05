"use client"

import { SlackCurlInput } from "@/components/slack-curl-input"
import { ChromeExtensionOption } from "@/components/chrome-extension-option"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { Card, CardContent } from "@/components/ui/card"
import { Zap, ChevronDown, ChevronUp, Terminal, Bell, Clock, Link2, Trophy, Database } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { openpanel } from "@/lib/safe-openpanel"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { hasSlackConnection } from "@/lib/utils/slack-upload"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { cn } from "@/lib/utils"
import { ChromeExtensionHandler } from "@/components/chrome-extension-handler"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type SettingsSection = 'connection' | 'notifications' | 'preferences' | 'data';

export default function SettingsPage() {
  // Initialize active section from URL hash or default to 'connection'
  const [activeSection, setActiveSection] = useState<SettingsSection>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1) as SettingsSection;
      if (hash && ['connection', 'notifications', 'preferences', 'data'].includes(hash)) {
        return hash;
      }
    }
    return 'connection';
  });
  const [inactivityThresholdMonths, setInactivityThresholdMonths] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem("inactivityThresholdMonths")
      return storedValue ? parseInt(storedValue, 10) : 3
    }
    return 3
  })
  
  const [isManualSetupOpen, setIsManualSetupOpen] = useState(false)
  const [hasSlack, setHasSlack] = useState(false)
  
  // Notification settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationFrequency, setNotificationFrequency] = useState('daily')
  const [notificationTime, setNotificationTime] = useState('09:00')
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | null>(null)
  const [hasExtension, setHasExtension] = useState(false)

  const hasMountedRef = useRef(false);
  const previousThresholdRef = useRef(inactivityThresholdMonths);
  const hasUserInteractedRef = useRef(false);
  
  // Handle hash changes for direct linking
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as SettingsSection;
      if (hash && ['connection', 'notifications', 'preferences', 'data'].includes(hash)) {
        setActiveSection(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL hash when section changes
  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section);
    window.history.replaceState(null, '', `#${section}`);
    openpanel.track('Settings: Navigate Section', { section });
  };
  
  // Load notification settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem('notificationSettings');
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings);
          setNotificationsEnabled(settings.enabled || false);
          setNotificationFrequency(settings.frequency || 'daily');
          setNotificationTime(settings.time || '09:00');
        } catch (e) {
          console.error('Failed to parse notification settings:', e);
        }
      }
    }
  }, []);
  
  // Save notification settings when they change (only after user interaction)
  useEffect(() => {
    if (!hasUserInteractedRef.current) {
      return;
    }
    
    const settings = {
      enabled: notificationsEnabled,
      frequency: notificationFrequency,
      time: notificationTime,
      checkWindow: notificationFrequency === 'realtime' ? 900 : notificationFrequency === 'hourly' ? 3600 : 86400
    };
    
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    
    // Send settings to Chrome extension if available
    if (hasExtension && typeof window !== 'undefined') {
      window.postMessage({
        type: 'UPDATE_NOTIFICATION_SETTINGS',
        settings: settings
      }, '*');
    }
    
    toast.success('Notification settings saved!');
    openpanel.track('Settings: Update Notifications', settings);
  }, [notificationsEnabled, notificationFrequency, notificationTime, hasExtension]);
  
  // Check notification permission status
  useEffect(() => {
    const checkPermission = async () => {
      if ('Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
    };
    checkPermission();
  }, [notificationsEnabled]);
  
  // Check for Slack connection and extension
  useEffect(() => {
    setHasSlack(hasSlackConnection())
    
    // Check if we've already detected the extension in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('emojiStudioExtensionDetected') === 'true') {
      console.log('[Settings] Extension previously detected in session')
      setHasExtension(true)
      return
    }
    
    // Check if extension is installed
    const checkExtension = () => {
      console.log('[Settings] Checking for extension...')
      
      // Method 1: Check window property
      if (typeof window !== 'undefined' && (window as any).__EMOJI_STUDIO_EXTENSION__) {
        console.log('[Settings] Extension detected via window.__EMOJI_STUDIO_EXTENSION__')
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
        return true
      }
      
      // Method 2: Check if chrome.runtime is available (for injected scripts)
      if (typeof window !== 'undefined' && typeof (window as any).chrome !== 'undefined' && (window as any).chrome?.runtime?.id) {
        console.log('[Settings] Extension detected via chrome.runtime.id:', (window as any).chrome.runtime.id)
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
        return true
      }
      
      console.log('[Settings] Extension not detected')
      return false
    }
    
    // Check immediately
    checkExtension()
    
    // Check multiple times with delays
    const timeouts = [100, 500, 1000].map(delay => 
      setTimeout(() => {
        console.log(`[Settings] Rechecking for extension after ${delay}ms`)
        checkExtension()
      }, delay)
    )
    
    // Listen for extension installed event
    const handleExtensionInstalled = (event: any) => {
      console.log('[Settings] Extension detected via event:', event.detail)
      sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
      setHasExtension(true)
    }
    
    // Also listen for postMessage
    const handleMessage = (event: MessageEvent) => {
      console.log('[Settings] Received postMessage:', event.data?.type)
      if (event.data?.type === 'EMOJI_STUDIO_EXTENSION_INSTALLED') {
        console.log('[Settings] Extension detected via postMessage:', event.data.version)
        sessionStorage.setItem('emojiStudioExtensionDetected', 'true')
        setHasExtension(true)
      }
    }
    
    const handleEmojiDataUpdate = () => {
      setHasSlack(hasSlackConnection())
      checkExtension()
    }
    
    window.addEventListener('emoji-studio-extension-installed', handleExtensionInstalled)
    window.addEventListener('message', handleMessage)
    window.addEventListener('emojiDataUpdated', handleEmojiDataUpdate)
    
    return () => {
      timeouts.forEach(clearTimeout)
      window.removeEventListener('emoji-studio-extension-installed', handleExtensionInstalled)
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('emojiDataUpdated', handleEmojiDataUpdate)
    }
  }, [])
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[SettingsPage] Ensuring extension listener is active');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("inactivityThresholdMonths", inactivityThresholdMonths.toString());

      if (hasMountedRef.current) {
        if (previousThresholdRef.current !== inactivityThresholdMonths) {
          toast.success("Inactive user threshold saved!");
          openpanel.track("Settings: Change Inactivity Threshold", { months: inactivityThresholdMonths });
        }
      } else {
        hasMountedRef.current = true;
      }
      previousThresholdRef.current = inactivityThresholdMonths;
    }
  }, [inactivityThresholdMonths]);

  const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    if (!isNaN(value) && value >= 0) {
      setInactivityThresholdMonths(value)
    }
  }

  const sections = [
    {
      id: 'connection' as const,
      label: 'Connection',
      icon: Link2,
      description: 'Connect your Slack workspace'
    },
    {
      id: 'notifications' as const,
      label: 'Notifications',
      icon: Bell,
      description: 'Manage notification preferences'
    },
    {
      id: 'preferences' as const,
      label: 'Preferences',
      icon: Trophy,
      description: 'Customize display settings'
    },
    {
      id: 'data' as const,
      label: 'Data Management',
      icon: Database,
      description: 'Manage cached data'
    }
  ];

  return (
    <div className="flex flex-col gap-2 py-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6">
      <ChromeExtensionHandler />
      <div className="px-2 sm:px-4 lg:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your workspace connection, notifications, and preferences
          </p>
        </div>

        {/* Settings Layout with Sidebar */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 lg:shrink-0">
            <nav className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-left whitespace-nowrap lg:whitespace-normal lg:w-full",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="font-medium text-sm">{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content Area */}
          <div className="flex-1 max-w-2xl">
            {/* Connection Section */}
            {activeSection === 'connection' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Connection</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect your Slack workspace to import and manage emojis
                  </p>
                </div>
                <div className="space-y-4">
                  {!hasSlack ? (
                    <>
                      {/* Chrome Extension Connection Card */}
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-primary/10 p-3">
                              <ChromeIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <h3 className="font-semibold">Chrome Extension (Recommended)</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  One-click authentication with the Chrome extension. The fastest way to connect your Slack workspace.
                                </p>
                              </div>
                              <Button
                                className="w-full sm:w-auto"
                                asChild
                              >
                                <a 
                                  href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2"
                                >
                                  <ChromeIcon className="h-4 w-4" />
                                  Get Chrome Extension
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Manual Setup Alternative */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="rounded-lg bg-muted p-3">
                              <Terminal className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <Button
                                variant="ghost"
                                onClick={() => setIsManualSetupOpen(!isManualSetupOpen)}
                                className="w-full justify-between p-0 h-auto text-left hover:bg-transparent"
                              >
                                <div>
                                  <h3 className="font-semibold">Manual Setup</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Advanced method using browser developer tools
                                  </p>
                                </div>
                                {isManualSetupOpen ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              <Collapsible open={isManualSetupOpen}>
                                <CollapsibleContent>
                                  <div className="mt-4">
                                    <SlackCurlInput />
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <>
                      {/* Connected state */}
                      <Card className="border-green-500/20 bg-green-500/5">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="rounded-lg bg-green-500/10 p-3">
                              <Zap className="h-6 w-6 text-green-500" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">Workspace Connected</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Your Slack workspace is synced and ready
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <ChromeExtensionOption />
                      
                      {/* Update connection option */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="space-y-3">
                            <h3 className="font-semibold">Update Connection</h3>
                            <p className="text-sm text-muted-foreground">
                              Refresh your authentication or connect a different workspace
                            </p>
                            <SlackCurlInput />
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
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
            )}
            
            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Preferences</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customize how data is displayed across the dashboard
                  </p>
                </div>
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold">Leaderboard Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure how the emoji leaderboard displays users
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inactivityThreshold">Inactive User Threshold (months)</Label>
                      <Input 
                        id="inactivityThreshold" 
                        type="number" 
                        value={inactivityThresholdMonths} 
                        onChange={handleThresholdChange} 
                        min="0"
                        className="w-full sm:w-1/2 md:w-1/3"
                      />
                      <p className="text-xs text-muted-foreground">
                        Users who haven't submitted an emoji in this many months will be hidden when 'Show Inactive' is off.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Data Management Section */}
            {activeSection === 'data' && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-xl font-semibold">Data Management</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your cached data and storage settings
                  </p>
                </div>
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  <FetchStatsDisplay />
                  <Card>
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold">Clear Local Storage</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Remove all cached data and preferences
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                          <p className="text-xs text-destructive">
                            Warning: This will remove all cached emoji data, workspace information, 
                            and stored preferences. You'll need to reconnect to Slack.
                          </p>
                        </div>
                        <ClearLocalStorageButton />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}