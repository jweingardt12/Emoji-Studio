# Changelog

## 2.0.0 (2026-04-08)

A massive release with 360+ commits bringing a brand-new Usage Analytics page, a complete UI/UX overhaul, security hardening, performance optimizations, and much more.

### New Features

#### Usage Analytics (Reactions Dashboard)
- Scan Slack channels to see how custom emojis are actually used as reactions
- Progressive scan pipeline with per-channel progress animation
- Stats cards: total reactions, unique emojis, unique reactors, top reactions
- Top Reactions bar chart with emoji previews and creator info
- Reaction Timeline showing usage over time
- Channel Breakdown with top reactions and top reactors per channel
- Your Reactions section (filtered to current user)
- Top Creators and Top Reactors leaderboards
- Shareable PNG card generator with download and clipboard copy
- Channel picker with Select All, date range filters (24h, 7d, 30d, 90d)
- "How It Works" info modal explaining scanning and privacy
- Clickable emojis with overlay navigation throughout the page

#### Usage Data Across the App
- Emoji detail pages now show reaction count, rank, and unique reactors
- Emoji overlay/drawer shows usage stats inline
- Explorer grid has a "Most Used" sort option with reaction count badges
- Dashboard section cards include a "Top Reaction" card

#### Emoji Wrapped Experience
- Spotify Wrapped-style annual review of workspace emoji activity
- 10+ animated story slides: personal stats, milestones, naming patterns, vibe analysis, quiz
- Monthly Emoji Champions slide
- Shareable story cards with dynamic emoji grids and vibrant gradients
- Design variants with improved mobile responsiveness
- Milestones up to 50K with dramatic preloader reveal
- iOS WebView share/download support with bulletproof fallbacks

#### Pack Browser Enhancements
- Redesigned with tabs, grid view, and category filtering
- Fuzzy multi-term search with ranking
- Bulk upload to Slack with custom name support
- Direct download and "Send to Slack" buttons
- Real-time emoji name availability checking

#### Chrome Extension Integration
- One-click Slack data sync without developer tools
- Cross-tab data synchronization
- Context menu integration for quick emoji creation
- Automatic background sync with notification support
- Cart sync from extension to creator page

### UI/UX Overhaul
- Comprehensive UI/UX polish across all pages
- Web Interface Guidelines compliance audit and fixes
- Create page redesigned with glass effects and tab-based navigation
- Settings page redesigned for cleaner UX
- Tablet layout improved with floating action bar
- Pack browser sidebar removed in favor of inline navigation
- Consistent modal animations standardized across the app
- Dark mode contrast fixes across all components
- Explorer card overlap and text visibility fixes
- Upload drop zone now fills available height

### Performance
- 50-70% faster initial load on Visualizations
- 60-80% faster time range changes
- 40% reduction in memory usage
- Virtualized explorer grid for smooth scrolling with large collections
- Optimized emoji image component for better GIF performance
- Bundle import optimization and reduced file processing delays
- Reduced re-renders, fixed memory leaks, removed unused dependencies
- Lazy-loaded components for faster initial page load

### Security
- Rate limiting on API routes with memory leak fix
- CORS deduplication and emoji validation hardening
- URL validation and sanitization on proxy routes
- Cookie extraction regex fix in curl parser
- Comprehensive test coverage for security utilities

### Accessibility
- WCAG contrast audit and fixes for design tokens
- `prefers-reduced-motion` guards on all animations (BlurFade, AnimatePresence, step transitions)
- Standardized hover transition durations on interactive elements
- Badge text contrast fixes for status indicators
- Glassmorphism component contrast improvements

### Other Improvements
- OpenPanel analytics with user identification, workspace context, and self-hosted API
- QR code pairing with compression for mobile data transfer
- PWA support with mobile bottom navigation and pull-to-refresh
- iOS Safari viewport and safe area support
- Notification system for new emoji monitoring (configurable intervals)
- Leaderboard percentile calculation fix
- Wrapped components updated to use previous year for statistics
- IndexedDB storage with reliable clear/delete operations
- Jest test configuration and comprehensive test suite

### Dependencies
- Next.js upgraded to 16.x
- React 19 with React Compiler
- Security patches for Next.js (CVE-2025-55182)
- Updated FFmpeg, gif.js, lodash-es, and other packages

---

## 1.2.0 (2025-11-05)

New charts, native iOS app, better performance.

- 10 new visualization charts across 4 tabs (Overview, Activity, Creators, Content)
- My Emojis bulk actions, context menus, and keyboard shortcuts
- Explorer hover previews and quick copy actions
- Dashboard animations and polish
- Native iOS App Store link
- 50-70% faster Visualizations page

## 1.1.0 (2025-07-17)

Image and video formatting.

- Emoji Creator tool with multi-format support (PNG, JPG, GIF, MP4, MOV, WebM)
- Smart video-to-GIF conversion with frame sampling
- Automatic resizing (128x128px) and compression (128KB)
- Batch processing with progress tracking
- All processing runs locally in the browser
