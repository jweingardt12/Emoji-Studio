export interface SlackAuthData {
  workspace: string;
  token: string;
  cookie: string;
  teamId?: string;
  xId?: string;
}

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
  onClearData?: () => void
) {
  if (typeof window === 'undefined') return;
  
  console.log('[Emoji Studio] Initializing extension listener');
  console.log('[Emoji Studio] Window location:', window.location.href);
  
  // Log all messages for debugging
  window.addEventListener('message', (event) => {
    console.log('[Emoji Studio] Received window message:', event.data);
    console.log('[Emoji Studio] Message origin:', event.origin);
    console.log('[Emoji Studio] Message type:', event.data?.type);
    
    if (event.data.type === 'EMOJI_STUDIO_DATA') {
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