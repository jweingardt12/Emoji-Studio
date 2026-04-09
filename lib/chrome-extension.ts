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
    return;
  }

  isListenerInitialized = true;
  
  window.addEventListener('message', (event) => {
    // Only accept messages from our own origin or the Chrome extension
    if (event.origin !== window.location.origin && !event.origin.startsWith('chrome-extension://')) return;

    // Handle synced data from extension (new background sync)
    if (event.data.type === 'EMOJI_STUDIO_SYNCED_DATA') {
      if (event.data.data && event.data.meta) {
        // Prevent processing the same sync data multiple times within 5 seconds
        const syncTime = event.data.data.lastSyncTime || 0;
        const now = Date.now();
        if (syncTime === lastSyncedDataProcessedTime && (now - syncTime) < 5000) {
          return;
        }
        lastSyncedDataProcessedTime = syncTime;
        
        if (onSyncedDataReceived) {
          onSyncedDataReceived(event.data.data, event.data.meta);
        } else {
          // Default handling - store in localStorage
          const emojiData = event.data.data.emojiData;
          const workspace = event.data.data.workspace;
          const syncTimestamp = event.data.data.lastSyncTime || Date.now();

          // Import storage dynamically (this is async)
          import('./storage/indexed-db').then(({ emojiStorage }) => {
            emojiStorage.saveEmojis(emojiData, syncTimestamp).then(() => {
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
            });
          });
        }
      }
    } else if (event.data.type === 'EMOJI_STUDIO_DATA') {
      if (event.data.data) {
        // Validate the data before processing
        if (validateSlackAuthData(event.data.data)) {
          onDataReceived(event.data.data);
        } else {
        }
      }
    } else if (event.data.type === 'EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION') {
      if (onClearData) {
        onClearData();
      }
    }
  });
  
  // Check if opened from extension
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('extension') === 'true') {
    // Signal readiness to extension
    window.postMessage({ type: 'EMOJI_STUDIO_READY' }, '*');
    
    // Request data from extension
    window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
  }
  
  // Always request synced data on page load
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