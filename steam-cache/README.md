# Steam Game Cache

This directory contains a script and SQLite database for caching the Steam app list locally, and a system for caching Steam achievements per game.

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```

2. Run the sync script to fetch the latest Steam app list:
   ```sh
   node sync-steam-apps.js
   ```

## Database
- The database file is `steam-apps.sqlite`.
- The main table is `apps` with columns: `appid`, `name`.
- Achievements are cached in the `achievements` table: `appid`, `data`, `last_updated`.

## Achievements Caching
- Use the exported function from `achievements.js`:
  ```js
  const { getAchievements } = require('./achievements');
  // Usage: getAchievements(appid, steamApiKey)
  ```
- This will cache results for 7 days and rate-limit requests.

## Daily Sync Scheduler
- To run the app list sync daily at 3am (no system cron needed):
  ```sh
  node scheduler.js
  ```
- Leave this running in the background on your server.

## Future
- This can be extended to run as a server or be hosted remotely. 