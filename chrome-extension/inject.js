// This script will be injected into Emoji Studio pages to establish communication
(function() {
  console.log('[Emoji Studio Extension] Inject script loaded');

  // Check if chrome.storage is available
  if (typeof chrome === 'undefined' || !chrome.storage) {
    console.log('[Emoji Studio Extension] Chrome API not available');
    return;
  }

  // Track pending sync acknowledgments
  const pendingSyncAcks = new Map();

  // Generate unique sync ID
  function generateSyncId() {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Wait for DOM to be ready before marking extension
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markExtensionInstalled);
  } else {
    markExtensionInstalled();
  }

  function markExtensionInstalled() {
    // Mark extension as installed
    window.__EMOJI_STUDIO_EXTENSION__ = true;
    console.log('[Emoji Studio Extension] Marked window.__EMOJI_STUDIO_EXTENSION__ = true');

    // Dispatch event to notify the page
    const version = chrome.runtime.getManifest().version;
    window.dispatchEvent(new CustomEvent('emoji-studio-extension-installed', {
      detail: { version: version }
    }));
    console.log('[Emoji Studio Extension] Dispatched emoji-studio-extension-installed event with version:', version);

    // Post message once - webapp should be listening
    window.postMessage({
      type: 'EMOJI_STUDIO_EXTENSION_INSTALLED',
      version: version
    }, '*');
  }

  // Retry helper with exponential backoff
  async function withRetry(fn, options = {}) {
    const { maxRetries = 3, baseDelay = 500, maxDelay = 5000 } = options;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        if (result !== null && result !== undefined) {
          return result;
        }
      } catch (error) {
        lastError = error;
        console.warn(`[Inject] Attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
      }

      if (attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.log(`[Inject] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    if (lastError) {
      throw lastError;
    }
    return null;
  }

  // Function to check for synced data from extension storage with retry
  async function checkForSyncedData(options = {}) {
    const { withAck = true, maxRetries = 3 } = options;

    try {
      console.log('[Inject] Checking chrome.storage.local for sync data...');

      // Use retry logic for storage reads
      const result = await withRetry(async () => {
        const data = await chrome.storage.local.get(['emojiStudioSyncData', 'emojiStudioSyncMeta']);
        if (data.emojiStudioSyncData && data.emojiStudioSyncMeta) {
          return data;
        }
        return null;
      }, { maxRetries });

      if (!result) {
        console.log('[Inject] No sync data found in chrome.storage.local after retries');
        return false;
      }

      console.log('[Inject] Storage check result:', {
        hasSyncData: !!result.emojiStudioSyncData,
        hasSyncMeta: !!result.emojiStudioSyncMeta,
        emojiCount: result.emojiStudioSyncMeta?.emojiCount || 0,
        workspace: result.emojiStudioSyncMeta?.workspace || 'none'
      });

      console.log('[Inject] Found synced data in extension storage, posting to window');
      console.log('[Inject] Emoji count:', result.emojiStudioSyncData.emojiCount);
      console.log('[Inject] Workspace:', result.emojiStudioSyncData.workspace);

      // Generate sync ID for acknowledgment tracking
      const syncId = generateSyncId();

      // Send the synced data to Emoji Studio with sync ID
      window.postMessage({
        type: 'EMOJI_STUDIO_SYNCED_DATA',
        syncId: syncId,
        data: result.emojiStudioSyncData,
        meta: result.emojiStudioSyncMeta,
        source: 'extension-storage'
      }, '*');

      // If acknowledgment is requested, wait for it
      if (withAck) {
        try {
          await waitForAcknowledgment(syncId, 10000); // 10 second timeout
          console.log('[Inject] Sync acknowledged by webapp');
        } catch (ackError) {
          console.warn('[Inject] Sync acknowledgment timeout, data may not have been processed:', ackError.message);
          // Don't fail - the data was sent, webapp might have processed it without ack
        }
      }

      return true;
    } catch (error) {
      console.error('[Inject] Error checking for synced data:', error);
      return false;
    }
  }

  // Wait for acknowledgment from webapp
  function waitForAcknowledgment(syncId, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingSyncAcks.delete(syncId);
        reject(new Error(`Acknowledgment timeout for sync ${syncId}`));
      }, timeout);

      pendingSyncAcks.set(syncId, {
        resolve: (data) => {
          clearTimeout(timeoutId);
          pendingSyncAcks.delete(syncId);
          resolve(data);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          pendingSyncAcks.delete(syncId);
          reject(error);
        }
      });
    });
  }

  // Check for synced data on page load with a small delay to ensure page is ready
  const urlParams = new URLSearchParams(window.location.search);
  const syncStarting = urlParams.get('syncStarting') === 'true';

  if (!syncStarting) {
    // Normal page load - check after short delay
    setTimeout(() => {
      checkForSyncedData({ withAck: false }); // Don't require ack for initial load
    }, 500);
  } else {
    console.log('[Inject] Sync is starting, will check for fresh sync data with retries');
    // When syncStarting=true, we're coming from the extension's sync button
    // Use retry logic instead of fixed delays
    setTimeout(async () => {
      console.log('[Inject] Checking for fresh sync data with retries...');
      const found = await checkForSyncedData({ withAck: true, maxRetries: 5 });
      if (!found) {
        console.warn('[Inject] No sync data found after all retries');
      }
    }, 1000);
  }
  
  // Listen for sync progress messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SYNC_STARTED') {
      console.log('[Inject] Sync started for workspace:', message.workspace);
      window.postMessage({
        type: 'EMOJI_STUDIO_SYNC_PROGRESS',
        status: 'started',
        workspace: message.workspace,
        timestamp: message.timestamp
      }, '*');
    } else if (message.type === 'SYNC_COMPLETED') {
      console.log('[Inject] Sync completed for workspace:', message.workspace);
      window.postMessage({
        type: 'EMOJI_STUDIO_SYNC_PROGRESS',
        status: 'completed',
        workspace: message.workspace,
        emojiCount: message.emojiCount,
        nonAliasCount: message.nonAliasCount,
        timestamp: message.timestamp
      }, '*');
      
      // Also check for updated synced data
      setTimeout(() => {
        checkForSyncedData();
      }, 100);
    } else if (message.type === 'SYNC_ERROR') {
      console.log('[Inject] Sync error for workspace:', message.workspace, message.error);
      window.postMessage({
        type: 'EMOJI_STUDIO_SYNC_PROGRESS',
        status: 'error',
        workspace: message.workspace,
        error: message.error,
        timestamp: message.timestamp
      }, '*');
    }
  });
  
  // Check if we're on the dashboard with extension parameter
  // urlParams already declared above, reuse it
  
  
  // Add a visual indicator that the extension is loaded
  
  if (urlParams.get('extension') === 'true') {
  }
  
  if (urlParams.get('extension') === 'true' && (window.location.pathname.includes('dashboard') || window.location.pathname.includes('settings'))) {
    // Check chrome.storage for pending data
    chrome.storage.local.get(['pendingExtensionData'], (result) => {
      if (result.pendingExtensionData) {
        // Small delay to ensure the page is ready
        setTimeout(() => {
          sendDataToPage(result.pendingExtensionData);
        }, 500);
        
        // Clear the pending data
        chrome.storage.local.remove(['pendingExtensionData']);
      } else {
      }
    });
  } else if (window.location.pathname.includes('create')) {
      
      // Check if we came from the extension (new workflow)
      // urlParams already declared above, reuse it
      if (urlParams.get('from') === 'extension') {
        
        // Add a small delay to ensure storage is written before we read it
        setTimeout(() => {
          chrome.storage.local.get(['pendingEmojiStudioCreate'], (result) => {
            if (result.pendingEmojiStudioCreate) {
            
            // Small delay to ensure the page is ready
            setTimeout(() => {
              // Send emoji creation data to the page
              window.postMessage({
                type: 'EMOJI_STUDIO_CREATE_EMOJI',
                imageUrl: result.pendingEmojiStudioCreate.imageUrl,
                originalUrl: result.pendingEmojiStudioCreate.originalUrl,
                emojiName: result.pendingEmojiStudioCreate.name,
                workspace: result.pendingEmojiStudioCreate.workspace
              }, '*');
              
            }, 500);
            
            // Clear the pending data
            chrome.storage.local.remove(['pendingEmojiStudioCreate']);
            } else {
            }
          });
        }, 1000); // Wait 1 second for storage to be written
      } else {
        // Old workflow - check for pendingEmojiCreate (kept for compatibility)
        chrome.storage.local.get(['pendingEmojiCreate'], (result) => {
          if (result.pendingEmojiCreate) {
            
            // Small delay to ensure the page is ready
            setTimeout(() => {
              // Send emoji creation data to the page
              window.postMessage({
                type: 'EMOJI_STUDIO_CREATE_EMOJI',
                data: result.pendingEmojiCreate
              }, '*');
              
            }, 500);
            
            // Clear the pending data
            chrome.storage.local.remove(['pendingEmojiCreate']);
          }
        });
        
        // Also check for pendingEmojiAdd (from Slackmojis)
        chrome.storage.local.get(['pendingEmojiAdd'], (result) => {
          if (result.pendingEmojiAdd) {
            
            // Small delay to ensure the page is ready
            setTimeout(() => {
              // Send emoji add data to the page
              window.postMessage({
                type: 'EMOJI_STUDIO_ADD_EMOJI',
                data: result.pendingEmojiAdd
              }, '*');
              
            }, 500);
            
            // Clear the pending data
            chrome.storage.local.remove(['pendingEmojiAdd']);
          }
        });
        
        // Check for cart data (from extension-cart flow)
        if (urlParams.get('from') === 'extension-cart') {
          chrome.storage.local.get(['pendingEmojiStudioCart'], (result) => {
            if (result.pendingEmojiStudioCart) {
              console.log('[Inject] Found cart data:', result.pendingEmojiStudioCart);
              
              // Small delay to ensure the page is ready
              setTimeout(() => {
                // Send cart data to the page
                window.postMessage({
                  type: 'EMOJI_STUDIO_CART_DATA',
                  data: result.pendingEmojiStudioCart
                }, '*');
              }, 500);
              
              // Clear the pending data
              chrome.storage.local.remove(['pendingEmojiStudioCart']);
            } else {
              console.log('[Inject] No cart data found in storage');
            }
          });
        }
      }
  }
  
  // Function to send data to the page
  function sendDataToPage(data) {
    window.postMessage({
      type: 'EMOJI_STUDIO_DATA',
      data: data
    }, '*');
    
  }
  
  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.type === 'EMOJI_DATA_SYNCED') {
      // Extension notifying us that new data has been synced
      console.log('[Inject] Received notification of new synced data');
      checkForSyncedData();
      sendResponse({ success: true });
    } else if (request.type === 'EMOJI_STUDIO_DATA') {
      // Forward the data to the page
      sendDataToPage(request.data);
      
      // Also clear any pending data from storage
      chrome.storage.local.remove(['pendingExtensionData']);
      
      sendResponse({ success: true });
    } else if (request.type === 'EMOJI_STUDIO_CREATE_EMOJI') {
      // Forward the emoji creation data to the page
      window.postMessage({
        type: 'EMOJI_STUDIO_CREATE_EMOJI',
        imageUrl: request.imageUrl
      }, '*');
      
      sendResponse({ success: true });
    } else if (request.type === 'CLEAR_EMOJI_STUDIO_DATA') {
      // Tell Emoji Studio to clear its data
      
      const message = {
        type: 'EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION'
      };
      
      window.postMessage(message, '*');
      
      sendResponse({ success: true });
    }
    return true; // Keep message channel open
  });
  
  // Also listen for window messages to confirm they're being received
  window.addEventListener('message', (event) => {
    // Handle sync acknowledgments from webapp
    if (event.data.type === 'EMOJI_STUDIO_SYNC_ACK') {
      const { syncId, success, emojiCount } = event.data;
      console.log('[Inject] Received sync acknowledgment:', { syncId, success, emojiCount });

      const pending = pendingSyncAcks.get(syncId);
      if (pending) {
        if (success) {
          pending.resolve({ success, emojiCount });
        } else {
          pending.reject(new Error('Webapp reported sync failure'));
        }
      }
    } else if (event.data.type === 'EMOJI_STUDIO_PING') {
      // Respond to health check pings from webapp
      console.log('[Inject] Received ping from webapp');
      chrome.storage.local.get(['syncSettings', 'slackData'], (result) => {
        const workspace = result.slackData ? Object.keys(result.slackData)[0] : null;
        const lastSync = result.syncSettings?.lastSuccessfulSync || null;

        window.postMessage({
          type: 'EMOJI_STUDIO_PONG',
          timestamp: Date.now(),
          extensionVersion: chrome.runtime.getManifest().version,
          connected: !!workspace,
          workspace: workspace,
          lastSync: lastSync
        }, '*');
      });
    } else if (event.data.type === 'EMOJI_STUDIO_DATA') {
      // No-op, just logging removed
    } else if (event.data.type === 'EMOJI_STUDIO_ADD_EMOJI') {
      // No-op, just logging removed
    } else if (event.data.type === 'EMOJI_STUDIO_CLEAR_DATA') {
      // Forward to background script to clear extension data
      chrome.runtime.sendMessage({ type: 'CLEAR_DATA' });
    } else if (event.data.type === 'UPDATE_NOTIFICATION_SETTINGS') {
      // Forward notification settings to background script
      console.log('[Inject] Forwarding notification settings to extension');
      chrome.runtime.sendMessage({
        type: 'UPDATE_NOTIFICATION_SETTINGS',
        settings: event.data.settings
      });
    } else if (event.data.type === 'REQUEST_EXTENSION_SYNC_DATA') {
      // Emoji Studio requesting synced data
      console.log('[Inject] Emoji Studio requesting synced data');
      checkForSyncedData({ withAck: false });
    } else if (event.data.type === 'EMOJI_STUDIO_READY') {
      // Emoji Studio is ready, send synced data if available
      console.log('[Inject] Emoji Studio ready, checking for synced data');
      checkForSyncedData({ withAck: false });
    } else if (event.data.type === 'REQUEST_EXTENSION_DATA') {
      // Check chrome.storage for pending data
      chrome.storage.local.get(['pendingExtensionData'], (result) => {
        if (result.pendingExtensionData) {
          sendDataToPage(result.pendingExtensionData);
          // Clear the pending data
          chrome.storage.local.remove(['pendingExtensionData']);
        }
      });
    }
  });
  
  // Also check for pendingEmojiAdd on dashboard page load (from Slackmojis)
  if (window.location.pathname.includes('dashboard')) {
    chrome.storage.local.get(['pendingEmojiAdd'], (result) => {
      if (result.pendingEmojiAdd) {
        
        // Small delay to ensure the page is ready
        setTimeout(() => {
          // Send emoji add data to the page
          const messageData = {
            type: 'EMOJI_STUDIO_ADD_EMOJI',
            data: result.pendingEmojiAdd
          };
          
          window.postMessage(messageData, '*');
          
          
          // Clear the pending data
          chrome.storage.local.remove(['pendingEmojiAdd']);
        }, 1000);
      }
    });
  }
  
  // Notify the extension that we're ready
  window.postMessage({ type: 'EMOJI_STUDIO_READY' }, '*');
})();