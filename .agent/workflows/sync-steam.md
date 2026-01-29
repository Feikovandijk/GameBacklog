---
description: Run Steam data synchronization and refresh workers
---

# Steam Data Synchronization

Workflows for syncing Steam game data to the database.

## Initial Setup (First Time)

1. Ensure API is built:
   // turbo

```bash
cd api && npm run build
```

2. Import Steam app list (~150k games):

```bash
cd api && npm run sync:games
```

## Ongoing Data Refresh

### Single Worker (Development)

Run the refresh worker to enrich game metadata:

```bash
cd api && npm run refresh:games
```

### Multiple Workers (Production)

For faster processing, run parallel workers with sharding:

```bash
# Terminal 1 - Worker 0
WORKER_ID=0 TOTAL_WORKERS=3 node dist/services/steam-refresh-service.js

# Terminal 2 - Worker 1
WORKER_ID=1 TOTAL_WORKERS=3 node dist/services/steam-refresh-service.js

# Terminal 3 - Worker 2
WORKER_ID=2 TOTAL_WORKERS=3 node dist/services/steam-refresh-service.js
```

## Player Count Updates

Sync current player counts (run hourly via cron):
// turbo

```bash
cd api && npm run sync:players
```

## Recalculate Statistics

After major data imports, recalculate aggregated stats:
// turbo

```bash
cd api && npm run recalculate:stats
```

## Troubleshooting

- **Rate Limited**: Use multiple Steam API keys (`STEAM_API_KEY_0`, `STEAM_API_KEY_1`, ...)
- **Worker stuck**: Check `WORKER_ID` and `TOTAL_WORKERS` env vars are set
- **Missing games**: Re-run `sync:games` to fetch new releases
