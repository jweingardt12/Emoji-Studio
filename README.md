# Emoji Studio: Analytics Platform for Slack Custom Emojis

<p align="left">
  <a href="https://www.producthunt.com/posts/emoji-studio-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-emoji&#0045;studio&#0045;2">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=969390&theme=light&t=1748379392664" alt="Product Hunt" height="82" />
  </a>
  <span>&nbsp;</span>
  <a href="https://apps.apple.com/us/app/emoji-studio-for-slack/id6751079971?itscg=30200&itsct=apps_box_badge&mttnsubad=6751079971">
    <img src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/en-us?releaseDate=1758844800" alt="Download on the App Store" height="82" />
  </a>
</p>

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-☕-FFDD00?logo=buymeacoffee&logoColor=000&labelColor=555&style=for-the-badge)](https://www.buymeacoffee.com/jasonw)

![Emoji Studio Dashboard](/assets/screenshots/og-image.png)

## Overview

Emoji Studio is a comprehensive analytics and management platform for Slack custom emojis. Track creation trends, identify top contributors, and manage your workspace's emoji library through a modern dashboard interface. All processing happens in your browser with zero server-side data storage.

## Features

### Analytics Dashboard
- Real-time metrics for total emojis, unique creators, and weekly growth
- Contributor leaderboard with historical performance tracking
- Time-series analysis of emoji creation patterns
- Activity heatmaps showing peak creation periods
- Individual user profiles with detailed contribution metrics
- Quick action buttons for creating, browsing, and exploring emojis

### Emoji Explorer
- Full-text search across emoji names, creators, and user IDs
- Advanced filtering by date ranges with sort options (newest, oldest, A-Z)
- Bulk selection with Shift+Click support and bulk ZIP download
- Virtualized grid for smooth performance with large collections
- Copy emoji code (`:name:`), URL, or image directly to clipboard
- Individual emoji download and inline bulk action bar

### Emoji Creator
- Drag-and-drop upload for images, GIFs, and videos (PNG, JPG, GIF, WebP, MP4, MOV)
- Video-to-GIF conversion with configurable frame rate (FFmpeg, runs in browser)
- ML-based background removal (WebAssembly, no server required)
- HDR image support (HEIC, HEIF, AVIF, JXL) with automatic conversion
- Automatic resizing (128x128px) and compression (≤128KB) for Slack
- Direct upload to Slack workspaces with batch processing
- **Browse Packs**: Search and import from slackmojis.com with category filtering, multi-select (up to 20), bulk download as ZIP, and bulk upload to Slack

### My Emojis
- Personal emoji management dashboard with table and grid views
- Rename, replace, add aliases, or delete emojis from your workspace
- Bulk operations: select all, download, delete
- Keyboard shortcuts (Cmd/Ctrl+K for search) and context menus
- Filter by type (images/GIFs) and alias status

### Leaderboard
- Contributor rankings with multiple date ranges (7d, 30d, quarter, year, all time)
- L4WEPW metric (Last 4 Weeks Emojis Per Week) with trend indicators
- Generate and share leaderboard images with date range context
- Search users and filter inactive contributors with configurable threshold

### Emoji Wrapped
- Spotify Wrapped-style annual review of your workspace's emoji activity
- 10+ animated story slides: personal stats, milestones, naming patterns, vibe analysis, quiz, and more
- Shareable story cards and downloadable images
- Works with demo data for onboarding

### Emoji Detail Pages
- Individual pages for each emoji with large preview
- Creator information, creation date, and alias status
- Copy emoji code, download, and browse the creator's other emojis

### Data Visualizations
- Four-tab dashboard: Overview, Activity, Creators, and Content
- Time range filtering (7d, 30d, 90d, 6 months, 1 year, all time)
- Word frequency analysis, creation timelines, and naming pattern charts
- Distribution charts for static vs animated emojis
- Contributor participation metrics and trend analysis

### Notifications
- Background monitoring for new emoji additions
- Configurable check intervals (15 minutes to daily)
- Browser notifications with direct links to new content
- Requires Chrome extension for background operation

### Chrome Extension
- One-click authentication without developer tools
- Automatic background synchronization
- Context menu integration for quick emoji creation
- Cross-tab data synchronization
- Powers notification system for real-time updates

## Installation

### Via Chrome Extension (Recommended)
1. Install the [Emoji Studio Chrome Extension](https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa)
2. Click extension icon → "Sync Slack Data"
3. Visit [app.emojistudio.xyz](https://app.emojistudio.xyz)
4. Data loads automatically

### Via Mobile Pairing
1. Open [app.emojistudio.xyz](https://app.emojistudio.xyz) on desktop
2. Go to Settings → Connection → Pair to Mobile
3. Scan the QR code with the iOS app or another device
4. Data transfers automatically via encrypted session

### Manual Setup
1. Navigate to [app.emojistudio.xyz](https://app.emojistudio.xyz)
2. Open Settings → Connection
3. Follow browser developer tools instructions
4. Paste Slack authentication credentials

## Privacy & Security

- **Browser-only storage**: All data stays in localStorage and IndexedDB
- **No server persistence**: Zero backend data retention
- **Direct API access**: Connects directly to Slack
- **Data portability**: Export or delete at any time
- **Open source**: Full code transparency

## Screenshots

### Main Dashboard
![Dashboard View](/assets/screenshots/main-dashboard-view.png)
*Metrics overview with contributor leaderboard and growth charts*

### Emoji Explorer
![Explorer View](/assets/screenshots/explorer-view.png)
*Browse and manage emoji collections with advanced filtering*

### User Analytics
![User Dashboard](/assets/screenshots/user-dashboard-view.png)
*Individual contributor statistics and activity history*

### Data Visualizations
![Visualizations](/assets/screenshots/visualizations-view.png)
*Interactive charts for emoji usage patterns and trends*

### Emoji Details
![Emoji Details](/assets/screenshots/emoji-details-overlay.png)
*Metadata view with download and sharing options*

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Runtime**: React 19 with React Compiler
- **UI**: shadcn/ui (Radix UI primitives), Framer Motion
- **Styling**: Tailwind CSS
- **Charts**: Recharts, Chart.js
- **Media Processing**: Canvas API, GIF.js, FFmpeg (WASM), @imgly/background-removal
- **Storage**: IndexedDB, localStorage
- **Analytics**: OpenPanel
- **Hosting**: Vercel

## Contributing

Contributions welcome. Areas of interest:
- Bug fixes and performance improvements
- Additional data visualizations
- Enhanced filtering capabilities
- UI/UX refinements
- Documentation improvements

Submit pull requests at [github.com/jweingardt12/Emoji-Studio](https://github.com/jweingardt12/Emoji-Studio)

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Issues**: [github.com/jweingardt12/Emoji-Studio/issues](https://github.com/jweingardt12/Emoji-Studio/issues)  
**Source**: [github.com/jweingardt12/Emoji-Studio](https://github.com/jweingardt12/Emoji-Studio)