export interface SlackAuthData {
  workspace: string;
  token: string;
  cookie: string;
  teamId?: string;
  xId?: string;
}

export function initializeExtensionListener(
  onDataReceived: (data: SlackAuthData) => void,
  onClearData?: () => void
) {
  if (typeof window === 'undefined') return;
  
  console.log('[Emoji Studio] Initializing extension listener');
  
  window.addEventListener('message', (event) => {
    console.log('[Emoji Studio] Received window message:', event.data);
    
    if (event.data.type === 'EMOJI_STUDIO_DATA') {
      console.log('[Emoji Studio] Received EMOJI_STUDIO_DATA message');
      if (event.data.data) {
        console.log('[Emoji Studio] Processing extension data:', event.data.data);
        onDataReceived(event.data.data);
      } else {
        console.log('[Emoji Studio] No data in message');
      }
    } else if (event.data.type === 'EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION') {
      console.log('[Emoji Studio] Received clear data request from extension');
      if (onClearData) {
        onClearData();
      } else {
        // Fallback: trigger the clear button click
        const clearButton = document.querySelector('[data-clear-storage-button]') as HTMLButtonElement;
        if (clearButton) {
          clearButton.click();
        }
      }
    }
  });
  
  // Check if opened from extension
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('extension') === 'true') {
    console.log('[Emoji Studio] Extension parameter detected, signaling ready');
    // Signal readiness to extension
    window.postMessage({ type: 'EMOJI_STUDIO_READY' }, '*');
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