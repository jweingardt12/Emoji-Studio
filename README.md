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

### Emoji Explorer
- Full-text search across emoji names and creators
- Advanced filtering by date ranges and user IDs
- Bulk export functionality with ZIP download
- Grid view with lazy loading for large collections
- Direct integration with Slack for seamless updates

### Emoji Creator
- Image optimization for Slack's technical requirements
- Video to GIF conversion with frame rate control
- Automatic resizing and compression
- Direct upload to Slack workspaces
- Batch processing for multiple files

### Notifications
- Background monitoring for new emoji additions
- Configurable check intervals (15 minutes to daily)
- Browser notifications with direct links to new content
- Requires Chrome extension for background operation

### Data Visualizations
- Word frequency analysis for emoji naming patterns
- Creation timeline with monthly and weekly aggregations
- Distribution charts for static vs animated emojis
- Contributor pie charts and participation metrics
- Trend analysis for workspace emoji growth

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

### Manual Setup
1. Navigate to [app.emojistudio.xyz](https://app.emojistudio.xyz)
2. Open Settings → Connection
3. Follow browser developer tools instructions
4. Paste Slack authentication credentials

## Privacy & Security

- **Browser-only storage**: All data remains in localStorage
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

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI**: shadcn/ui components
- **Styling**: Tailwind CSS
- **Charts**: Recharts, Chart.js
- **Image Processing**: Canvas API, GIF.js
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