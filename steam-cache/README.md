# Steam Game Cache

This directory contains a script and SQLite database for caching the Steam app list locally.

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

## Future
- This can be extended to run as a server or be hosted remotely. 