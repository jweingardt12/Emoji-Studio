export interface SlackAuthData {
  workspace: string;
  token: string;
  cookie: string;
  teamId?: string;
  xId?: string;
}

export interface SyncedEmojiData {
  workspace: string;
  emojiData: any[];
  emojiCount: number;
  lastFetchTime: string;
  lastSyncTime: number;
  token?: string | null;
  cookie?: string | null;
  version: string;
}

export interface SyncedEmojiMeta {
  workspace: string;
  lastSync: number;
  emojiCount: number;
  hasData: boolean;
}

// Global flag to track if listener has been initialized
let isListenerInitialized = false;
let lastSyncedDataProcessedTime = 0;

export function validateSlackAuthData(data: any): data is SlackAuthData {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.workspace === 'string' &&
    data.workspace.length > 0 &&
    typeof data.token === 'string' &&
    data.token.length > 0 &&
    typeof data.cookie === 'string' &&
    data.cookie.length > 0
  );
}

export function initializeExtensionListener(
  onDataReceived: (data: SlackAuthData) => void,
  onClearData?: () => void,
  onSyncedDataReceived?: (data: SyncedEmojiData, meta: SyncedEmojiMeta) => void
) {
  if (typeof window === 'undefined') return;
  
  // Prevent multiple initializations
  if (isListenerInitialized) {
    console.log('[Emoji Studio] Extension listener already initialized, skipping');
    return;
  }
  
  isListenerInitialized = true;
  console.log('[Emoji Studio] Initializing extension listener');
  console.log('[Emoji Studio] Window location:', window.location.href);
  
  // Log messages for debugging (filter out noise)
  window.addEventListener('message', (event) => {
    // Only log messages that look like they're from our extension
    const messageType = event.data?.type;
    if (messageType && (
      messageType.includes('EMOJI_STUDIO') ||
      messageType.includes('SLACK') ||
      messageType === 'REQUEST_EXTENSION_DATA' ||
      messageType === 'REQUEST_EXTENSION_SYNC_DATA'
    )) {
      console.log('[Emoji Studio] Received window message:', {
        type: messageType,
        origin: event.origin,
        hasData: !!event.data.data,
        hasMeta: !!event.data.meta,
        source: event.data.source
      });
    }

    // Handle synced data from extension (new background sync)
    if (event.data.type === 'EMOJI_STUDIO_SYNCED_DATA') {
      console.log('[Emoji Studio] Received EMOJI_STUDIO_SYNCED_DATA message');
      if (event.data.data && event.data.meta) {
        console.log('[Emoji Studio] Synced data summary:', {
          workspace: event.data.data.workspace,
          emojiCount: event.data.data.emojiCount,
          hasToken: !!event.data.data.token,
          hasCookie: !!event.data.data.cookie,
          lastSyncTime: event.data.data.lastSyncTime,
          source: event.data.source
        });
        console.log('[Emoji Studio] Sync metadata:', event.data.meta);
        
        // Prevent processing the same sync data multiple times within 5 seconds
        const syncTime = event.data.data.lastSyncTime || 0;
        const now = Date.now();
        if (syncTime === lastSyncedDataProcessedTime && (now - syncTime) < 5000) {
          console.log('[Emoji Studio] Duplicate sync data detected, skipping processing');
          return;
        }
        lastSyncedDataProcessedTime = syncTime;
        
        if (onSyncedDataReceived) {
          onSyncedDataReceived(event.data.data, event.data.meta);
        } else {
          // Default handling - store in localStorage
          console.log('[Emoji Studio] No handler provided, using default storage');

          const emojiData = event.data.data.emojiData;
          const workspace = event.data.data.workspace;
          const syncTimestamp = event.data.data.lastSyncTime || Date.now();

          // Import storage dynamically (this is async)
          import('./storage/indexed-db').then(({ emojiStorage }) => {
            emojiStorage.saveEmojis(emojiData, syncTimestamp).then(() => {
              console.log('[Emoji Studio] Saved synced data to storage');

              // Update metadata in localStorage for tracking
              localStorage.setItem('workspace', workspace);
              localStorage.setItem('emojiCount', event.data.data.emojiCount.toString());
              localStorage.setItem('lastFetchTime', event.data.data.lastFetchTime);
              localStorage.setItem('lastSyncTime', syncTimestamp.toString());

              // Store auth data if provided
              if (event.data.data.token) {
                localStorage.setItem('extensionToken', event.data.data.token);
              }
              if (event.data.data.cookie) {
                localStorage.setItem('extensionCookie', event.data.data.cookie);
              }

              // Trigger UI update WITH data to prevent race conditions
              window.dispatchEvent(new CustomEvent('emojiDataUpdated', {
                detail: {
                  emojiData: emojiData,
                  workspace: workspace,
                  timestamp: syncTimestamp
                }
              }));

              // Show success notification
              const notification = document.createElement('div');
              notification.className = 'fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
              notification.textContent = `Synced ${event.data.data.emojiCount} emojis from ${workspace}`;
              document.body.appendChild(notification);
              setTimeout(() => notification.remove(), 3000);
            }).catch((error) => {
              console.error('[Emoji Studio] Failed to save synced data:', error);
            });
          });
        }
      }
    } else if (event.data.type === 'EMOJI_STUDIO_DATA') {
      console.log('[Emoji Studio] Received EMOJI_STUDIO_DATA message');
      if (event.data.data) {
        console.log('[Emoji Studio] Raw extension data:', event.data.data);
        
        // Validate the data before processing
        if (validateSlackAuthData(event.data.data)) {
          console.log('[Emoji Studio] Valid extension data, processing:', event.data.data);
          onDataReceived(event.data.data);
        } else {
          console.error('[Emoji Studio] Invalid data format received from extension:', event.data.data);
          console.error('[Emoji Studio] Expected format: { workspace: string, token: string, cookie: string }');
        }
      } else {
        console.log('[Emoji Studio] No data in message');
      }
    } else if (event.data.type === 'EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION') {
      console.log('[Emoji Studio] Received clear data request from extension');
      if (onClearData) {
        onClearData();
      } else {
        // Let other listeners handle it (like ExtensionClearDataListener)
        console.log('[Emoji Studio] No onClearData callback provided, letting other listeners handle it');
      }
    }
  });
  
  // Check if opened from extension
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('extension') === 'true') {
    console.log('[Emoji Studio] Extension parameter detected, signaling ready');
    // Signal readiness to extension
    window.postMessage({ type: 'EMOJI_STUDIO_READY' }, '*');
    
    // Request data from extension
    window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
  }
  
  // Always request synced data on page load
  console.log('[Emoji Studio] Requesting synced data from extension');
  window.postMessage({ type: 'REQUEST_EXTENSION_SYNC_DATA' }, '*');
}

// Function to reset the listener initialization state (for testing/cleanup)
export function resetExtensionListener() {
  isListenerInitialized = false;
  lastSyncedDataProcessedTime = 0;
}

export function isExtensionInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    
    const extensionId = 'YOUR_EXTENSION_ID_HERE'; // Will be set after publishing
    const testUrl = `chrome-extension://${extensionId}/manifest.json`;
    
    fetch(testUrl)
      .then(() => resolve(true))
      .catch(() => resolve(false));
  });
}