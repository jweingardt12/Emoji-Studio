# 🥳🤠 Emoji Studio: Where the only OKR is LOL 📊📈

## What is this?

Ever wondered how many custom emojis your Slack workspace has? Curious about the most common words in emoji names, or whether your teammates prefer GIFs or static images? Want to see who creates the longest-named emojis? You’re in the right place.

This dashboard takes your Slack emoji data (not usage!) and turns it into a smorgasbord of dazzling charts, fun facts, and interactive surprises. Any Slack user can use it, and the app runs ok browser local storage entirely—nothing is stored on any server. 


## Why would you build this?

Every company I've worked at has had one thing in common: an extremely robust library of custom Slack emojis.

## Screenshots

> _Insert screenshots here of the dashboard in full, a modal popup, and a chart with a ridiculous amount of data._

## How do I use this?

1. Clone this repo (you know the drill).
2. Install dependencies:  
   ```bash
   npm install
   ```
3. Get your Slack emoji export (don’t worry, we won’t tell HR).
4. Set up your environment variables as described below.
5. Run the app:
   ```bash
   npm run dev
   ```
6. Open your browser and bask in the glory of emoji analytics.

## Configuration

You’ll need a valid Slack token and your emoji export. If you see `invalid_auth`, your token is probably as expired as that yogurt in your fridge.

## Tech Stack

- Next.js
- TypeScript
- shadcn/ui 
- Chart.js
- Tailwind CSS

## Contributing

Pull requests welcome! Bonus points for adding new charts, fixing bugs, or sneaking in more puns.
