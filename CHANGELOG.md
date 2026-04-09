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

#### Chrome Extension (v2.0–2.1)
- One-click Slack data sync without developer tools
- Cross-tab data synchronization
- Context menu integration for quick emoji creation
- Automatic background sync with notification support
- Cart sync from extension to creator page
- Bulk emoji reactions: multi-react to any Slack message with a single click
- Emoji info tooltip: hover over any reaction to see creator, creation date, and link to details
- Rainbow sync button on Slack's emoji customization page (replaces transient banner)
- Settings tab for Slack app configuration
- Emoji reaction hover popover and "My Emojis" tab in picker

#### iOS App
- Native iOS app available on the App Store
- QR code pairing for instant data transfer from desktop
- Full Emoji Wrapped support in iOS WebView
- Share and download support with platform-specific fallbacks

### Design System Overhaul
- Tailwind CSS v3 → v4 migration: `@import` syntax, `@theme` directives, oklch color space
- shadcn/ui Luma preset (radix-luma): updated 46 UI components with rounded geometry and soft surfaces
- Fixed 105+ `hsl(var())` color references across 21 files for v4 compatibility

### Animations & Motion
- Framer Motion spring stagger entrance animations across all pages
- Dashboard: NumberTicker animated counters, card hover lift effects, animated reaction bars
- Bento grid layout on dashboard (chart + usage side-by-side on desktop)
- Shared animation foundation (`lib/motion.ts`): spring presets, stagger containers, fadeUp/scaleFade/cardHover variants
- RainbowButton contrast fix for light mode

### UI/UX Overhaul
- Settings page: 2-column sidebar → single-column iOS-style layout with sticky frosted-glass nav, IntersectionObserver active section highlighting (700 → 250 lines)
- Dashboard: hero metric card layout (Total Emojis prominent, others in 3-col), leaderboard-first content order
- Scan progress: error + completion states with AnimatePresence, retry button in channel picker
- Ghost preview empty states showing data shape before first scan
- Dynamic date labels on stats cards (Today/This Week/This Month/3 Months)
- Comprehensive UI/UX polish across all pages
- Web Interface Guidelines compliance audit and fixes
- Create page redesigned with glass effects and tab-based navigation
- Tablet layout improved with floating action bar
- Pack browser sidebar removed in favor of inline navigation
- Consistent modal animations standardized across the app
- Dark mode contrast fixes across all components
- Explorer card overlap and text visibility fixes
- Upload drop zone now fills available height
- Replaced hardcoded sky/emerald/cyan colors with semantic tokens
- Sidebar: single-signal active state, semantic badge colors, extracted FeedbackModal component

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
- Aria-labels on metric cards, chart containers, and interactive elements
- 44px minimum touch targets on quick actions and navigation items

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
- Tailwind CSS v4 with `@tailwindcss/postcss` and `tw-animate-css`
- Framer Motion for page transitions and micro-interactions
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
