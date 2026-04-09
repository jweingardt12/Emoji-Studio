# Emoji Studio Chrome Extension

Manifest V3 Chrome extension that bridges Slack and the Emoji Studio web app. Syncs workspace emojis, enables custom emoji creation from any image/video, and integrates with Slackmojis.

## Architecture

| File | Role |
|------|------|
| `background.js` | Service worker: Slack auth capture, emoji sync, context menus, notifications, alarms |
| `content.js` | Injected into Slack pages: captures auth tokens, injects sync button |
| `inject.js` | Injected into Emoji Studio pages: bridge between extension storage and webapp via `postMessage` |
| `slackmojis-content.js` | Injected into slackmojis.com: "Add to Emoji Studio" buttons |
| `popup.html/js/css` | Extension popup UI with Sync, Create, and Settings tabs |
| `manifest.json` | Extension config (permissions, content scripts, service worker) |

## Development

### Load the extension

1. Run the Emoji Studio dev server: `npm run dev:https` (port 3001)
2. Open `chrome://extensions` with Developer mode enabled
3. Click "Load unpacked" and select the `chrome-extension/` directory
4. Navigate to a Slack workspace to capture auth data

### Local testing

The extension targets `https://app.emojistudio.xyz` by default. For local development, temporarily change `EMOJI_STUDIO_URL` in these files:

- `background.js` (line ~43)
- `content.js` (line ~11)
- `popup.js` (line ~5)

Change to `https://localhost:3001`, reload the extension in `chrome://extensions`, and test. Revert before committing.

The `broadcastToEmojiStudioTabs` function in `background.js` already includes `localhost:3001` and `localhost:3002` in its tab query patterns.

## Packaging

```bash
npm run extension:package
```

This creates `chrome-extension/dist/emoji-studio-extension-vX.Y.Z.zip` for Chrome Web Store upload.

## Webapp Integration

The webapp integration code lives in the parent repo:

- `lib/chrome-extension.ts` -- Interfaces, validators, message listener setup
- `components/chrome-extension-handler.tsx` -- Main sync data processing
- `components/global-extension-listener.tsx` -- Analytics forwarding, clear data
- `components/extension-clear-data-listener.tsx` -- Clear data handler
- `app/create/components/useExtensionMessages.ts` -- Create/cart message handling
- `app/api/sync-from-extension/route.ts` -- CORS-enabled sync endpoint
- `app/api/pair/` -- QR code pairing endpoints

## Message Protocol

**Extension to Webapp** (via `window.postMessage`):
`EMOJI_STUDIO_SYNCED_DATA`, `EMOJI_STUDIO_DATA`, `EMOJI_STUDIO_SYNC_PROGRESS`, `EMOJI_STUDIO_CREATE_EMOJI`, `EMOJI_STUDIO_ADD_EMOJI`, `EMOJI_STUDIO_CART_DATA`, `EMOJI_STUDIO_EXTENSION_INSTALLED`, `EMOJI_STUDIO_PONG`, `EMOJI_STUDIO_CLEAR_DATA_FROM_EXTENSION`

**Webapp to Extension**:
`EMOJI_STUDIO_READY`, `REQUEST_EXTENSION_DATA`, `REQUEST_EXTENSION_SYNC_DATA`, `EMOJI_STUDIO_SYNC_ACK`, `EMOJI_STUDIO_PING`, `EMOJI_STUDIO_CLEAR_DATA`, `UPDATE_NOTIFICATION_SETTINGS`
