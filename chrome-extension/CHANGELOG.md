# Changelog

## [2.1.0] - 2025-12-11

### Added
- **Rainbow Sync Button**: New MagicUI-styled rainbow button on Slack's emoji customization page
  - Persistent button positioned inline with "Add Alias" and "Add Custom Emoji" buttons
  - Animated rainbow gradient border with glow effect
  - Entry animation with scale bounce on page load
  - Shimmer effect that sweeps across the button
  - Dark mode support with inverted colors

### Removed
- **Legacy Transient Banner**: Removed the old green notification banner that auto-dismissed after 5-10 seconds
  - The new rainbow button provides a better, always-visible sync experience

### Improved
- Better visual hierarchy on the emoji customization page
- More discoverable sync functionality with eye-catching animations

## [1.6.0] - 2025-09-25

### Added
- Mobile Connection tab to share workspaces with the iOS app via QR code
- QR codes compress Slack auth payloads for smaller, faster scans
- Direct TestFlight link to help users join the iOS beta quickly

### Improved
- Streamlined mobile tab copy and layout
- Clearer error handling around QR generation and scanning

## [1.4.0] - 2025-08-05

### Added
- **New Emoji Notifications**: Get browser notifications when new emojis are added to your Slack workspace
  - Native browser notifications (no extension required for notifications)
  - Configurable notification settings in Emoji Studio Settings page
  - Choose notification frequency: hourly, daily, or weekly
  - Set preferred notification time
  - Click notifications to view new emojis in Explorer with visual highlights
- **Explorer Date Filtering**: Support for filtering emojis by creation date via URL parameter
  - New emojis are highlighted with a "New" badge and special styling
  - Clear filter button to return to full emoji list
- **Settings Page Redesign**: Organized settings into tabs for better UX
  - Connection, Notifications, Preferences, and Data tabs
  - Cleaner, more organized interface
  - Responsive tab design for mobile

### Technical Improvements
- Native browser Notification API for simpler, more reliable notifications
- Background checks run in the web app when tab is open
- Notification permission handling with clear user feedback
- Test notification button to verify setup

## [1.3.9] - 2025-08-05

### Fixed
- **Toast Emoji Count**: Fixed toast notifications to show non-alias emoji count (matching dashboard display)
- **Extension Notification Count**: Fixed Chrome extension notifications to show non-alias emoji count
- **Loading Overlay Count**: Fixed sync loading overlay to show consistent emoji count
- **Count Consistency**: All emoji count displays now exclude aliases for consistency with dashboard

### Technical Improvements
- Background script now calculates and broadcasts nonAliasCount in SYNC_COMPLETED messages
- ChromeExtensionHandler updated to use nonAliasCount when available
- Added nonAliasCount to sync progress tracking for better analytics
- inject.js passes through nonAliasCount from background to app

### User Experience
- Toast notifications now match the emoji count shown on dashboard
- No more confusion between total emojis (including aliases) and unique emojis
- Consistent count display across all notifications and UI elements

## [1.3.8] - 2025-08-05

### Fixed
- **Stale Data Loading**: Fixed issue where dashboard would load old/stale synced data before new sync completed
- **Settings Redirect Bug**: Prevented automatic redirect to settings when sync starts
- **Data Processing Race Condition**: inject.js now waits for sync to complete before sending data when syncStarting=true

### Technical Improvements
- Added extensive logging to sync process for better debugging
- inject.js skips auto-check for synced data when sync is starting
- Better handling of sync timing to prevent old data from interfering with new sync
- Enhanced sync process logging for troubleshooting

### Debug Improvements
- Added detailed logging to syncToEmojiStudio function
- Log captured data status, workspace, and emoji counts
- Better visibility into sync completion broadcasting
- More detailed error messages for sync failures

## [1.3.7] - 2025-08-05

### Fixed
- **Sync Button Dashboard Opening**: Fixed issue where clicking sync button didn't open dashboard
- **Loading Overlay During Sync**: Sync button now properly shows loading overlay during sync process
- **Sync Flow Timing**: Improved timing to ensure dashboard loads before sync progress messages are sent

### Technical Improvements
- Updated SYNC_TO_EMOJI_STUDIO_AND_OPEN handler to open dashboard immediately with syncStarting parameter
- Added 1-second delay between opening dashboard and starting sync to ensure proper message handling
- ChromeExtensionHandler now detects syncStarting parameter and shows "Preparing to sync..." message
- Better progress flow: Preparing (5%) → Syncing (20%) → Completed (90%) → Hide overlay

## [1.3.6] - 2025-08-05

### Fixed
- **Clear App Data**: Fixed issue where "Clear App Data" button in settings wasn't properly clearing all data
- **Extension Storage Cleanup**: CLEAR_DATA handler now properly removes synced data from extension storage
- **Data Persistence**: Prevented automatic data restoration after clearing app data

### Technical Improvements
- Updated CLEAR_DATA handler to remove `emojiStudioSyncData` and `emojiStudioSyncMeta` keys
- Fixed toast notifications in ClearLocalStorageButton to use sonner instead of shadcn toast
- Improved clear data flow to prevent race conditions with automatic data restoration

## [1.3.5] - 2025-08-05

### Added
- **Real-time Sync Progress**: Loading overlay now shows actual sync progress instead of simulated progress
- **Live Sync Communication**: Extension broadcasts sync status to all open Emoji Studio tabs
- **Smart Loading States**: Loading overlay automatically appears during sync and disappears when complete

### Fixed
- **Accurate Progress Tracking**: Removed fake progress simulation, now tracks real sync operations
- **Duplicate Loading Overlays**: Fixed issue where multiple loading overlays could appear simultaneously
- **State Synchronization**: Loading overlay state properly synchronized with actual sync operations

### Technical Improvements
- Added broadcastToEmojiStudioTabs function for message passing
- Enhanced inject.js to relay sync progress messages to React app
- Updated ChromeExtensionHandler to listen for real-time sync progress
- Simplified dashboard sync loading by removing URL parameter dependency
- Message passing architecture for SYNC_STARTED, SYNC_COMPLETED, and SYNC_ERROR events

## [1.3.4] - 2025-08-05

### Fixed (Debug Release)
- **Critical Issue Investigation**: Reverted emoji count from 20,000 back to 5,000 to isolate sync failure
- **Enhanced Debugging**: Added extensive logging to identify why "no emojis found" occurs despite workspace connection
- **API Error Tracking**: Improved error handling and response logging for Slack API calls

### Technical Improvements
- Added detailed console logging for fetchFreshEmojiData function
- Enhanced error messages with HTTP status codes and response bodies
- Simplified request parameters to match known working configuration
- Full request/response debugging for troubleshooting

### Status
This is a debugging release to identify the root cause of sync failure. The emoji count limit has been temporarily reverted while investigating the issue.

## [1.3.3] - 2025-08-05

### Fixed
- **Emoji Count Limit**: Fixed issue where background sync was only fetching 5,000 emojis instead of all emojis
- **Complete Sync**: Now fetches up to 20,000 emojis to match the web app behavior
- **Consistency**: Aligned emoji count limit across all sync methods

### Technical Improvements
- Updated fetchFreshEmojiData to use count: 20000 instead of count: 5000
- Ensures workspaces with many emojis are fully synchronized

## [1.3.2] - 2025-08-05

### Added
- **Loading Overlay on Sync**: Clicking the sync button now shows a loading overlay on the Emoji Studio dashboard
- **Enhanced Sync UX**: Visual feedback with progress animation during sync process
- **Automatic Dashboard Opening**: Sync button now automatically opens Emoji Studio after syncing

### Improved
- Better user experience when syncing from the notification
- Visual progress indication during sync process
- Smoother transition from extension to Emoji Studio app

### Technical Improvements
- Added SYNC_TO_EMOJI_STUDIO_AND_OPEN message type
- Dashboard detects syncing parameter and shows appropriate loading state
- Progress simulation with completion detection

## [1.3.1] - 2025-08-05

### Added
- **Emoji Studio App Integration**: Emoji Studio app now fully supports receiving synced data from the extension
- **Automatic Data Loading**: Emoji Studio automatically loads synced data when pages are opened
- **Toast Notifications**: Success notifications show when data is synced to the app
- **Universal Handler**: ChromeExtensionHandler component added to all pages for consistent sync support

### Fixed
- **Data Delivery Timing**: Added delay to ensure Emoji Studio page is ready before sending synced data
- **EMOJI_STUDIO_READY Handler**: Extension now responds to ready signal with synced data
- **Improved Reliability**: Better coordination between extension and app for data sync

### Changed
- ChromeExtensionHandler now processes synced data even when not coming directly from extension
- Added processSyncedData callback to handle background sync data
- Dashboard and Settings pages now include the ChromeExtensionHandler for data reception
- Inject.js now waits 500ms before sending data to ensure page readiness

### Technical Improvements
- Added SyncedEmojiData and SyncedEmojiMeta interfaces for type safety
- Extension listener now supports three callbacks: auth data, clear data, and synced data
- Improved error handling and logging throughout the sync process
- Added automatic UI refresh when new emoji data is received
- Better message passing timing between extension and Emoji Studio app

## [1.3.0] - 2025-08-05

### Added
- **100% Background Sync**: Sync now happens completely in the background using Chrome Storage API
- **No Tab Opening**: Removed all tab-based sync methods - syncing is now invisible to users
- **Storage-Based Communication**: Emoji Studio can read synced data directly from extension storage
- **Real-time Updates**: Open Emoji Studio tabs are notified when new data is synced

### Changed
- Sync mechanism now uses Chrome Storage API instead of opening tabs or API calls
- Data is stored in chrome.storage.local (5MB limit) which is accessible to Emoji Studio
- Removed API sync attempts to simplify the sync process
- Background syncs are now truly silent with no visible browser activity

### Technical Improvements
- Extension stores emoji data in `emojiStudioSyncData` key in Chrome storage
- Emoji Studio's inject.js automatically checks for synced data on page load
- Message passing notifies Emoji Studio tabs when new data is available
- Complete elimination of tab manipulation for syncing

## [1.2.0] - 2025-08-05

### Added
- **Automatic Background Syncing**: Configurable intervals (1, 2, 4, 6, 12, or 24 hours)
- **Sync Settings UI**: Toggle and interval selector in the popup
- **Real-time Sync Status**: Visual indicators showing syncing, success, or error states
- **Next Sync Display**: Shows when the next automatic sync will occur
- **Persistent Sync State**: Sync settings and state preserved across browser sessions
- **Smart Sync on Startup**: Checks if sync is needed when Chrome starts

### Changed
- Default sync interval changed from 24 hours to 1 hour for better data freshness
- Background sync starts 1 minute after browser startup instead of immediately
- Auto-sync runs silently without notifications (only manual syncs show notifications)
- Sync state is now stored in Chrome storage for better persistence

### Fixed
- Users no longer need to re-sync after closing Chrome or waiting a day
- Background sync properly resumes after browser restart
- Sync settings persist between extension updates
- Improved error handling for background sync failures

## [1.1.3] - 2025-08-05

### API Sync Foundation

This release lays the groundwork for syncing without opening the Emoji Studio app.

### Added
- **API Sync Attempt**: Chrome extension now tries to sync via API endpoints first
- **Fallback Mechanism**: If API sync fails, falls back to the original tab-based sync
- **Sync Notifications**: Shows success notification when sync completes via API
- **API Endpoint**: Created `/api/sync-from-extension` endpoint in Emoji Studio app

### Technical Notes
- The API endpoint currently only validates data - full backend storage would require:
  - User authentication system
  - Database for storing emoji data
  - Changes to how Emoji Studio app loads data
- For now, users still need to open Emoji Studio at least once to store data in localStorage
- This serves as a foundation for future true server-side sync capabilities

## [1.1.2] - 2025-08-05

### Enhanced Sync Functionality

This release addresses user feedback about syncing issues with uploaded and renamed emojis.

### Added
- **Last Sync Time Display**: Shows when data was last synced to Emoji Studio with visual indicators
  - Green: Synced recently
  - Yellow: Synced 12-24 hours ago  
  - Red: Synced more than 24 hours ago
- **Auto-sync After Uploads**: Automatically syncs to Emoji Studio after successfully uploading emojis to Slack
- **Auto-sync After 24 Hours**: Prompts automatic sync when data is older than 24 hours
- **Improved Sync Status**: Visual feedback during sync operations

### Fixed
- Uploaded emojis now appear in Emoji Studio immediately after upload (no manual sync required)
- Renamed emojis now reflect properly in Emoji Studio after the operation
- Better handling of partial upload success with automatic sync

### Changed
- Updated sync button icon to better represent the sync action
- Improved sync status messages to be more informative

### Technical Improvements
- Automatic sync triggers after emoji operations
- Better error handling for sync failures
- Improved user feedback during sync operations

## [1.1.1] - 2025-02-01

### UI/UX Improvements

This release focuses on streamlining the user interface and improving the direct upload experience.

### Changed
- **Simplified Create Panel**: Removed the dual-button interface and streamlined to a single "Send to Slack" button
- **Direct Upload Flow**: The primary button now uploads directly to Slack without showing additional dialog options
- **Improved Button Layout**: Single full-width button provides better visual hierarchy and cleaner interface

### Fixed
- **Button Event Listeners**: Fixed timing issues where buttons weren't responding to clicks due to DOM loading order
- **Event Handler Attachment**: Properly attach event listeners after buttons are created and visible
- **Duplicate Listeners**: Prevented multiple event listeners from being attached to the same buttons

### Technical Improvements
- Moved event listener attachment to happen after button creation
- Added data attributes to prevent duplicate event listener attachment
- Cleaned up old duplicate code and improved code organization
- Better error handling and debugging for button interactions

## [1.1.0] - 2025-01-31

### Major Release - Authentication Fixed

This release resolves all authentication issues with connecting to the Emoji Studio app.

### Key Improvements
- ✅ Fixed "not_authed" error when syncing with Emoji Studio
- ✅ Correctly captures and uses xoxc API tokens from Slack
- ✅ Improved token prioritization (xoxc tokens over xoxd tokens)
- ✅ Better error handling and user guidance
- ✅ Enhanced debugging for troubleshooting

### Features
- Direct emoji upload to Slack from the extension
- Drag and drop support for images and videos
- Bulk emoji management with renaming
- Seamless integration with Emoji Studio app
- Cart system for collecting emojis before upload

### Technical Improvements
- Proper token extraction from Slack API requests
- Persistent authentication storage
- Multipart form data handling
- Chrome extension best practices implementation

## [1.0.19] - 2025-01-31

### Fixed
- Fixed token priority - now uses xoxc tokens from form data instead of xoxd tokens from cookies
- The extension was capturing the correct token but using the wrong one
- Prioritize formToken over cookie token for authentication

### Improved
- Better token selection logic
- Debug logging shows which token is chosen

## [1.0.18] - 2025-01-31

### Fixed
- Removed script injection that was interfering with token capture
- Added comprehensive debugging for form data capture
- Check all form data fields for tokens

### Improved
- Better logging of all API requests and form data
- Show all form data fields when token is not found
- More detailed debugging information

## [1.0.17] - 2025-01-31

### Fixed
- Added comprehensive token search in Slack global variables
- Improved debugging for token capture
- Added periodic token checking
- Search for tokens in boot_data and other Slack globals

### Improved
- Better logging to identify where tokens are stored
- Multiple fallback methods to find tokens
- Manual token check every 5 seconds

## [1.0.16] - 2025-01-31

### Fixed
- Inject script to capture xoxc tokens from Slack API calls
- Properly intercept fetch requests to extract tokens
- Fixed "not_authed" error by capturing the correct token type

### Added
- Script injection to capture tokens directly from page context
- Message passing to relay captured tokens to extension

## [1.0.15] - 2025-01-31

### Fixed
- Fixed token extraction from Slack authentication
- Added fallback to use formToken if main token is missing
- Improved debugging for token capture
- Store token directly in captured data

### Improved
- Better logging for authentication debugging
- Handle both token and formToken fields
- More robust token extraction from multiple sources

## [1.0.14] - 2025-01-31

### Fixed
- Fixed "not_authed" error when connecting to Emoji Studio app
- Curl command now matches exact format expected by Emoji Studio
- Properly captures xId from both headers and URL
- Multipart form data format matches Slack API requirements

### Improved
- Better xId extraction from multiple sources
- Curl command includes all required headers
- Form data boundary handling matches WebKit format

## [1.0.13] - 2025-01-31

### Fixed
- Improved token extraction from Slack API requests
- Added URL token extraction as fallback
- Enhanced debugging for authentication issues
- Better error messages when token is missing

### Improved
- More comprehensive token extraction from multiple sources
- Debug logging to identify authentication problems
- Clear guidance when users need to visit Slack workspace

## [1.0.12] - 2025-01-31

### Fixed
- Fixed service worker syntax error with await in non-async context
- Properly structured async code in upload handler

## [1.0.11] - 2025-01-31

### Fixed
- Store Slack authentication as curl command for persistent auth (like Emoji Studio app)
- Use stored authentication for uploads instead of requiring active Slack session
- Parse stored curl command when uploading emojis

### Improved
- Authentication data is now stored persistently when visiting Slack emoji page
- Uploads work even after browser restart using stored credentials
- Better alignment with how Emoji Studio app handles authentication

## [1.0.10] - 2025-01-31

### Fixed
- Improved authentication error handling with clearer user guidance
- Added "Visit Slack" button when authentication fails
- Stop bulk uploads immediately on authentication failure
- Enhanced error messages to guide users through re-authentication

### Improved
- Better debugging for authentication issues
- More comprehensive header capture for Slack API requests
- Clear instructions when Slack session expires
- User-friendly authentication failure recovery flow

## [1.0.9] - 2025-01-31

### Fixed
- Fixed "not_authed" error by properly decoding URL-encoded tokens
- Improved token extraction from cookies with URL decoding
- Better handling of encoded form tokens

### Improved
- More robust token parsing with fallback strategies
- Decode tokens from 'd' cookie before use
- Handle both encoded and non-encoded token formats

## [1.0.8] - 2025-01-31

### Fixed
- Fixed "Missing Slack authentication data" error during direct uploads
- Improved authentication data capture to include all headers
- Better token extraction from multiple sources (cookies, headers, form data)
- More flexible authentication validation

### Improved
- Store full authentication headers for reliable uploads
- Extract tokens from authorization headers, cookies, and form data
- Preserve complete cookie header for API requests

## [1.0.7] - 2025-01-31

### Fixed
- Fixed "Extension context invalidated" error on slackmojis.com
- Added proper error handling for Chrome API calls
- Added fallback UI elements when extension context is lost
- Improved resilience when extension is reloaded or updated

### Improved
- Better error messages for users when extension needs to be refreshed
- Graceful degradation with emoji fallbacks when logos can't load

## [1.0.6] - 2025-01-31

### Fixed
- Fixed regex pattern error in emoji name validation
- Fixed service worker registration error (Status code: 15)
- Implemented true direct upload to Slack from the extension

### Added
- Direct emoji upload to Slack without leaving the extension
- Automatic fallback mechanism that opens a Slack tab if needed
- Smart upload strategy that works with or without an open Slack tab

### Improved
- Upload progress shows individual emoji status
- Better error messages for specific failure cases
- Rate limiting protection with delays between uploads

## [1.0.5] - 2025-01-31

### Added
- Direct Slack upload functionality from the Create tab
  - Upload emojis directly to Slack without leaving the extension
  - Progress tracking for bulk uploads
  - Detailed error reporting for failed uploads
  - Choice between direct upload or opening in Emoji Studio app
- Upload dialog with modern UI
  - Shows workspace information
  - Real-time progress bar
  - Success/error summary
  - Individual error details for failed uploads

### Improved
- Enhanced user workflow with two upload options
- Better error handling and user feedback
- Smooth animations and transitions

## [1.0.3] - 2025-01-30

### Added
- HDR image handling support for Emoji Studio integration
- Enhanced Slackmojis integration with "Add to Slack" functionality
- Support for Slackmojis search results pages

### Fixed
- Fixed Slackmojis buttons not appearing on search results
- Removed unnecessary console.log statements for cleaner production code

### Improved
- Updated extension distribution to Chrome Web Store
- Code cleanup and performance optimizations

## [1.0.1] - 2025-01-28

### Changed
- Removed the "Clear Data" button from the extension popup - only "Sync to Emoji Studio" button remains
- Made the notification toast that appears when detecting Slack data more subtle and compact
  - Reduced font size from 13px to 12px
  - Smaller padding and dimensions
  - Darker green background color
  - Faster, more subtle animations
  - Changed message from "Custom Slack emoji data fetched successfully!" to "Emoji data captured"

### Improved
- Enhanced visual feedback for better user experience
- Streamlined the extension UI by removing unnecessary functionality

## [1.0.0] - 2025-01-27

### Initial Release
- Sync custom Slack emojis to Emoji Studio
- Automatic detection of Slack workspace data
- One-click sync functionality
- Support for multiple Slack workspaces
- Context menu integration for creating emojis from images