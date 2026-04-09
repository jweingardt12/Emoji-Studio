const pendingRequests = new Map();
let debugMode = false;
let lastCapturedWorkspace = null;
let lastCaptureTime = 0;
let hasCheckedEmojiPage = false; // Track if we've already checked the emoji page on this URL

// Rainbow sync button state
let rainbowButtonInjected = false;
let rainbowButtonElement = null;
let rainbowButtonObserver = null;
const EMOJI_STUDIO_URL = 'https://app.emojistudio.xyz';

// Helper function to check if on emoji customization page (DRY)
function isOnEmojiPage() {
  return window.location.pathname.includes('/customize/emoji');
}

const shouldUseSafariFallbackCapture = (() => {
  if (typeof safari !== 'undefined' && safari.pushNotification) {
    return true;
  }
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';
  const isSafariVendor = vendor.includes('Apple');
  const isSafariUA = /\bSafari\b/.test(ua) && !/\bChrome\b|\bCriOS\b|\bFxiOS\b|\bEdg\b|\bOPR\b/i.test(ua);
  return isSafariVendor && isSafariUA;
})();

const SAFARI_CAPTURE_ENDPOINTS = [
  '/api/emoji.adminList',
  '/api/emoji.list',
  '/api/emoji.add',
  '/api/emoji.remove',
  '/api/client.',
  '/api/users.',
  '/api/team.'
];

let safariFallbackInstalled = false;
let safariListenerAttached = false;
let lastSafariCaptureKey = null;
let lastSafariCaptureTime = 0;

function log(...args) {
  if (debugMode) {
  }
}


function extractWorkspace() {
  const match = window.location.hostname.match(/^([^.]+)\.slack\.com$/);
  return match ? match[1] : null;
}

function normalizeSlackToken(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  let token = value.trim();
  if (!token) {
    return null;
  }
  try {
    token = decodeURIComponent(token);
  } catch (error) {}
  if (!token.startsWith('xox')) {
    return null;
  }
  return token;
}

// Check if user is on a Slack login page
function checkIfLoggedIn() {
  const workspace = extractWorkspace();
  if (!workspace) return;
  
  // Check for common login page indicators
  const isLoginPage = 
    window.location.pathname.includes('/signin') ||
    window.location.pathname.includes('/login') ||
    window.location.pathname === '/' && document.querySelector('input[type="password"]') ||
    document.querySelector('.signin_form') ||
    document.querySelector('[data-qa="signin_domain_input"]');
    
  if (isLoginPage) {
    chrome.runtime.sendMessage({
      type: 'SLACK_AUTH_FAILED',
      workspace: workspace
    });
  }
}

// Check authentication status on page load
setTimeout(checkIfLoggedIn, 1000);

// Check if we're on the emoji customization page and show a prompt
function checkEmojiPage() {
  const onEmojiPage = isOnEmojiPage();
  console.log('[Emoji Studio Extension] Page check - Is emoji page?', onEmojiPage, 'Path:', window.location.pathname);

  if (onEmojiPage && !hasCheckedEmojiPage) {
    console.log('[Emoji Studio Extension] On emoji customization page, checking for data...');
    
    // Get the workspace from the URL
    const workspace = extractWorkspace();
    if (!workspace) {
      console.log('[Emoji Studio Extension] Could not extract workspace from URL');
      return;
    }
    
    // Ask background script to check if we have emoji data
    chrome.runtime.sendMessage({ 
      type: 'CHECK_EMOJI_PAGE', 
      workspace: workspace 
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Emoji Studio Extension] Error checking data:', chrome.runtime.lastError);
        return;
      }
      
      console.log('[Emoji Studio Extension] Data check response:', response);
      
      if (response.hasEmojis && response.emojiCount > 0) {
        // We have emoji data - rainbow button is persistent on the page
        console.log('[Emoji Studio Extension] Found emoji data:', response.emojiCount, 'emojis');
      } else if (response.hasData) {
        // We have auth but no emojis - might be fetching
        console.log('[Emoji Studio Extension] Have auth data but no emojis yet');
        // Wait a bit and check again
        setTimeout(() => {
          if (!hasCheckedEmojiPage) {
            checkEmojiPage();
          }
        }, 2000);
      } else {
        // No data at all - show refresh prompt
        console.log('[Emoji Studio Extension] No data captured yet');
        // Rainbow button is now persistent on the page, no need for transient notification
      }
    });
  }
}

// ============================================================================
// RAINBOW SYNC BUTTON - Persistent button for emoji customization page
// ============================================================================

function injectRainbowButtonStyles() {
  if (document.getElementById('emoji-studio-rainbow-btn-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'emoji-studio-rainbow-btn-styles';
  styles.textContent = `
    /* MagicUI Rainbow Button - Color Variables */
    :root {
      --es-color-1: 0 100% 63%;
      --es-color-2: 270 100% 63%;
      --es-color-3: 210 100% 63%;
      --es-color-4: 195 100% 63%;
      --es-color-5: 90 100% 55%;
    }

    /* Rainbow Button Container - MagicUI Style */
    #emoji-studio-rainbow-btn {
      position: relative;
      display: inline-flex;
      height: 32px;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 0 12px;
      margin-right: 8px;
      vertical-align: middle;
      box-sizing: border-box;
      border: calc(0.08 * 1rem) solid transparent;
      border-radius: 6px;
      cursor: pointer;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      color: white;
      background:
        linear-gradient(#121213, #121213),
        linear-gradient(#121213 50%, rgba(18, 18, 19, 0.6) 80%, rgba(18, 18, 19, 0)),
        linear-gradient(90deg, hsl(var(--es-color-1)), hsl(var(--es-color-5)), hsl(var(--es-color-3)), hsl(var(--es-color-4)), hsl(var(--es-color-2)));
      background-clip: padding-box, border-box, border-box;
      background-origin: border-box;
      background-size: 200%;
      animation: emoji-studio-rainbow 2s linear infinite, emoji-studio-entry 0.5s ease-out;
      transition: transform 0.15s ease;
    }

    /* Entry animation - scale up with slight bounce */
    @keyframes emoji-studio-entry {
      0% {
        opacity: 0;
        transform: scale(0.8);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Rainbow glow effect underneath */
    #emoji-studio-rainbow-btn::before {
      content: '';
      position: absolute;
      bottom: -20%;
      left: 50%;
      z-index: -1;
      height: 20%;
      width: 60%;
      transform: translateX(-50%);
      background: linear-gradient(90deg, hsl(var(--es-color-1)), hsl(var(--es-color-5)), hsl(var(--es-color-3)), hsl(var(--es-color-4)), hsl(var(--es-color-2)));
      background-size: 200%;
      filter: blur(12px);
      animation: emoji-studio-rainbow 2s linear infinite;
    }

    /* Shimmer effect overlay */
    #emoji-studio-rainbow-btn::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, 0) 10%,
        rgba(255, 255, 255, 0.3) 50%,
        rgba(255, 255, 255, 0) 90%,
        transparent 100%
      );
      border-radius: inherit;
      animation: emoji-studio-shimmer 3s ease-in-out infinite;
      pointer-events: none;
    }

    #emoji-studio-rainbow-btn:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.8);
      outline-offset: 2px;
    }

    #emoji-studio-rainbow-btn:hover {
      transform: translateY(-2px);
    }

    #emoji-studio-rainbow-btn:active {
      transform: translateY(0);
    }

    /* Rainbow Animation */
    @keyframes emoji-studio-rainbow {
      0% { background-position: 0%; }
      100% { background-position: 200%; }
    }

    /* Shimmer Animation */
    @keyframes emoji-studio-shimmer {
      0% { left: -100%; }
      50% { left: 100%; }
      100% { left: 100%; }
    }

    /* Logo Styling */
    .emoji-studio-rainbow-btn-logo {
      width: 16px;
      height: 16px;
      object-fit: contain;
      border-radius: 2px;
    }

    /* Dark Mode Support - White button with rainbow border */
    .p-theme--dark #emoji-studio-rainbow-btn,
    .sk-client-theme--dark #emoji-studio-rainbow-btn {
      color: #121213;
      background:
        linear-gradient(#fff, #fff),
        linear-gradient(#fff 50%, rgba(255, 255, 255, 0.6) 80%, rgba(0, 0, 0, 0)),
        linear-gradient(90deg, hsl(var(--es-color-1)), hsl(var(--es-color-5)), hsl(var(--es-color-3)), hsl(var(--es-color-4)), hsl(var(--es-color-2)));
      background-clip: padding-box, border-box, border-box;
      background-origin: border-box;
      background-size: 200%;
    }

    /* Syncing state */
    #emoji-studio-rainbow-btn.syncing {
      opacity: 0.7;
      cursor: wait;
      animation-play-state: paused;
    }

    #emoji-studio-rainbow-btn.syncing::before {
      animation-play-state: paused;
    }

    #emoji-studio-rainbow-btn:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    @media (prefers-reduced-motion: reduce) {
      #emoji-studio-rainbow-btn {
        animation: none !important;
        transition: none !important;
      }

      #emoji-studio-rainbow-btn::before,
      #emoji-studio-rainbow-btn::after {
        animation: none !important;
      }
    }
  `;

  document.head.appendChild(styles);
  console.log('[Emoji Studio] Rainbow button styles injected');
}

function createRainbowSyncButton() {
  const button = document.createElement('button');
  button.id = 'emoji-studio-rainbow-btn';
  button.innerHTML = `
    <img
      src="${chrome.runtime.getURL('logo.png')}"
      class="emoji-studio-rainbow-btn-logo"
      alt="Emoji Studio"
      width="16"
      height="16"
      onerror="this.style.display='none'"
    />
    <span class="emoji-studio-rainbow-btn-text">Sync with Emoji Studio</span>
  `;

  button.addEventListener('click', () => {
    console.log('[Emoji Studio] Rainbow button clicked - initiating sync');

    // Update button state
    button.classList.add('syncing');
    const textSpan = button.querySelector('.emoji-studio-rainbow-btn-text');
    if (textSpan) textSpan.textContent = 'Syncing...';

    // Send sync message
    try {
      let didRespond = false;
      const fallbackTimer = setTimeout(() => {
        if (!didRespond) {
          console.warn('[Emoji Studio] No background response, opening dashboard directly');
          window.open(`${EMOJI_STUDIO_URL}/dashboard?syncStarting=true`, '_blank', 'noopener');
        }
      }, 600);

      chrome.runtime.sendMessage({ type: 'SYNC_TO_EMOJI_STUDIO_AND_OPEN' }, () => {
        didRespond = true;
        clearTimeout(fallbackTimer);
        if (chrome.runtime.lastError) {
          console.warn('[Emoji Studio] Failed to message background:', chrome.runtime.lastError.message);
          window.open(`${EMOJI_STUDIO_URL}/dashboard?syncStarting=true`, '_blank', 'noopener');
        }
      });
    } catch (error) {
      console.warn('[Emoji Studio] Failed to send message:', error);
      window.open(`${EMOJI_STUDIO_URL}/dashboard?syncStarting=true`, '_blank', 'noopener');
    }

    // Reset button after delay
    setTimeout(() => {
      button.classList.remove('syncing');
      if (textSpan) textSpan.textContent = 'Sync with Emoji Studio';
    }, 3000);
  });

  return button;
}

function injectRainbowSyncButton() {
  // Prevent duplicate injection - check DOM as source of truth
  if (document.querySelector('#emoji-studio-rainbow-btn')) {
    rainbowButtonInjected = true; // Sync state with DOM
    return;
  }

  // Only inject on emoji customization page
  if (!isOnEmojiPage()) {
    return;
  }

  console.log('[Emoji Studio] Injecting rainbow sync button...');

  // Inject styles first
  injectRainbowButtonStyles();

  // Strategy 1: Find the "Add Alias" button and insert before it
  const addAliasButton = document.querySelector('button.c-button-unstyled[data-qa="customize_emoji_add_alias_button"]') ||
                         Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.trim() === 'Add Alias');

  if (addAliasButton && addAliasButton.parentNode) {
    const button = createRainbowSyncButton();
    addAliasButton.parentNode.insertBefore(button, addAliasButton);
    rainbowButtonInjected = true;
    rainbowButtonElement = button;
    console.log('[Emoji Studio] Rainbow button injected before Add Alias button');
    setupRainbowButtonObserver();
    return;
  }

  // Strategy 2: Find button container with "Add Custom Emoji" button
  const addEmojiButton = document.querySelector('button[data-qa="customize_emoji_add_button"]') ||
                         Array.from(document.querySelectorAll('button')).find(btn => btn.textContent?.includes('Add Custom Emoji'));

  if (addEmojiButton && addEmojiButton.parentNode) {
    const button = createRainbowSyncButton();
    // Insert at the beginning of the button container
    addEmojiButton.parentNode.insertBefore(button, addEmojiButton.parentNode.firstChild);
    rainbowButtonInjected = true;
    rainbowButtonElement = button;
    console.log('[Emoji Studio] Rainbow button injected in button container');
    setupRainbowButtonObserver();
    return;
  }

  // Strategy 3: Fallback - find header and insert after it
  const primarySelectors = [
    '.p-customize_emoji_wrapper__header',
    '[data-qa="customize_emoji_header"]',
    '.p-ia__view_header',
    'h1'
  ];

  let injectionPoint = null;
  for (const selector of primarySelectors) {
    const element = document.querySelector(selector);
    if (element) {
      injectionPoint = element;
      console.log('[Emoji Studio] Found fallback injection point:', selector);
      break;
    }
  }

  if (!injectionPoint) {
    console.log('[Emoji Studio] Could not find injection point, will retry...');
    return;
  }

  // Create and inject button
  const button = createRainbowSyncButton();

  // Insert after the header element
  if (injectionPoint.tagName === 'H1') {
    injectionPoint.parentNode.insertBefore(button, injectionPoint.nextSibling);
  } else {
    injectionPoint.appendChild(button);
  }

  // Update state
  rainbowButtonInjected = true;
  rainbowButtonElement = button;

  console.log('[Emoji Studio] Rainbow button injected successfully');

  // Setup persistence observer
  setupRainbowButtonObserver();
}

function setupRainbowButtonObserver() {
  // Clean up existing observer
  if (rainbowButtonObserver) {
    rainbowButtonObserver.disconnect();
  }

  rainbowButtonObserver = new MutationObserver(() => {
    const buttonExists = document.querySelector('#emoji-studio-rainbow-btn');

    // Re-inject if button was removed and we're still on emoji page
    if (isOnEmojiPage() && !buttonExists) {
      console.log('[Emoji Studio] Button removed by DOM change, re-injecting...');
      // Use setTimeout to debounce during rapid DOM changes
      setTimeout(() => injectRainbowSyncButton(), 100);
    }
  });

  rainbowButtonObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function removeRainbowSyncButton() {
  if (rainbowButtonElement && rainbowButtonElement.parentNode) {
    rainbowButtonElement.remove();
  }

  if (rainbowButtonObserver) {
    rainbowButtonObserver.disconnect();
    rainbowButtonObserver = null;
  }

  rainbowButtonInjected = false;
  rainbowButtonElement = null;
}

// ============================================================================

// Check if we should auto-sync after refresh
function checkAutoSync() {
  if (sessionStorage.getItem('emojiStudioAutoSync') === 'true') {
    console.log('[Emoji Studio Extension] Auto-sync flag detected, waiting for data capture...');
    sessionStorage.removeItem('emojiStudioAutoSync');

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Show a loading notification
    const notification = document.createElement('div');
    notification.className = 'emoji-studio-notification';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.setAttribute('aria-atomic', 'true');
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
          <path d="M12 2v4m0 12v4m-8-8h4m12 0h4" stroke-linecap="round" style="${reduceMotion ? '' : 'animation: spin 1s linear infinite; transform-origin: center;'}"></path>
        </svg>
        <span style="font-size: 12px;">Fetching emojis...</span>
      </div>
    `;
    notification.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      background: #0284c7;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      box-shadow: 0 1px 4px rgba(2, 132, 199, 0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      line-height: 1.2;
      ${reduceMotion ? '' : 'animation: slideIn 0.2s ease-out;'}
    `;
    
    // Add spinning animation
    if (!reduceMotion) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(notification);
    
    // Wait a bit for data to be captured, then trigger sync
    setTimeout(() => {
      console.log('[Emoji Studio Extension] Auto-triggering sync...');
      chrome.runtime.sendMessage({ type: 'SYNC_TO_EMOJI_STUDIO_AND_OPEN' });
      
      // Update notification
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span style="font-size: 12px;">Syncing emojis...</span>
        </div>
      `;
      notification.style.background = '#15803d';
      
      // Remove notification after a moment
      setTimeout(() => notification.remove(), 2000);
    }, 3000); // Wait 3 seconds for auth capture
  }
}

// Check on page load and when URL changes
checkAutoSync();
checkEmojiPage();

// Inject rainbow button on initial load if on emoji page (single entry point)
setTimeout(() => {
  if (isOnEmojiPage()) {
    injectRainbowSyncButton();
  }
}, 1000);

// Also check when the URL changes (for SPAs)
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    hasCheckedEmojiPage = false; // Reset for new page
    checkEmojiPage();

    // Handle rainbow button based on page - cleanup first, then inject if needed
    removeRainbowSyncButton(); // Always cleanup old observer/state first
    if (isOnEmojiPage()) {
      setTimeout(() => injectRainbowSyncButton(), 500);
    }
  }
}, 1000);

function extractDataFromHeaders(headers, url) {
  const data = {
    workspace: extractWorkspace(),
    token: null,
    cookie: null,
    teamId: null,
    xId: null,
    authHeaders: headers // Store the full headers object
  };
  
  // Try different token patterns
  if (headers.authorization) {
    const tokenMatch = headers.authorization.match(/Bearer\s+(xox[a-zA-Z]-[\w-]+)/);
    if (tokenMatch) {
      data.token = tokenMatch[1];
    }
  }
  
  // Store the full cookie header
  if (headers.cookie) {
    data.cookie = headers.cookie;
    
    // Also try to extract token from cookies
    const cookies = headers.cookie.split(/;\s*/);
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      
      // The Slack 'd' cookie contains the authentication token
      if (name === 'd' && value) {
        console.log('Found d cookie:', value.substring(0, 20) + '...');
        // The d cookie value might be the token itself
        if (value.startsWith('xox')) {
          console.log('d cookie starts with xox');
          if (!data.token) {
            data.token = value;
          }
        } else {
          // Try to decode if URL encoded
          try {
            const decodedValue = decodeURIComponent(value);
            console.log('Decoded d cookie:', decodedValue.substring(0, 20) + '...');
            if (decodedValue.startsWith('xox')) {
              console.log('Decoded d cookie is a token!');
              if (!data.token) {
                data.token = decodedValue;
              }
            }
          } catch (e) {
            console.log('Failed to decode d cookie:', e);
          }
        }
      }
      
      // Extract team ID
      if (name === 'team_id' && value) {
        data.teamId = value;
      }
    }
  }
  
  // Extract X-Slack headers
  Object.keys(headers).forEach(key => {
    if (key.startsWith('x-slack-')) {
      if (key === 'x-slack-client-request-id') {
        data.xId = headers[key];
      }
    }
  });
  
  // Also try to extract xId from request URL if not found in headers
  if (!data.xId && url) {
    const xIdMatch = url.match(/_x_id=([^&]+)/);
    if (xIdMatch) {
      data.xId = xIdMatch[1];
    }
  }
  
  return data;
}

function installSafariTokenCapture() {
  if (safariFallbackInstalled) {
    return;
  }
  safariFallbackInstalled = true;

  function safariCaptureBootstrap(endpoints) {
    if (window.__emojiStudioSafariCaptureInstalled) {
      return;
    }
    window.__emojiStudioSafariCaptureInstalled = true;

    const interestingEndpoints = Array.isArray(endpoints) ? endpoints : [];

    const shouldInspect = (url) => {
      if (!url || typeof url !== 'string') {
        return false;
      }
      return interestingEndpoints.some((endpoint) => url.includes(endpoint));
    };

    const normalizeToken = (value) => {
      if (!value || typeof value !== 'string') {
        return null;
      }
      let token = value.trim();
      if (!token) {
        return null;
      }
      try {
        token = decodeURIComponent(token);
      } catch (error) {}
      return token.startsWith('xox') ? token : null;
    };

    const recordEntry = (params, tokens, key, value) => {
      if (!key) {
        return;
      }
      let stringValue = null;
      if (typeof value === 'string') {
        stringValue = value;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        stringValue = String(value);
      } else if (value && typeof value === 'object') {
        if (typeof Blob !== 'undefined' && value instanceof Blob) {
          return;
        }
        if (typeof value.toString === 'function') {
          stringValue = value.toString();
        }
      }
      if (!stringValue) {
        return;
      }
      if (!(key in params)) {
        params[key] = stringValue;
      }
      const normalized = normalizeToken(stringValue);
      if (normalized) {
        tokens.push(normalized);
      }
    };

    const parseBody = (body) => {
      const params = {};
      const tokens = [];

      if (!body) {
        return { params, tokens };
      }

      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        for (const [key, value] of body.entries()) {
          recordEntry(params, tokens, key, value);
        }
        return { params, tokens };
      }

      if (body instanceof URLSearchParams) {
        for (const [key, value] of body.entries()) {
          recordEntry(params, tokens, key, value);
        }
        return { params, tokens };
      }

      if (typeof body === 'string') {
        let parsed = false;
        try {
          const search = new URLSearchParams(body);
          for (const [key, value] of search.entries()) {
            parsed = true;
            recordEntry(params, tokens, key, value);
          }
        } catch (error) {}
        if (!parsed) {
          try {
            const json = JSON.parse(body);
            if (json && typeof json === 'object') {
              Object.keys(json).forEach((key) => {
                recordEntry(params, tokens, key, json[key]);
              });
              parsed = true;
            }
          } catch (error) {}
        }
        if (!parsed) {
          recordEntry(params, tokens, 'raw_body', body);
        }
        return { params, tokens };
      }

      if (typeof body === 'object') {
        try {
          Object.keys(body).forEach((key) => {
            recordEntry(params, tokens, key, body[key]);
          });
        } catch (error) {}
      }

      return { params, tokens };
    };

    const recentlyNotified = new Map();

    const notifyCapture = (url, parsed) => {
      if (!parsed) {
        return;
      }
      const tokens = (parsed.tokens || []).map(normalizeToken).filter(Boolean);
      if (!tokens.length) {
        return;
      }
      const primaryToken = tokens.find((token) => token.startsWith('xoxc')) || tokens[0];
      if (!primaryToken) {
        return;
      }
      const key = `${primaryToken}::${url}`;
      const now = Date.now();
      const last = recentlyNotified.get(key);
      if (last && (now - last) < 500) {
        return;
      }
      recentlyNotified.set(key, now);

      window.postMessage({
        type: 'SLACK_TOKEN_CAPTURED',
        token: primaryToken,
        url: url,
        params: parsed.params || {}
      }, '*');
    };

    if (typeof window.fetch === 'function') {
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        try {
          const requestInfo = (input && typeof input === 'object' && 'url' in input) ? input.url : input;
          const url = typeof requestInfo === 'string' ? requestInfo : (requestInfo ? String(requestInfo) : '');
          const method = (init && init.method) || (input && typeof input === 'object' && input.method) || 'GET';

          if (shouldInspect(url) && method && method.toUpperCase() === 'POST') {
            let parsed = null;

            if (init && init.body) {
              parsed = parseBody(init.body);
              if (parsed.tokens.length) {
                notifyCapture(url, parsed);
              }
            }

            if ((!parsed || !parsed.tokens.length) && typeof Request !== 'undefined' && input instanceof Request) {
              try {
                const clone = input.clone();
                clone.text().then((text) => {
                  const clonedParsed = parseBody(text);
                  if (clonedParsed.tokens.length) {
                    notifyCapture(url, clonedParsed);
                  }
                }).catch(() => {});
              } catch (error) {}
            }
          }
        } catch (error) {
          console.error('[Emoji Studio] Safari fetch fallback error', error);
        }
        return originalFetch.apply(this, arguments);
      };
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url) {
        this.__emojiStudioInfo = { method, url };
        return originalOpen.apply(this, arguments);
      };

      XMLHttpRequest.prototype.send = function(body) {
        try {
          const info = this.__emojiStudioInfo || {};
          if (info.url && shouldInspect(info.url) && (!info.method || info.method.toUpperCase() === 'POST')) {
            const parsed = parseBody(body);
            if (parsed.tokens.length) {
              notifyCapture(info.url, parsed);
            }
          }
        } catch (error) {
          console.error('[Emoji Studio] Safari xhr fallback error', error);
        }
        return originalSend.apply(this, arguments);
      };
    }
  }

  const script = document.createElement('script');
  script.setAttribute('data-emoji-studio', 'safari-fallback');
  script.textContent = `(${safariCaptureBootstrap.toString()})(${JSON.stringify(SAFARI_CAPTURE_ENDPOINTS)});`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

function handleSafariTokenMessage(event) {
  if (!shouldUseSafariFallbackCapture) {
    return;
  }
  if (event.source !== window) {
    return;
  }

  const data = event.data;
  if (!data || data.type !== 'SLACK_TOKEN_CAPTURED') {
    return;
  }

  const workspace = extractWorkspace();
  if (!workspace) {
    return;
  }

  const params = data.params || {};
  const tokens = new Set();
  const addToken = (candidate) => {
    const normalized = normalizeSlackToken(candidate);
    if (normalized) {
      tokens.add(normalized);
    }
  };

  addToken(data.token);
  Object.values(params).forEach(addToken);

  if (tokens.size === 0) {
    return;
  }

  let primaryToken = null;
  let formToken = null;
  for (const token of tokens) {
    if (!primaryToken) {
      primaryToken = token;
    }
    if (!formToken && token.startsWith('xoxc')) {
      formToken = token;
    }
  }
  if (formToken) {
    primaryToken = formToken;
  }

  if (!primaryToken) {
    return;
  }

  const cookie = document.cookie || '';
  let teamId = params.team_id || params.team || null;
  if (!teamId && cookie) {
    const teamIdMatch = cookie.match(/team_id=([^;]+)/);
    if (teamIdMatch) {
      teamId = teamIdMatch[1];
    }
  }

  let xId = params._x_id || params.x_id || null;
  if (!xId && data.url) {
    const xIdMatch = data.url.match(/_x_id=([^&]+)/);
    if (xIdMatch) {
      xId = xIdMatch[1];
    }
  }

  const slackRoute = params.slack_route || teamId || null;

  const authData = {
    workspace,
    token: primaryToken,
    cookie,
    teamId,
    xId,
    formToken: formToken || (primaryToken.startsWith('xoxc') ? primaryToken : null),
    capturedFromAPI: true,
    requestUrl: data.url || null,
    slackRoute,
    fallbackSource: 'safari-injected'
  };

  const workspaceKey = `${workspace}_${primaryToken.substring(0, 10)}`;
  const now = Date.now();
  if (lastSafariCaptureKey === workspaceKey && (now - lastSafariCaptureTime) < 3000) {
    return;
  }
  lastSafariCaptureKey = workspaceKey;
  lastSafariCaptureTime = now;
  lastCapturedWorkspace = workspaceKey;
  lastCaptureTime = now;

  try {
    chrome.runtime.sendMessage({
      type: 'SLACK_DATA_CAPTURED',
      data: authData
    });
  } catch (error) {
    console.error('[Emoji Studio] Failed to send Safari capture', error);
  }
}

if (shouldUseSafariFallbackCapture && !safariListenerAttached) {
  installSafariTokenCapture();
  window.addEventListener('message', handleSafariTokenMessage, false);
  safariListenerAttached = true;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === 'INTERCEPT_REQUEST') {
    pendingRequests.set(request.requestId, {
      url: request.url,
      timestamp: Date.now(),
      formToken: request.formToken
    });
    if (request.formToken) {
      console.log('Stored pending request with form token:', request.formToken.substring(0, 15) + '...');
    }
  } else if (request.type === 'CAPTURE_HEADERS') {
    const pendingRequest = pendingRequests.get(request.requestId);
    if (pendingRequest) {
      const data = extractDataFromHeaders(request.headers, request.url);
      
      // Store form token separately and use it if no other token found
      if (request.formToken) {
        console.log('Processing form token:', request.formToken.substring(0, 15) + '...');
        // Try to decode the form token if it's URL encoded
        let decodedFormToken = request.formToken;
        try {
          decodedFormToken = decodeURIComponent(request.formToken);
        } catch (e) {
          // Use original if decoding fails
        }
        
        data.formToken = decodedFormToken;
        if (!data.token) {
          console.log('Using form token as main token');
          data.token = decodedFormToken;
        }
      } else if (pendingRequest.formToken) {
        // Check if form token was stored in pending request
        console.log('Using form token from pending request:', pendingRequest.formToken.substring(0, 15) + '...');
        data.formToken = pendingRequest.formToken;
        if (!data.token) {
          data.token = pendingRequest.formToken;
        }
      }
      
      
      // Log what we captured for debugging
      console.log('Captured Slack data:', {
        workspace: data.workspace,
        hasToken: !!data.token,
        tokenType: data.token ? data.token.substring(0, 4) : 'none',
        hasCookie: !!data.cookie,
        hasFormToken: !!data.formToken,
        formTokenType: data.formToken ? data.formToken.substring(0, 4) : 'none'
      });
      
      // Always prefer formToken over cookie token
      if (data.formToken && data.formToken.startsWith('xoxc')) {
        console.log('Using formToken as primary token');
        data.token = data.formToken;
      }
      
      if (data.token && data.workspace) {
        // Check if we've already captured data for this workspace recently
        const now = Date.now();
        const workspaceKey = `${data.workspace}_${data.token.substring(0, 10)}`;
        
        if (lastCapturedWorkspace === workspaceKey && (now - lastCaptureTime) < 5000) {
          pendingRequests.delete(request.requestId);
          return;
        }
        
        lastCapturedWorkspace = workspaceKey;
        lastCaptureTime = now;
        
        
        chrome.runtime.sendMessage({
          type: 'SLACK_DATA_CAPTURED',
          data: data
        }).then((response) => {
          
          // Verify data was saved by checking storage
          chrome.storage.local.get('slackData', (result) => {
            if (result.slackData) {
              console.log('[Emoji Studio Extension] Data saved successfully');
            }
          });
          // Rainbow button is now persistent on the page, no need for transient notification
        }).catch(err => {
          console.error('[Emoji Studio Extension] Error sending data:', err);
        });
      } else if (data.workspace && !data.token) {
        chrome.runtime.sendMessage({
          type: 'SLACK_AUTH_FAILED',
          workspace: data.workspace
        });
      } else {
      }
      
      pendingRequests.delete(request.requestId);
    }
  }
  
  return true; // Keep message channel open
});

// Clean up old pending requests
setInterval(() => {
  const now = Date.now();
  for (const [id, request] of pendingRequests.entries()) {
    if (now - request.timestamp > 30000) {
      pendingRequests.delete(id);
    }
  }
}, 10000);

// ============================================================================
// EMOJI REACTION HOVER POPOVER FEATURE
// Shows emoji details when hovering over reactions in Slack
// ============================================================================

// Global settings for Slack app features
let slackAppSettings = { emojiTooltipEnabled: true, bulkReactEnabled: true };

// Global reference to bulk reaction manager for settings updates
let bulkReactionManagerInstance = null;

// Load settings from storage
async function loadSlackAppSettings() {
  try {
    const result = await chrome.storage.local.get('slackAppSettings');
    const stored = result.slackAppSettings || {};
    // Merge with defaults to ensure all properties exist
    slackAppSettings = {
      emojiTooltipEnabled: stored.emojiTooltipEnabled !== false, // default true
      bulkReactEnabled: stored.bulkReactEnabled !== false // default true
    };
    console.log('[Emoji Studio] Loaded Slack app settings:', slackAppSettings);
  } catch (e) {
    console.log('[Emoji Studio] Using default settings');
  }
}

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.slackAppSettings) {
    const oldSettings = { ...slackAppSettings };
    const newValue = changes.slackAppSettings.newValue || {};
    // Merge with defaults to ensure all properties exist
    slackAppSettings = {
      emojiTooltipEnabled: newValue.emojiTooltipEnabled !== false,
      bulkReactEnabled: newValue.bulkReactEnabled !== false
    };
    console.log('[Emoji Studio] Settings updated:', slackAppSettings);

    // If bulk react was disabled, remove all existing bulk buttons
    if (oldSettings.bulkReactEnabled && !slackAppSettings.bulkReactEnabled) {
      document.querySelectorAll('.emoji-studio-bulk-btn, .emoji-studio-bulk-btn-inline').forEach(btn => btn.remove());
      // Clear processed sets so buttons can be re-injected when re-enabled
      if (bulkReactionManagerInstance?.inlineButtonInjector) {
        bulkReactionManagerInstance.inlineButtonInjector.clearProcessedSets();
      }
      console.log('[Emoji Studio] Removed bulk reaction buttons');
    }

    // If tooltip was disabled, hide any visible popover
    if (oldSettings.emojiTooltipEnabled && !slackAppSettings.emojiTooltipEnabled) {
      const popover = document.getElementById('emoji-studio-reaction-popover');
      if (popover) popover.remove();
      console.log('[Emoji Studio] Removed emoji tooltip');
    }
  }
});

// Emoji Lookup Service - retrieves emoji data from chrome.storage
class EmojiLookupService {
  constructor() {
    this.emojiCache = new Map();
    this.workspaceId = null;
    this.lastLoadTime = 0;
    this.CACHE_TTL = 60000; // 1 minute
  }

  async loadEmojiData() {
    const now = Date.now();

    // Use cache if fresh
    if (this.emojiCache.size > 0 && (now - this.lastLoadTime) < this.CACHE_TTL) {
      return;
    }

    try {
      const result = await chrome.storage.local.get(['emojiStudioSyncData', 'slackData']);

      // Try synced data first
      let emojiData = result.emojiStudioSyncData?.emojiData || [];
      this.workspaceId = result.emojiStudioSyncData?.workspace;

      // Fall back to raw captured data if no synced data
      if (emojiData.length === 0 && result.slackData) {
        const workspaces = Object.keys(result.slackData);
        for (const workspace of workspaces) {
          const wsData = result.slackData[workspace];
          if (wsData.emoji && Array.isArray(wsData.emoji) && wsData.emoji.length > 0) {
            emojiData = wsData.emoji;
            this.workspaceId = workspace;
            break;
          }
        }
      }

      // Build lookup cache
      this.emojiCache.clear();
      for (const emoji of emojiData) {
        if (emoji && emoji.name) {
          this.emojiCache.set(emoji.name.toLowerCase(), emoji);
        }
      }

      this.lastLoadTime = now;
      console.log(`[Emoji Studio] Loaded ${this.emojiCache.size} emojis for hover lookup`);
    } catch (error) {
      console.error('[Emoji Studio] Failed to load emoji data for hover:', error);
    }
  }

  async lookup(emojiName) {
    await this.loadEmojiData();
    const normalizedName = emojiName.toLowerCase().replace(/:/g, '');
    return this.emojiCache.get(normalizedName) || null;
  }

  invalidateCache() {
    this.lastLoadTime = 0;
  }
}

// Reaction Hover Popover - shows emoji info when hovering over reactions
class ReactionHoverPopover {
  constructor(lookupService) {
    this.lookupService = lookupService;
    this.popover = null;
    this.currentReaction = null;
    this.hideTimeout = null;
    this.showTimeout = null;
    this.isOverReaction = false;
    this.isOverPopover = false;
    this.lastMousePos = { x: 0, y: 0 };
    this.init();
  }

  init() {
    this.injectStyles();
    this.attachEventListeners();
    console.log('[Emoji Studio] Reaction hover popover initialized');
  }

  injectStyles() {
    if (document.getElementById('emoji-studio-popover-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'emoji-studio-popover-styles';
    styles.textContent = `
      #emoji-studio-reaction-popover {
        position: fixed;
        background: #1a1d21;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding: 12px;
        z-index: 999999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.25);
        font-size: 12px;
        min-width: 180px;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }

      #emoji-studio-reaction-popover:hover {
        background: #222529;
      }

      .emoji-studio-popover-creator {
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 4px;
      }

      .emoji-studio-popover-date {
        color: rgba(255, 255, 255, 0.5);
        margin-bottom: 8px;
      }

      .emoji-studio-popover-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: #1d9bd1;
        text-decoration: none;
        font-size: 12px;
      }

      #emoji-studio-reaction-popover:hover .emoji-studio-popover-link {
        text-decoration: underline;
      }

      .emoji-studio-popover-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 4px;
      }

      .emoji-studio-popover-icon {
        width: 16px;
        height: 16px;
        opacity: 0.5;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(styles);
  }

  attachEventListeners() {
    // Track mouse position for defensive hide checks
    document.addEventListener('mousemove', (e) => {
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }, { passive: true });

    // Use event delegation on document body for reaction buttons
    document.body.addEventListener('mouseenter', (e) => {
      const reaction = e.target.closest('.c-reaction_bar__reaction, .c-reaction, [data-qa="reaction"]');
      if (reaction) {
        this.handleReactionEnter(reaction, e);
      }
    }, true);

    document.body.addEventListener('mouseleave', (e) => {
      const reaction = e.target.closest('.c-reaction_bar__reaction, .c-reaction, [data-qa="reaction"]');
      if (reaction) {
        this.handleReactionLeave(e);
      }
    }, true);
  }

  handleReactionEnter(reaction, event) {
    // Check if emoji tooltip is enabled (only skip if explicitly disabled)
    if (slackAppSettings.emojiTooltipEnabled === false) return;

    this.isOverReaction = true;

    // Clear any pending hide
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Clear any pending show (in case user moved between reactions)
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    // Extract emoji name from reaction
    const emojiName = this.extractEmojiFromReaction(reaction);
    if (!emojiName) return;

    // Delay showing popover to avoid overlap with Slack's native tooltip
    this.showTimeout = setTimeout(async () => {
      // Look up emoji data
      const emojiData = await this.lookupService.lookup(emojiName);
      if (!emojiData) return;

      this.currentReaction = reaction;
      this.showPopover(emojiData, emojiName, reaction);
    }, 400);
  }

  handleReactionLeave(e) {
    this.isOverReaction = false;

    // Clear show timeout if user leaves before popover appears
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }

    // Check if mouse is moving TO our popover - if so, don't hide
    const relatedTarget = e?.relatedTarget;
    if (relatedTarget && this.popover && (this.popover.contains(relatedTarget) || this.popover === relatedTarget)) {
      this.isOverPopover = true;
      return;
    }

    // Only start hide timeout if not currently over popover
    // Use longer timeout to give user time to move to popover
    if (!this.isOverPopover) {
      this.hideTimeout = setTimeout(() => {
        this.hidePopover();
      }, 500);
    }
  }

  extractEmojiFromReaction(reaction) {
    // Try various ways to get emoji name from reaction element

    // Method 1: data-emoji attribute
    const dataEmoji = reaction.getAttribute('data-emoji');
    if (dataEmoji) return dataEmoji.replace(/:/g, '');

    // Method 2: aria-label containing emoji name
    const ariaLabel = reaction.getAttribute('aria-label');
    if (ariaLabel) {
      const match = ariaLabel.match(/:([^:\s]+):/);
      if (match) return match[1];
    }

    // Method 3: img with alt or data-stringify-emoji
    const img = reaction.querySelector('img');
    if (img) {
      const stringify = img.getAttribute('data-stringify-emoji');
      if (stringify) return stringify.replace(/:/g, '');

      const alt = img.getAttribute('alt');
      if (alt) {
        const match = alt.match(/:?([^:\s]+):?/);
        if (match) return match[1].replace(/:/g, '');
      }
    }

    // Method 4: span with emoji name class or text
    const spans = reaction.querySelectorAll('span');
    for (const span of spans) {
      const text = span.textContent;
      if (text && text.match(/^:[^:\s]+:$/)) {
        return text.replace(/:/g, '');
      }
    }

    return null;
  }

  showPopover(emojiData, emojiName, reaction) {
    // Remove existing popover
    this.hidePopover();

    // Format date
    let dateStr = '';
    if (emojiData.created) {
      const date = new Date(emojiData.created * 1000);
      dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }

    const emojiUrl = `https://app.emojistudio.xyz/emoji/${encodeURIComponent(emojiName)}?from=extension`;

    // Create popover
    this.popover = document.createElement('div');
    this.popover.id = 'emoji-studio-reaction-popover';
    this.popover.innerHTML = `
      <div class="emoji-studio-popover-creator">Created by ${emojiData.user_display_name || 'Unknown'}</div>
      ${dateStr ? `<div class="emoji-studio-popover-date">Added ${dateStr}</div>` : ''}
      <div class="emoji-studio-popover-footer">
        <div class="emoji-studio-popover-link">
          Open in Emoji Studio
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 17L17 7M17 7H7M17 7V17"/>
          </svg>
        </div>
        <img src="${chrome.runtime.getURL('logo.png')}" class="emoji-studio-popover-icon" alt="Emoji Studio" />
      </div>
    `;

    // Get reaction position
    const rect = reaction.getBoundingClientRect();

    // Click handler
    this.popover.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.open(emojiUrl, '_blank');
      this.hidePopover();
    });

    // Keep popover visible when hovering over it
    this.popover.addEventListener('mouseenter', () => {
      this.isOverPopover = true;
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
      if (this.showTimeout) {
        clearTimeout(this.showTimeout);
        this.showTimeout = null;
      }
    });

    this.popover.addEventListener('mouseleave', () => {
      this.isOverPopover = false;
      // Start hide timeout - hidePopover() will verify mouse position defensively
      this.hideTimeout = setTimeout(() => this.hidePopover(), 150);
    });

    document.body.appendChild(this.popover);

    // Center the popover under the reaction after it's rendered
    const popoverRect = this.popover.getBoundingClientRect();
    const centeredLeft = rect.left + (rect.width / 2) - (popoverRect.width / 2);
    this.popover.style.left = `${Math.max(8, centeredLeft)}px`;
    this.popover.style.top = `${rect.bottom + 4}px`; // Small gap to stay connected
  }

  hidePopover() {
    // Clear any pending timeouts
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // DEFENSIVE CHECK: Verify mouse is NOT over popover before hiding
    if (this.popover) {
      const elementAtMouse = document.elementFromPoint(
        this.lastMousePos.x,
        this.lastMousePos.y
      );
      if (elementAtMouse && (this.popover.contains(elementAtMouse) || elementAtMouse === this.popover)) {
        // Mouse is still over popover - don't hide, reschedule check
        this.hideTimeout = setTimeout(() => this.hidePopover(), 200);
        return;
      }
    }

    if (this.popover) {
      this.popover.remove();
      this.popover = null;
    }
    this.currentReaction = null;
    this.isOverPopover = false;
  }

  stop() {
    this.hidePopover();
  }
}

// ============================================================================
// EMOJI PICKER "MY EMOJIS" TAB INJECTION
// Adds a custom tab to Slack's emoji picker showing user's own emojis
// ============================================================================

class EmojiPickerInjector {
  constructor(lookupService) {
    this.lookupService = lookupService;
    this.observer = null;
    this.injectedPickers = new WeakSet();
    this.myEmojisCache = null;
    this.lastCacheTime = 0;
    this.CACHE_TTL = 60000; // 1 minute

    this.PICKER_SELECTORS = {
      tabMenu: '.p-emoji_picker__group_tabs-menu, [data-qa="tabs_full_width_class"]',
      tabButton: '.c-button-unstyled.p-emoji_picker__group_tab',
      customTab: '[data-qa="emoji_group_tab_slack-logo"]',
      pickerContainer: '.p-emoji_picker, [class*="emoji_picker"]'
    };
  }

  init() {
    this.injectStyles();
    this.startObserver();
    console.log('[Emoji Studio] Emoji picker tab injector initialized');
  }

  startObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanForEmojiPickers(node);
            }
          });
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan for any existing pickers
    this.scanForEmojiPickers(document.body);
  }

  scanForEmojiPickers(container) {
    if (!container.querySelectorAll) return;

    const tabMenus = container.querySelectorAll(this.PICKER_SELECTORS.tabMenu);
    tabMenus.forEach(tabMenu => {
      if (!this.injectedPickers.has(tabMenu)) {
        this.injectedPickers.add(tabMenu);
        this.injectMyEmojisTab(tabMenu);
      }
    });

    // Also check if container itself matches
    if (container.matches && container.matches(this.PICKER_SELECTORS.tabMenu)) {
      if (!this.injectedPickers.has(container)) {
        this.injectedPickers.add(container);
        this.injectMyEmojisTab(container);
      }
    }
  }

  injectMyEmojisTab(tabMenu) {
    // Find the custom emoji tab to insert before it
    const customTab = tabMenu.querySelector(this.PICKER_SELECTORS.customTab);
    if (!customTab) return;

    // Check if already injected
    if (tabMenu.querySelector('[data-qa="emoji_group_tab_my_emojis"]')) return;

    // Create the new tab button matching Slack's structure
    const myEmojisTab = document.createElement('button');
    myEmojisTab.className = 'c-button-unstyled p-emoji_picker__group_tab emoji-studio-my-emojis-tab c-tabs__tab js-tab';
    myEmojisTab.setAttribute('data-qa', 'emoji_group_tab_my_emojis');
    myEmojisTab.setAttribute('id', 'my-emojis-emoji-tab');
    myEmojisTab.setAttribute('aria-label', 'My Emojis');
    myEmojisTab.setAttribute('aria-selected', 'false');
    myEmojisTab.setAttribute('role', 'tab');
    myEmojisTab.setAttribute('tabindex', '-1');
    myEmojisTab.setAttribute('type', 'button');
    myEmojisTab.innerHTML = `
      <span class="c-tabs__tab_content">
        <svg data-qa="star" aria-hidden="true" viewBox="0 0 20 20" style="width: 20px; height: 20px;">
          <path fill="currentColor" d="M10 1l2.39 5.645 6.11.585-4.615 4.035L15.245 17 10 13.88 4.755 17l1.36-5.735L1.5 7.23l6.11-.585L10 1z"/>
        </svg>
      </span>
    `;
    myEmojisTab.title = 'My Emojis';

    // Store reference to picker container
    const pickerContainer = tabMenu.closest(this.PICKER_SELECTORS.pickerContainer);
    myEmojisTab._pickerContainer = pickerContainer;
    myEmojisTab._tabMenu = tabMenu;

    // Add click handler
    myEmojisTab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleMyEmojisTabClick(tabMenu, myEmojisTab);
    });

    // Insert before custom tab
    tabMenu.insertBefore(myEmojisTab, customTab);

    // Setup listeners for native tab clicks to restore state
    this.setupNativeTabListeners(tabMenu, myEmojisTab);

    console.log('[Emoji Studio] My Emojis tab injected into emoji picker');
  }

  setupNativeTabListeners(tabMenu, myEmojisTab) {
    const nativeTabs = tabMenu.querySelectorAll(
      this.PICKER_SELECTORS.tabButton + ':not(.emoji-studio-my-emojis-tab)'
    );

    nativeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.handleNativeTabClick(tabMenu, myEmojisTab);
      }, true);
    });
  }

  handleNativeTabClick(tabMenu, myEmojisTab) {
    // Deselect my emojis tab
    myEmojisTab.classList.remove('p-emoji_picker__group_tab--active', 'c-tabs__tab--active');
    myEmojisTab.setAttribute('aria-selected', 'false');

    // Remove our overlay container
    const customContainers = document.querySelectorAll('.emoji-studio-my-emojis-container');
    customContainers.forEach(c => c.remove());

    // Restore hidden native content
    const hiddenElements = document.querySelectorAll('[data-hidden-by-emoji-studio]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-hidden-by-emoji-studio');
    });
  }

  async handleMyEmojisTabClick(tabMenu, myEmojisTab) {
    // Re-find the picker container at click time (it might have changed)
    const pickerContainer = tabMenu.closest(this.PICKER_SELECTORS.pickerContainer)
                           || document.querySelector(this.PICKER_SELECTORS.pickerContainer);
    if (!pickerContainer) {
      console.log('[Emoji Studio] Could not find picker container');
      return;
    }
    console.log('[Emoji Studio] handleMyEmojisTabClick - found picker:', pickerContainer.className);

    // Deselect all native tabs
    const allTabs = tabMenu.querySelectorAll(this.PICKER_SELECTORS.tabButton);
    allTabs.forEach(tab => {
      tab.classList.remove('p-emoji_picker__group_tab--active', 'c-tabs__tab--active');
      tab.setAttribute('aria-selected', 'false');
    });

    // Activate my emojis tab
    myEmojisTab.classList.add('p-emoji_picker__group_tab--active', 'c-tabs__tab--active');
    myEmojisTab.setAttribute('aria-selected', 'true');

    // Show my emojis content
    await this.showMyEmojisContent(pickerContainer);
  }

  async showMyEmojisContent(pickerContainer) {
    console.log('[Emoji Studio] showMyEmojisContent called');

    // Remove any existing custom container and restore hidden elements
    const existingContainers = document.querySelectorAll('.emoji-studio-my-emojis-container');
    existingContainers.forEach(c => c.remove());

    const hiddenElements = document.querySelectorAll('[data-hidden-by-emoji-studio]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-hidden-by-emoji-studio');
    });

    // Get my emojis
    const myEmojis = await this.getMyEmojis();
    console.log('[Emoji Studio] My emojis count:', myEmojis ? myEmojis.length : 0);

    // Create our custom content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'emoji-studio-my-emojis-container';

    if (!myEmojis || myEmojis.length === 0) {
      contentContainer.innerHTML = this.getEmptyState();
    } else {
      contentContainer.innerHTML = this.renderEmojiGrid(myEmojis);
      this.attachEmojiClickHandlers(contentContainer);
    }

    // Target the emoji list and its inner content
    const emojiList = document.querySelector('#emoji-picker-list');

    if (emojiList) {
      // Hide ALL direct children of the emoji list (the virtualized content)
      Array.from(emojiList.children).forEach(child => {
        child.style.display = 'none';
        child.setAttribute('data-hidden-by-emoji-studio', 'true');
      });

      // Hide the sticky header that's outside #emoji-picker-list
      // Walk up from emojiList until we find an element with a previous sibling
      let listContainer = emojiList;
      while (listContainer.parentElement) {
        if (listContainer.previousElementSibling) {
          // Found a previous sibling - this is likely the header section
          listContainer.previousElementSibling.style.display = 'none';
          listContainer.previousElementSibling.setAttribute('data-hidden-by-emoji-studio', 'true');
          console.log('[Emoji Studio] Hid sticky header sibling');
          break;
        }
        listContainer = listContainer.parentElement;
      }

      // Add our container as content
      emojiList.appendChild(contentContainer);
      console.log('[Emoji Studio] Inserted container, hid all native content');
    } else {
      console.log('[Emoji Studio] Could not find #emoji-picker-list');
    }
  }

  async getMyEmojis() {
    const now = Date.now();

    // Use cache if fresh
    if (this.myEmojisCache && (now - this.lastCacheTime) < this.CACHE_TTL) {
      return this.myEmojisCache;
    }

    // Load emoji data using existing EmojiLookupService
    await this.lookupService.loadEmojiData();

    // Filter for "my emojis" - same logic as Emoji Studio web app
    const allEmojis = Array.from(this.lookupService.emojiCache.values());
    this.myEmojisCache = allEmojis.filter(emoji => {
      return emoji.can_delete === true && emoji.is_alias !== 1 && !emoji.is_alias;
    });

    // Sort by creation date (newest first)
    this.myEmojisCache.sort((a, b) => (b.created || 0) - (a.created || 0));

    this.lastCacheTime = now;
    console.log(`[Emoji Studio] Loaded ${this.myEmojisCache.length} "my emojis" for picker`);
    return this.myEmojisCache;
  }

  renderEmojiGrid(emojis) {
    return `
      <div class="emoji-studio-my-emojis-header">
        <span class="emoji-studio-my-emojis-title">My Emojis</span>
        <span class="emoji-studio-my-emojis-count">${emojis.length} emoji${emojis.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="emoji-studio-my-emojis-grid" role="grid">
        ${emojis.map(emoji => `
          <button class="emoji-studio-emoji-item"
                  data-emoji-name="${emoji.name}"
                  role="gridcell"
                  aria-label=":${emoji.name}:"
                  title=":${emoji.name}:"
                  type="button">
            <img src="${emoji.url}"
                 alt=":${emoji.name}:"
                 class="emoji-studio-emoji-img"
                 loading="lazy" />
          </button>
        `).join('')}
      </div>
    `;
  }

  getEmptyState() {
    const hasData = this.lookupService.emojiCache.size > 0;

    if (!hasData) {
      return `
        <div class="emoji-studio-empty-state">
          <div class="emoji-studio-empty-icon">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/>
            </svg>
          </div>
          <div class="emoji-studio-empty-title">Sync Your Workspace</div>
          <div class="emoji-studio-empty-text">
            Visit your Slack emoji settings to sync your emojis with Emoji Studio
          </div>
        </div>
      `;
    }

    return `
      <div class="emoji-studio-empty-state">
        <div class="emoji-studio-empty-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>
        <div class="emoji-studio-empty-title">No Emojis Yet</div>
        <div class="emoji-studio-empty-text">
          You haven't created any custom emojis in this workspace
        </div>
      </div>
    `;
  }

  attachEmojiClickHandlers(container) {
    const emojiButtons = container.querySelectorAll('.emoji-studio-emoji-item');

    emojiButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const emojiName = button.getAttribute('data-emoji-name');
        const emojiImg = button.querySelector('img');
        const emojiUrl = emojiImg ? emojiImg.src : null;

        // Check if bulk mode is active
        if (this.bulkReactionManager && this.bulkReactionManager.isActive) {
          // Toggle selection instead of inserting
          button.classList.toggle('selected');
          this.bulkReactionManager.selectEmoji(emojiName, emojiUrl);
        } else {
          this.insertEmoji(emojiName);
        }
      });
    });
  }

  setBulkReactionManager(manager) {
    this.bulkReactionManager = manager;
  }

  insertEmoji(emojiName) {
    console.log('[Emoji Studio] insertEmoji called for:', emojiName);

    // First, restore hidden native content so we can use native picker
    const hiddenElements = document.querySelectorAll('[data-hidden-by-emoji-studio]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      el.removeAttribute('data-hidden-by-emoji-studio');
    });

    // Remove our container
    const ourContainer = document.querySelector('.emoji-studio-my-emojis-container');
    if (ourContainer) {
      ourContainer.remove();
    }

    // Use the search box to find and select the emoji
    // This works because search results aren't virtualized
    const searchInput = document.querySelector(
      '.p-emoji_picker__input input, ' +
      '[data-qa="emoji_picker_search_input"], ' +
      'input[placeholder*="Search"]'
    );

    if (searchInput) {
      console.log('[Emoji Studio] Using search to find emoji');

      // Clear and type the emoji name
      searchInput.value = emojiName;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for search results, then click the matching emoji
      setTimeout(() => {
        const result = document.querySelector(
          `[data-qa="emoji_list_item"][data-name="${emojiName}"], ` +
          `button[data-name="${emojiName}"], ` +
          `#emoji-picker-${emojiName}`
        );
        if (result) {
          console.log('[Emoji Studio] Found emoji in search results, clicking');
          result.click();
        } else {
          console.log('[Emoji Studio] Emoji not found in search results');
          this.closeEmojiPicker();
        }
      }, 150);
      return;
    }

    // Fallback: Insert into message input manually
    console.log('[Emoji Studio] No search input, trying message input');
    const colonName = `:${emojiName}:`;
    const messageInput = document.querySelector(
      '[data-qa="message_input"] .ql-editor, ' +
      '.c-message_kit__input .ql-editor, ' +
      '[contenteditable="true"][data-qa="message-input-field"], ' +
      '.p-message_input_field .ql-editor, ' +
      '.ql-editor[contenteditable="true"]'
    );

    if (messageInput) {
      console.log('[Emoji Studio] Found message input, inserting');
      messageInput.focus();

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = document.createTextNode(colonName);
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        messageInput.textContent += colonName;
      }

      messageInput.dispatchEvent(new Event('input', { bubbles: true }));
      messageInput.dispatchEvent(new Event('change', { bubbles: true }));
      this.closeEmojiPicker();
      return;
    }

    // Last resort: copy to clipboard
    console.log('[Emoji Studio] No input found, copying to clipboard');
    navigator.clipboard.writeText(colonName);
    this.closeEmojiPicker();
  }

  closeEmojiPicker() {
    // Method 1: Click outside to close (simulate clicking the backdrop)
    const backdrop = document.querySelector('.ReactModal__Overlay, .p-emoji_picker__backdrop');
    if (backdrop) {
      backdrop.click();
      return;
    }

    // Method 2: Find and click the close button
    const closeButton = document.querySelector('.p-emoji_picker__close_button, [data-qa="emoji_picker_close_button"]');
    if (closeButton) {
      closeButton.click();
      return;
    }

    // Method 3: Dispatch escape key
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true
    }));
  }

  invalidateCache() {
    this.myEmojisCache = null;
    this.lastCacheTime = 0;
  }

  injectStyles() {
    if (document.getElementById('emoji-studio-picker-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'emoji-studio-picker-styles';
    styles.textContent = `
      /* My Emojis Tab Button */
      .emoji-studio-my-emojis-tab {
        position: relative;
      }

      .emoji-studio-my-emojis-tab.p-emoji_picker__group_tab--active,
      .emoji-studio-my-emojis-tab.c-tabs__tab--active {
        background: var(--sk_highlight, rgba(29, 155, 209, 0.1)) !important;
      }

      /* My Emojis Container - replaces native emoji list content */
      .emoji-studio-my-emojis-container {
        padding: 8px 12px;
        box-sizing: border-box;
        width: 100%;
        max-width: 338px;
        overflow-x: hidden;
      }

      .emoji-studio-my-emojis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 4px;
        margin-bottom: 8px;
        border-bottom: 1px solid var(--sk_foreground_low_solid, #e8e8e8);
      }

      .emoji-studio-my-emojis-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--sk_primary_foreground, #1d1c1d);
      }

      .emoji-studio-my-emojis-count {
        font-size: 12px;
        color: var(--sk_secondary_foreground, #616061);
      }

      /* Emoji Grid - matches Slack's layout */
      .emoji-studio-my-emojis-grid {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        gap: 0;
        width: 100%;
      }

      .emoji-studio-emoji-item {
        width: 100%;
        aspect-ratio: 1;
        max-width: 36px;
        max-height: 36px;
        padding: 4px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.1s ease;
      }

      .emoji-studio-emoji-item:hover {
        background: var(--sk_highlight_hover, rgba(29, 155, 209, 0.1));
      }

      .emoji-studio-emoji-item:active {
        background: var(--sk_highlight_accent, rgba(29, 155, 209, 0.2));
      }

      .emoji-studio-emoji-img {
        width: 28px;
        height: 28px;
        object-fit: contain;
      }

      /* Empty State */
      .emoji-studio-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
        color: var(--sk_secondary_foreground, #616061);
        min-height: 200px;
      }

      .emoji-studio-empty-icon {
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .emoji-studio-empty-icon svg {
        stroke: currentColor;
      }

      .emoji-studio-empty-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--sk_primary_foreground, #1d1c1d);
        margin-bottom: 8px;
      }

      .emoji-studio-empty-text {
        font-size: 13px;
        color: var(--sk_secondary_foreground, #616061);
        max-width: 240px;
        line-height: 1.4;
      }

      /* Dark Mode Support */
      .p-emoji_picker--dark .emoji-studio-my-emojis-container {
        background: var(--sk_primary_background, #1a1d21);
      }

      .p-emoji_picker--dark .emoji-studio-my-emojis-title,
      .p-emoji_picker--dark .emoji-studio-empty-title {
        color: var(--sk_primary_foreground, #d1d2d3);
      }

      .p-emoji_picker--dark .emoji-studio-my-emojis-count,
      .p-emoji_picker--dark .emoji-studio-empty-text {
        color: var(--sk_secondary_foreground, #ababad);
      }

      .p-emoji_picker--dark .emoji-studio-my-emojis-header {
        border-color: var(--sk_foreground_low_solid, #3c3c3d);
      }

      .p-emoji_picker--dark .emoji-studio-emoji-item:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    `;

    document.head.appendChild(styles);
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// ============================================================================
// BULK EMOJI REACTIONS - Inline Button Approach
// Adds a ⚡ button to message toolbars for bulk adding reactions
// ============================================================================

class BulkReactionManager {
  constructor(lookupService, pickerInjector) {
    this.lookupService = lookupService;
    this.pickerInjector = pickerInjector;
    this.isActive = false;
    this.targetMessageEl = null;
    this.targetMessageId = null;
    this.targetChannelId = null;
    this.selectedEmojis = new Map(); // Map<emojiName, emojiUrl>
    this.inlineButtonInjector = null;
    this.isExecuting = false;
  }

  init() {
    this.inlineButtonInjector = new InlineButtonInjector(this);
    this.injectStyles();
    this.inlineButtonInjector.start();
    console.log('[Emoji Studio] Bulk reaction manager initialized');
  }

  injectStyles() {
    if (document.getElementById('emoji-studio-bulk-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'emoji-studio-bulk-styles';
    styles.textContent = `
      /* Inline bulk reaction button in toolbar */
      .emoji-studio-bulk-btn {
        font-size: 15px !important;
        border-radius: 6px !important;
        transition: background-color 0.1s ease !important;
        font-weight: 500 !important;
      }

      .emoji-studio-bulk-btn:hover {
        background-color: var(--sk_foreground_min_solid, rgba(29, 28, 29, 0.13)) !important;
      }

      /* Dark theme */
      .p-theme--dark .emoji-studio-bulk-btn:hover,
      .sk-client-theme--dark .emoji-studio-bulk-btn:hover {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }

      /* Bulk button next to reaction bar below messages - matches c-reaction_add style */
      .emoji-studio-bulk-btn-inline {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        border: 1px solid transparent;
        background: transparent;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        margin-left: 4px;
        vertical-align: middle;
        color: var(--sk_foreground_low, #616061);
        transition: background-color 0.1s ease, border-color 0.1s ease, color 0.1s ease, transform 0.1s ease;
      }

      .emoji-studio-bulk-btn-inline:hover {
        background: var(--sk_highlight_hover, rgba(29, 155, 209, 0.1));
        border-color: var(--sk_foreground_low_solid, #ddd);
      }

      /* Dark theme support */
      .p-theme--dark .emoji-studio-bulk-btn-inline,
      .sk-client-theme--dark .emoji-studio-bulk-btn-inline {
        color: var(--sk_foreground_low, #ababad);
      }

      .p-theme--dark .emoji-studio-bulk-btn-inline:hover,
      .sk-client-theme--dark .emoji-studio-bulk-btn-inline:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: var(--sk_foreground_low_solid, #565856);
      }

      .emoji-studio-bulk-btn:focus-visible,
      .emoji-studio-bulk-btn-inline:focus-visible {
        outline: 2px solid var(--sk_highlight, #1d9bd1);
        outline-offset: 2px;
      }

      /* Emoji multi-select in picker - My Emojis tab */
      .emoji-studio-emoji-item.selected {
        background: rgba(46, 182, 125, 0.3) !important;
        border: 2px solid #2eb67d !important;
        position: relative;
      }

      .emoji-studio-emoji-item.selected::after {
        content: '✓';
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 10px;
        color: #2eb67d;
        font-weight: bold;
      }

      /* Emoji multi-select in picker - Native Slack emojis */
      .emoji-studio-emoji-selected {
        background: rgba(46, 182, 125, 0.3) !important;
        outline: 2px solid #2eb67d !important;
        outline-offset: -2px;
        position: relative;
      }

      .emoji-studio-emoji-selected::after {
        content: '✓';
        position: absolute;
        top: 0;
        right: 0;
        font-size: 10px;
        color: #2eb67d;
        font-weight: bold;
        z-index: 10;
      }

      /* Bulk mode selection bar at bottom of picker */
      .emoji-studio-bulk-bar {
        display: flex;
        flex-direction: column;
        padding: 8px 12px;
        background: #1a1d21;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        gap: 8px;
      }

      .emoji-studio-bulk-bar-count {
        color: rgba(255, 255, 255, 0.7);
        font-size: 13px;
      }

      .emoji-studio-saved-sets-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        min-height: 28px;
      }

      .emoji-studio-saved-sets-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        flex-shrink: 0;
      }

      .emoji-studio-saved-sets-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        flex: 1;
        overflow-x: auto;
      }

      .emoji-studio-saved-set-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
      }

      .emoji-studio-saved-set-chip:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .emoji-studio-saved-set-chip .set-count {
        color: rgba(255, 255, 255, 0.5);
      }

      .emoji-studio-saved-set-chip .delete-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        font-size: 10px;
        line-height: 1;
        transition: background 0.15s;
      }

      .emoji-studio-saved-set-chip .delete-btn:hover {
        background: #e53935;
        color: white;
      }

      .emoji-studio-saved-sets-empty {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.3);
        font-style: italic;
      }

      .emoji-studio-bulk-bar-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
        justify-content: flex-end;
      }

      .emoji-studio-bulk-bar-btn {
        padding: 6px 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
      }

      .emoji-studio-bulk-bar-btn.primary {
        background: #2eb67d;
        color: white;
      }

      .emoji-studio-bulk-bar-btn.primary:hover {
        background: #27a06d;
      }

      .emoji-studio-bulk-bar-btn.primary:disabled {
        background: #555;
        cursor: not-allowed;
      }

      .emoji-studio-bulk-bar-btn.secondary {
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
      }

      .emoji-studio-bulk-bar-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      /* Emoji chips container */
      .emoji-studio-bulk-bar-emojis {
        display: flex;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 4px;
        padding: 2px 0;
        max-height: 72px;
        overflow-y: auto;
        width: 100%;
      }

      .emoji-studio-limit-warning {
        color: #e8912d;
        font-size: 11px;
        padding: 4px 8px;
        background: rgba(232, 145, 45, 0.15);
        border-radius: 4px;
        white-space: nowrap;
      }

      /* Individual emoji chip */
      .emoji-studio-emoji-chip {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        cursor: pointer;
        flex-shrink: 0;
        transition: background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
      }

      .emoji-studio-emoji-chip:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .emoji-studio-emoji-chip img {
        width: 20px;
        height: 20px;
        object-fit: contain;
      }

      .emoji-studio-emoji-chip::after {
        content: '×';
        position: absolute;
        top: -4px;
        right: -4px;
        width: 14px;
        height: 14px;
        background: #e01e5a;
        color: white;
        font-size: 10px;
        line-height: 14px;
        text-align: center;
        border-radius: 50%;
        opacity: 0;
        transition: opacity 0.15s ease;
      }

      .emoji-studio-emoji-chip:hover::after {
        opacity: 1;
      }

      .emoji-studio-bulk-bar-btn:focus-visible,
      .emoji-studio-emoji-chip:focus-visible {
        outline: 2px solid var(--sk_highlight, #1d9bd1);
        outline-offset: 2px;
      }

      .emoji-studio-bulk-bar-placeholder {
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        font-style: italic;
      }

      /* Loading and success states */
      .emoji-studio-bulk-bar-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 4px 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
      }

      .emoji-studio-bulk-bar-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #2eb67d;
        border-radius: 50%;
        animation: emoji-studio-spin 0.8s linear infinite;
      }

      @keyframes emoji-studio-spin {
        to { transform: rotate(360deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .emoji-studio-bulk-btn,
        .emoji-studio-bulk-btn-inline,
        .emoji-studio-bulk-bar-btn,
        .emoji-studio-emoji-chip {
          transition: none !important;
        }

        .emoji-studio-bulk-bar-spinner {
          animation: none !important;
        }
      }

      .emoji-studio-bulk-bar-success {
        color: #2eb67d;
        font-weight: 600;
      }

      .emoji-studio-bulk-bar-checkmark {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: #2eb67d;
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
      }
    `;
    document.head.appendChild(styles);
  }

  startBulkMode(messageEl) {
    // Get message ID from data-item-key or data-ts
    this.targetMessageId = messageEl.getAttribute('data-item-key') ||
                           messageEl.querySelector('[data-ts]')?.getAttribute('data-ts');

    if (!this.targetMessageId) {
      console.warn('[Emoji Studio] Could not find message ID');
      return;
    }

    // Extract channel ID from message permalink
    // The permalink format is: /archives/{CHANNEL_ID}/p{TIMESTAMP}
    const permalinkEl = messageEl.querySelector('a.c-timestamp[href*="/archives/"]') ||
                        messageEl.querySelector('a[href*="/archives/"]');
    if (permalinkEl) {
      const href = permalinkEl.getAttribute('href');
      const match = href.match(/\/archives\/([A-Z0-9]+)\//i);
      if (match) {
        this.targetChannelId = match[1];
        console.log('[Emoji Studio] Extracted channel ID:', this.targetChannelId);
      }
    }

    if (!this.targetChannelId) {
      console.warn('[Emoji Studio] Could not find channel ID in message');
      return;
    }

    this.targetMessageEl = messageEl;
    this.isActive = true;
    this.selectedEmojis.clear();

    // Click the reaction button to open emoji picker
    const reactionBtn = messageEl.querySelector('.p-message_actions_menu__add_reaction') ||
                        messageEl.querySelector('[data-qa="add_reaction_button"]') ||
                        messageEl.querySelector('[aria-label="Add reaction…"]');

    if (reactionBtn) {
      reactionBtn.click();
      console.log('[Emoji Studio] Bulk mode started for message:', this.targetMessageId, 'in channel:', this.targetChannelId);

      // Wait for picker to appear, then inject bulk bar
      this.waitForPickerAndInjectBar();
    }
  }

  waitForPickerAndInjectBar() {
    let retries = 0;
    const maxRetries = 20;

    const checkForPicker = () => {
      const picker = document.querySelector('.p-emoji_picker, [class*="emoji_picker"]');
      if (picker) {
        this.injectBulkBar(picker);
        this.watchForPickerClose();
      } else if (retries < maxRetries) {
        retries++;
        setTimeout(checkForPicker, 100);
      }
    };
    checkForPicker();
  }

  watchForPickerClose() {
    // Watch for picker being removed from DOM
    const observer = new MutationObserver(() => {
      const picker = document.querySelector('.p-emoji_picker, [class*="emoji_picker"]');
      if (!picker) {
        // Picker was closed
        observer.disconnect();
        if (this.isActive) {
          console.log('[Emoji Studio] Picker closed, ending bulk mode');
          this.endBulkMode();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  injectBulkBar(pickerContainer) {
    // Remove any existing bar
    const existingBar = document.querySelector('.emoji-studio-bulk-bar');
    if (existingBar) existingBar.remove();

    // Create the bulk bar
    const bar = document.createElement('div');
    bar.className = 'emoji-studio-bulk-bar';
    bar.innerHTML = `
      <div class="emoji-studio-saved-sets-row">
        <span class="emoji-studio-saved-sets-label">Saved:</span>
        <div class="emoji-studio-saved-sets-chips"></div>
      </div>
      <div class="emoji-studio-bulk-bar-emojis">
        <span class="emoji-studio-bulk-bar-placeholder">Click emojis to select</span>
      </div>
      <div class="emoji-studio-bulk-bar-actions">
        <button class="emoji-studio-bulk-bar-btn secondary" data-action="select-all">Select All</button>
        <button class="emoji-studio-bulk-bar-btn secondary" data-action="save-set">Save</button>
        <button class="emoji-studio-bulk-bar-btn secondary" data-action="clear">Clear</button>
        <button class="emoji-studio-bulk-bar-btn primary" data-action="add" disabled>Add Reactions</button>
      </div>
    `;

    // Attach event handlers
    bar.querySelector('[data-action="select-all"]').addEventListener('click', () => {
      this.selectAllVisible();
    });

    bar.querySelector('[data-action="save-set"]').addEventListener('click', () => {
      this.promptSaveSet();
    });

    bar.querySelector('[data-action="clear"]').addEventListener('click', () => {
      this.clearSelections();
    });

    bar.querySelector('[data-action="add"]').addEventListener('click', () => {
      this.executeReactions();
    });

    // Append to picker first (so elements are in DOM)
    pickerContainer.appendChild(bar);

    // Load and render saved sets
    this.loadSavedSets();

    // Watch for search input changes to show/hide Select All button
    this.watchSearchInput(pickerContainer);

    // Add click handler for native Slack emojis in bulk mode
    this.attachNativeEmojiHandler(pickerContainer);

    console.log('[Emoji Studio] Bulk bar injected');
  }

  attachNativeEmojiHandler(pickerContainer) {
    // Use capturing phase to intercept clicks before Slack handles them
    pickerContainer.addEventListener('click', (e) => {
      if (!this.isActive) return;

      // Check if this is a native emoji button
      const emojiButton = e.target.closest('[data-qa="emoji_list_item"], button[data-name]');
      if (!emojiButton) return;

      const emojiName = emojiButton.getAttribute('data-name');
      if (!emojiName) return;

      // Extract emoji URL from the image inside the button
      const emojiImg = emojiButton.querySelector('img[data-emoji], img[src*="emoji"]') ||
                       emojiButton.querySelector('img');
      const emojiUrl = emojiImg ? emojiImg.src : null;

      // Prevent default behavior (which would add reaction and close picker)
      e.preventDefault();
      e.stopPropagation();

      // Toggle selection
      emojiButton.classList.toggle('emoji-studio-emoji-selected');
      this.selectEmoji(emojiName, emojiUrl);
    }, true); // Use capturing phase

    // Watch for emoji elements being added/recycled due to virtualization
    this.watchForEmojiElements(pickerContainer);
  }

  watchForEmojiElements(pickerContainer) {
    const observer = new MutationObserver((mutations) => {
      if (!this.isActive || this.selectedEmojis.size === 0) return;

      // Re-apply selected class to any emoji buttons that are in our set
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.markSelectedEmojis(node);
            }
          });
        }
      }
    });

    observer.observe(pickerContainer, {
      childList: true,
      subtree: true
    });

    // Initial pass to mark any already-visible selected emojis
    this.markSelectedEmojis(pickerContainer);
  }

  markSelectedEmojis(container) {
    if (!container.querySelectorAll) return;

    // Find all emoji buttons and mark selected ones
    const emojiButtons = container.querySelectorAll('[data-qa="emoji_list_item"], button[data-name], .emoji-studio-emoji-item');
    emojiButtons.forEach(button => {
      const emojiName = button.getAttribute('data-name') || button.getAttribute('data-emoji-name');
      if (emojiName && this.selectedEmojis.has(emojiName)) {
        // Add appropriate class based on button type
        if (button.classList.contains('emoji-studio-emoji-item')) {
          button.classList.add('selected');
        } else {
          button.classList.add('emoji-studio-emoji-selected');
        }
      }
    });
  }

  selectEmoji(emojiName, emojiUrl = null) {
    const MAX_REACTIONS_PER_USER = 23;

    if (this.selectedEmojis.has(emojiName)) {
      this.selectedEmojis.delete(emojiName);
    } else {
      // Check if at limit
      if (this.selectedEmojis.size >= MAX_REACTIONS_PER_USER) {
        console.log(`[Emoji Studio] Max ${MAX_REACTIONS_PER_USER} reactions reached`);
        this.showLimitWarning();
        return;
      }
      this.selectedEmojis.set(emojiName, emojiUrl);
    }
    this.updateBulkBar();
  }

  showLimitWarning() {
    // Show brief warning in the bulk bar
    const emojisContainer = document.querySelector('.emoji-studio-bulk-bar-emojis');
    if (emojisContainer) {
      const existingWarning = emojisContainer.querySelector('.emoji-studio-limit-warning');
      if (existingWarning) return; // Already showing

      const warning = document.createElement('div');
      warning.className = 'emoji-studio-limit-warning';
      warning.textContent = 'Max 23 reactions per user';
      emojisContainer.appendChild(warning);

      setTimeout(() => warning.remove(), 2000);
    }
  }

  removeEmoji(emojiName) {
    this.selectedEmojis.delete(emojiName);
    // Also remove visual selection from picker
    document.querySelectorAll(`[data-name="${emojiName}"], [data-emoji-name="${emojiName}"]`).forEach(el => {
      el.classList.remove('selected', 'emoji-studio-emoji-selected');
    });
    this.updateBulkBar();
  }

  clearSelections() {
    this.selectedEmojis.clear();
    // Clear My Emojis tab selections
    document.querySelectorAll('.emoji-studio-emoji-item.selected').forEach(el => {
      el.classList.remove('selected');
    });
    // Clear native Slack emoji selections
    document.querySelectorAll('.emoji-studio-emoji-selected').forEach(el => {
      el.classList.remove('emoji-studio-emoji-selected');
    });
    this.updateBulkBar();
  }

  // ========== Saved Sets Methods ==========

  async loadSavedSets() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_BULK_REACTION_SETS' });
      this.renderSavedSets(response.sets || []);
    } catch (e) {
      console.error('[Emoji Studio] Failed to load saved sets:', e);
    }
  }

  renderSavedSets(sets) {
    const row = document.querySelector('.emoji-studio-saved-sets-row');
    const container = document.querySelector('.emoji-studio-saved-sets-chips');
    if (!row || !container) return;

    if (sets.length === 0) {
      row.style.display = 'none';
      return;
    }

    row.style.display = 'flex';
    container.innerHTML = '';

    sets.forEach(set => {
      const chip = document.createElement('div');
      chip.className = 'emoji-studio-saved-set-chip';
      chip.innerHTML = `
        <span class="set-name">${set.name}</span>
        <span class="set-count">(${set.emojis.length})</span>
        <span class="delete-btn" data-set-id="${set.id}">×</span>
      `;

      // Click chip name/count to load set
      chip.querySelector('.set-name').addEventListener('click', () => {
        this.loadSet(set);
      });
      chip.querySelector('.set-count').addEventListener('click', () => {
        this.loadSet(set);
      });

      // Click X to delete
      chip.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSet(set.id);
      });

      container.appendChild(chip);
    });
  }

  async promptSaveSet() {
    if (this.selectedEmojis.size === 0) {
      // Show brief message on the button
      const btn = document.querySelector('[data-action="save-set"]');
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Select emojis first';
        setTimeout(() => { btn.textContent = originalText; }, 1500);
      }
      return;
    }

    // Simple prompt for name
    const name = prompt('Name this emoji set:', `Set ${new Date().toLocaleDateString()}`);
    if (!name || !name.trim()) return;

    // Convert Map to array
    const emojis = Array.from(this.selectedEmojis.entries()).map(([emojiName, url]) => ({ name: emojiName, url }));

    try {
      await chrome.runtime.sendMessage({
        type: 'SAVE_BULK_REACTION_SET',
        name: name.trim(),
        emojis
      });
      this.loadSavedSets(); // Refresh the chips
      console.log(`[Emoji Studio] Saved set "${name.trim()}" with ${emojis.length} emojis`);
    } catch (e) {
      console.error('[Emoji Studio] Failed to save set:', e);
    }
  }

  loadSet(set) {
    // Clear current selection first
    this.clearSelections();

    // Load emojis from set
    const MAX_REACTIONS_PER_USER = 23;
    set.emojis.forEach(emoji => {
      if (this.selectedEmojis.size < MAX_REACTIONS_PER_USER) {
        this.selectedEmojis.set(emoji.name, emoji.url);
      }
    });

    // Update visual selection in picker if emojis are visible
    this.selectedEmojis.forEach((url, name) => {
      // Mark My Emojis tab items
      document.querySelectorAll(`[data-emoji-name="${name}"]`).forEach(el => {
        el.classList.add('selected');
      });
      // Mark native Slack emojis
      document.querySelectorAll(`[data-name="${name}"]`).forEach(el => {
        el.classList.add('emoji-studio-emoji-selected');
      });
    });

    this.updateBulkBar();
    console.log(`[Emoji Studio] Loaded set "${set.name}" with ${set.emojis.length} emojis`);
  }

  async deleteSet(setId) {
    try {
      await chrome.runtime.sendMessage({
        type: 'DELETE_BULK_REACTION_SET',
        id: setId
      });
      this.loadSavedSets(); // Refresh the chips
      console.log(`[Emoji Studio] Deleted set ${setId}`);
    } catch (e) {
      console.error('[Emoji Studio] Failed to delete set:', e);
    }
  }

  // ========== End Saved Sets Methods ==========

  selectAllVisible() {
    const MAX_REACTIONS_PER_USER = 23;

    // Get the current search term from the emoji picker search input
    const searchInput = document.querySelector('.p-emoji_picker__input input, input[placeholder*="Search"]');
    const searchTerm = searchInput?.value?.trim().toLowerCase() || '';

    // Select all visible emojis in the picker (up to limit)
    // Check My Emojis tab first
    const myEmojis = document.querySelectorAll('.emoji-studio-emoji-item:not(.selected)');
    for (const el of myEmojis) {
      if (this.selectedEmojis.size >= MAX_REACTIONS_PER_USER) break;
      const emojiName = el.getAttribute('data-emoji-name');
      // Only select if emoji name includes the complete search term
      if (searchTerm && !emojiName?.toLowerCase().includes(searchTerm)) continue;

      const emojiImg = el.querySelector('img');
      const emojiUrl = emojiImg ? emojiImg.src : null;
      if (emojiName && !this.selectedEmojis.has(emojiName)) {
        this.selectedEmojis.set(emojiName, emojiUrl);
        el.classList.add('selected');
      }
    }

    // Also check native Slack emoji list (visible ones only)
    const nativeEmojis = document.querySelectorAll('[data-qa="emoji_list_item"]:not(.emoji-studio-emoji-selected), button[data-name]:not(.emoji-studio-emoji-selected)');
    for (const el of nativeEmojis) {
      if (this.selectedEmojis.size >= MAX_REACTIONS_PER_USER) break;
      const emojiName = el.getAttribute('data-name');
      // Only select if emoji name includes the complete search term
      if (searchTerm && !emojiName?.toLowerCase().includes(searchTerm)) continue;

      const emojiImg = el.querySelector('img[data-emoji], img[src*="emoji"]') || el.querySelector('img');
      const emojiUrl = emojiImg ? emojiImg.src : null;
      if (emojiName && !this.selectedEmojis.has(emojiName)) {
        this.selectedEmojis.set(emojiName, emojiUrl);
        el.classList.add('emoji-studio-emoji-selected');
      }
    }

    this.updateBulkBar();

    if (this.selectedEmojis.size >= MAX_REACTIONS_PER_USER) {
      this.showLimitWarning();
    }

    console.log(`[Emoji Studio] Selected all visible: ${this.selectedEmojis.size} emojis (search: "${searchTerm}")`);
  }

  watchSearchInput(pickerContainer) {
    // Find the search input in the emoji picker
    const searchInput = pickerContainer.querySelector('.p-emoji_picker__input input, input[placeholder*="Search"]');
    if (!searchInput) {
      console.log('[Emoji Studio] Search input not found, Select All will always be hidden');
      return;
    }

    const selectAllBtn = document.querySelector('[data-action="select-all"]');
    if (!selectAllBtn) return;

    // Show Select All when there's search text
    const updateSelectAllVisibility = () => {
      const hasSearchText = searchInput.value.trim().length > 0;
      selectAllBtn.style.display = hasSearchText ? 'inline-block' : 'none';
    };

    searchInput.addEventListener('input', updateSelectAllVisibility);
    // Also check on focus in case value was pre-filled
    searchInput.addEventListener('focus', updateSelectAllVisibility);
    // Initial check
    updateSelectAllVisibility();
  }

  updateBulkBar() {
    const emojisContainer = document.querySelector('.emoji-studio-bulk-bar-emojis');
    const addBtn = document.querySelector('.emoji-studio-bulk-bar-btn.primary');

    if (emojisContainer) {
      if (this.selectedEmojis.size === 0) {
        emojisContainer.innerHTML = '<span class="emoji-studio-bulk-bar-placeholder">Click emojis to select</span>';
      } else {
        emojisContainer.innerHTML = '';
        this.selectedEmojis.forEach((url, name) => {
          const chip = document.createElement('div');
          chip.className = 'emoji-studio-emoji-chip';
          chip.setAttribute('data-emoji-name', name);
          chip.title = `:${name}: (click to remove)`;

          if (url) {
            chip.innerHTML = `<img src="${url}" alt=":${name}:" />`;
          } else {
            // Fallback: show the name if no URL
            chip.innerHTML = `<span style="font-size: 10px;">:${name.slice(0, 3)}:</span>`;
          }

          chip.addEventListener('click', () => {
            this.removeEmoji(name);
          });

          emojisContainer.appendChild(chip);
        });
      }
    }

    if (addBtn) {
      addBtn.disabled = this.selectedEmojis.size === 0;
    }
  }

  async executeReactions() {
    if (!this.targetMessageId || this.selectedEmojis.size === 0) return;

    // Store values locally before any state changes
    const messageTimestamp = this.targetMessageId;
    const emojis = Array.from(this.selectedEmojis.keys());

    // Set executing flag to prevent picker close from resetting state
    this.isExecuting = true;

    // Update bulk bar to show loading state
    const bulkBar = document.querySelector('.emoji-studio-bulk-bar');
    if (bulkBar) {
      bulkBar.innerHTML = `
        <div class="emoji-studio-bulk-bar-status">
          <span class="emoji-studio-bulk-bar-spinner"></span>
          Adding ${emojis.length} reaction${emojis.length !== 1 ? 's' : ''}...
        </div>
      `;
    }

    console.log(`[Emoji Studio] Adding ${emojis.length} reactions via API`);

    // Add reactions via API
    let successCount = 0;
    for (const emojiName of emojis) {
      const result = await this.addReactionViaAPI(messageTimestamp, emojiName);
      // Check for success - handle both ok:true and already_reacted as success
      if (result && (result.ok === true || result.error === 'already_reacted')) {
        successCount++;
      }
      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[Emoji Studio] Bulk reactions complete: ${successCount}/${emojis.length} added`);

    // Show success state - re-query bulk bar in case DOM changed during async operations
    const successBar = document.querySelector('.emoji-studio-bulk-bar');
    const finalCount = successCount > 0 ? successCount : emojis.length;
    if (successBar) {
      successBar.innerHTML = `
        <div class="emoji-studio-bulk-bar-status emoji-studio-bulk-bar-success">
          <span class="emoji-studio-bulk-bar-checkmark">✓</span>
          ${finalCount} reaction${finalCount !== 1 ? 's' : ''} added!
        </div>
      `;
    }

    // Wait briefly so user sees success, then close
    await new Promise(resolve => setTimeout(resolve, 800));

    // Close the picker
    const closeBtn = document.querySelector('.p-emoji_picker__header_button_close') ||
                     document.querySelector('[data-qa="close_emoji_picker"]');
    if (closeBtn) closeBtn.click();

    // Reset state
    this.isExecuting = false;
    this.isActive = false;
    this.targetMessageEl = null;
    this.targetMessageId = null;
    this.targetChannelId = null;
    this.selectedEmojis.clear();
  }

  async addSingleReactionToMessage(messageId, emojiName) {
    try {
      const messageEl = document.querySelector(`[data-item-key="${messageId}"]`);

      if (!messageEl) {
        console.warn(`[Emoji Studio] Could not find message ${messageId}`);
        return false;
      }

      // Hover to show toolbar if needed
      messageEl.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 150));

      // Click the add reaction button in the reaction bar
      const addReactionBtn = messageEl.querySelector('[data-qa="add_reaction_button"]') ||
                             messageEl.querySelector('.c-reaction_add');

      if (addReactionBtn) {
        addReactionBtn.click();
        await new Promise(resolve => setTimeout(resolve, 200));

        // Search for emoji in the picker
        const searchInput = document.querySelector('.p-emoji_picker__input input');
        if (searchInput) {
          // Clear and type the emoji name
          searchInput.value = '';
          searchInput.focus();
          searchInput.value = emojiName;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 200));

          // Click the first matching result
          const result = document.querySelector(`button[data-name="${emojiName}"]`) ||
                        document.querySelector(`[data-qa="emoji_list_item"][data-name="${emojiName}"]`) ||
                        document.querySelector('.c-emoji_picker__list_item button');
          if (result) {
            result.click();
            console.log(`[Emoji Studio] Added :${emojiName}:`);
            return true;
          } else {
            console.warn(`[Emoji Studio] Could not find emoji ${emojiName} in picker`);
          }
        } else {
          console.warn('[Emoji Studio] Could not find emoji picker search input');
        }
      } else {
        console.warn('[Emoji Studio] Could not find add reaction button');
      }
      return false;
    } catch (error) {
      console.error('[Emoji Studio] Error adding reaction:', error);
      return false;
    }
  }

  // Get sync data from storage (token, workspace, etc.)
  async getSyncData() {
    const result = await chrome.storage.local.get('emojiStudioSyncData');
    return result.emojiStudioSyncData || null;
  }

  // Get channel ID from URL path
  getChannelId() {
    // URL patterns:
    // - Regular channel: /client/T.../C0142REDXB2
    // - DMs: /client/T.../dms/D06SZ60QGQG
    // - Threads: /client/T.../threads
    const pathParts = window.location.pathname.split('/');
    // pathParts = ['', 'client', 'T013K620LTW', 'C0142REDXB2'] or
    // pathParts = ['', 'client', 'T013K620LTW', 'dms', 'D06SZ60QGQG']

    let channelId = pathParts[3];

    // If it's a special view like 'dms', 'threads', etc., the actual channel is at index 4
    const specialViews = ['dms', 'threads', 'activity', 'unreads', 'drafts', 'later', 'files', 'search'];
    if (specialViews.includes(channelId)) {
      channelId = pathParts[4] || null;
    }

    // Validate it looks like a channel ID (starts with C, D, or G)
    if (channelId && /^[CDG][A-Z0-9]+$/.test(channelId)) {
      return channelId;
    }

    console.warn('[Emoji Studio] Could not extract valid channel ID from URL:', window.location.pathname);
    return null;
  }

  // Add reaction via Slack API directly
  async addReactionViaAPI(messageTimestamp, emojiName) {
    const syncData = await this.getSyncData();

    if (!syncData?.token) {
      console.error('[Emoji Studio] No token found. Please sync your workspace first.');
      return { ok: false, error: 'missing_token' };
    }

    if (!syncData?.workspace) {
      console.error('[Emoji Studio] No workspace found. Please sync your workspace first.');
      return { ok: false, error: 'missing_workspace' };
    }

    // Use channel ID extracted from message element (stored in startBulkMode)
    if (!this.targetChannelId) {
      console.error('[Emoji Studio] No channel ID available');
      return { ok: false, error: 'missing_channel' };
    }

    // Build the workspace API URL
    // workspace could be "lennysnewsletter" or "lennysnewsletter.slack.com"
    let apiBaseUrl;
    if (syncData.workspace.includes('.slack.com')) {
      apiBaseUrl = `https://${syncData.workspace}`;
    } else {
      apiBaseUrl = `https://${syncData.workspace}.slack.com`;
    }

    const formData = new FormData();
    formData.append('token', syncData.token);
    formData.append('channel', this.targetChannelId);
    formData.append('timestamp', messageTimestamp);
    formData.append('name', emojiName);
    formData.append('_x_reason', 'changeReactionFromUserAction');
    formData.append('_x_mode', 'online');
    formData.append('_x_sonic', 'true');
    formData.append('_x_app_name', 'client');

    try {
      console.log(`[Emoji Studio] API call to ${apiBaseUrl}/api/reactions.add`);
      const response = await fetch(`${apiBaseUrl}/api/reactions.add`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();
      if (result.ok) {
        console.log(`[Emoji Studio] Added :${emojiName}: reaction`);
      } else {
        console.warn(`[Emoji Studio] Failed to add :${emojiName}:`, result.error);
      }
      return result;
    } catch (error) {
      console.error('[Emoji Studio] API error:', error);
      return { ok: false, error: error.message };
    }
  }

  endBulkMode() {
    // Don't reset state if we're currently executing reactions
    if (this.isExecuting) return;

    this.isActive = false;
    this.targetMessageEl = null;
    this.targetMessageId = null;
    this.targetChannelId = null;
    this.selectedEmojis.clear();
  }
}

class InlineButtonInjector {
  constructor(bulkManager) {
    this.bulkManager = bulkManager;
    this.observer = null;
    this.processedToolbars = new WeakSet();
    this.processedReactionBars = new WeakSet();
  }

  clearProcessedSets() {
    // Create new WeakSets to allow re-injection of buttons
    this.processedToolbars = new WeakSet();
    this.processedReactionBars = new WeakSet();
  }

  start() {
    console.log('[Emoji Studio] InlineButtonInjector started');

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.scanForToolbars(node);
            this.scanForReactionBars(node);
          }
        });
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial scan
    this.scanForToolbars(document.body);
    this.scanForReactionBars(document.body);
  }

  scanForToolbars(root) {
    if (!root.querySelectorAll) return;

    // Look for message action toolbars - try multiple selectors
    const selectors = [
      '.c-message_actions',
      '[data-qa="message_actions"]',
      '.c-message__actions',
      '[class*="message_actions"]'
    ];

    for (const selector of selectors) {
      const toolbars = root.querySelectorAll(selector);
      if (toolbars.length > 0) {
        toolbars.forEach(toolbar => this.injectButton(toolbar));
      }
    }

    // Check if root itself is a toolbar
    if (root.matches?.('.c-message_actions, [data-qa="message_actions"], .c-message__actions')) {
      this.injectButton(root);
    }
  }

  scanForReactionBars(root) {
    if (!root.querySelectorAll) return;

    // Look for the add reaction button below messages (the face icon with +)
    const addReactionBtns = root.querySelectorAll('.c-reaction_add, [data-qa="add_reaction_button"]');
    addReactionBtns.forEach(btn => this.injectReactionBarButton(btn));

    // Check if root itself is an add reaction button
    if (root.matches?.('.c-reaction_add, [data-qa="add_reaction_button"]')) {
      this.injectReactionBarButton(root);
    }
  }

  injectReactionBarButton(addReactionBtn) {
    // Check if bulk react is enabled
    if (!slackAppSettings.bulkReactEnabled) return;

    if (this.processedReactionBars.has(addReactionBtn)) return;

    // Find the reaction bar container
    const reactionBar = addReactionBtn.closest('.c-message_reactions, .c-reaction_bar, [class*="reaction"]');
    if (!reactionBar) return;
    if (reactionBar.querySelector('.emoji-studio-bulk-btn-inline')) return;

    // Create our bulk reaction button for the reaction bar
    const bulkBtn = document.createElement('button');
    bulkBtn.className = 'emoji-studio-bulk-btn-inline';
    bulkBtn.innerHTML = '⚡';
    bulkBtn.type = 'button';
    bulkBtn.title = 'Bulk add reactions (Emoji Studio)';
    bulkBtn.setAttribute('aria-label', 'Bulk add reactions (Emoji Studio)');

    bulkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Find the message element
      const messageEl = addReactionBtn.closest('.c-virtual_list__item') ||
                        addReactionBtn.closest('[data-item-key]');

      if (messageEl) {
        this.bulkManager.startBulkMode(messageEl);
      }
    });

    // Append to the end of the reaction bar (after all other elements)
    reactionBar.appendChild(bulkBtn);
    this.processedReactionBars.add(addReactionBtn);
  }

  injectButton(toolbar) {
    // Check if bulk react is enabled
    if (!slackAppSettings.bulkReactEnabled) return;

    if (this.processedToolbars.has(toolbar)) return;
    if (toolbar.querySelector('.emoji-studio-bulk-btn')) return;

    // Find the reaction button to insert our button next to it - try multiple selectors
    const reactionBtn = toolbar.querySelector('.p-message_actions_menu__add_reaction') ||
                        toolbar.querySelector('[data-qa="reaction"]') ||
                        toolbar.querySelector('[aria-label*="reaction"]') ||
                        toolbar.querySelector('[aria-label="Add reaction"]') ||
                        toolbar.querySelector('[class*="add_reaction"]');

    if (!reactionBtn) {
      // Log what buttons are available for debugging
      const buttons = toolbar.querySelectorAll('button');
      if (buttons.length > 0) {
        console.log('[Emoji Studio] Toolbar found but no reaction button. Available buttons:',
          Array.from(buttons).map(b => b.getAttribute('aria-label') || b.className).join(', '));
      }
      return;
    }

    console.log('[Emoji Studio] Injecting bulk button next to reaction button');

    // Create our bulk reaction button - match Slack's menu item styling
    const bulkBtn = document.createElement('button');
    bulkBtn.className = 'emoji-studio-bulk-btn c-button-unstyled c-menu_item__button c-menu_item--compact';
    bulkBtn.innerHTML = '⚡';
    bulkBtn.type = 'button';
    bulkBtn.title = 'Bulk add reactions (Emoji Studio)';
    bulkBtn.setAttribute('aria-label', 'Bulk add reactions (Emoji Studio)');

    bulkBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Find the message element
      const messageEl = toolbar.closest('.c-virtual_list__item') ||
                        toolbar.closest('[data-item-key]');

      if (messageEl) {
        this.bulkManager.startBulkMode(messageEl);
      }
    });

    // Insert after the reaction button
    reactionBtn.parentNode.insertBefore(bulkBtn, reactionBtn.nextSibling);
    this.processedToolbars.add(toolbar);
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Initialize emoji hover feature and picker injection
function initEmojiHoverFeature() {
  // Only run on Slack domains
  if (!window.location.hostname.endsWith('.slack.com')) {
    return;
  }

  console.log('[Emoji Studio] Initializing emoji features');

  // Load Slack app settings first
  loadSlackAppSettings();

  const lookupService = new EmojiLookupService();
  const reactionPopover = new ReactionHoverPopover(lookupService);
  const pickerInjector = new EmojiPickerInjector(lookupService);

  // Pre-load emoji data
  lookupService.loadEmojiData();

  // Initialize emoji picker "My Emojis" tab injection
  pickerInjector.init();

  // Initialize bulk reaction system
  const bulkReactionManager = new BulkReactionManager(lookupService, pickerInjector);
  bulkReactionManager.init();
  pickerInjector.setBulkReactionManager(bulkReactionManager);

  // Store global reference for settings updates
  bulkReactionManagerInstance = bulkReactionManager;

  // Listen for storage changes to invalidate caches
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.emojiStudioSyncData || changes.slackData)) {
      console.log('[Emoji Studio] Storage changed, invalidating emoji caches');
      lookupService.invalidateCache();
      pickerInjector.invalidateCache();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEmojiHoverFeature);
} else {
  initEmojiHoverFeature();
}
