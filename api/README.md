# GameBacklog API

This directory contains the backend API server and associated services for the GameBacklog application.

## Available Scripts

### `npm run dev`

Starts the main API server in development mode using `ts-node-dev`. The server will automatically restart when file changes are detected. This is the primary command you will use for development.

### `npm start`

Starts the API server from the compiled JavaScript files in the `dist/` directory. You must run `npm run build` first. This is typically used for production environments.

### `npm run build`

Compiles the TypeScript source code from `src/` into JavaScript in the `dist/` directory.

### `npm run sync:games`

This script performs an initial sync of games from your Steam library into the database. It should typically only be run once during the initial setup.

### `npm run sync:games:pics`

This script refreshes the header images for all games.

### `npm run sync:players`

This script syncs the current player count for all games.

### `npm run sync:enrich`

This script enriches the game data with additional information from the Steam API.

### `npm run refresh:games`

This is the most important service for keeping the game database up-to-date. It runs a worker process that fetches the latest game information from Steam.

**Running a Single Worker:**

If you are running the service on a single machine, you can run it directly:

```bash
npm run refresh-games
```

### `npm run setup-db`

Executes a script to set up the necessary collections and indexes in your Appwrite database. This is a one-time setup command.

### `npm run recalculate-stats`

A utility script to manually recalculate the summary statistics for the dashboard. 