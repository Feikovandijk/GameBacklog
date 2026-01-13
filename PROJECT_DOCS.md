# GameBacklog Project Documentation

## 1. Overview

GameBacklog is a comprehensive Steam game library management system. It allows users to sync their Steam libraries, track their backlog, view advanced analytics, and see developer-focused insights about the Steam platform.

### Architecture

- **API (`/api`)**: Node.js/Express backend using Supabase (PostgreSQL). Handles data synchronization with Steam's API.
- **User Dashboard (`/user-dashboard`)**: React + Vite frontend for end-users to manage their games.
- **Developer Dashboard (`/devdashboard`)**: React + Vite frontend for platform-wide analytics.
- **Database**: Supabase (Cloud PostgreSQL).
- **Deployment**: containerized via Docker (Docker Compose).

---

## 2. Getting Started

### Prerequisites

- Node.js 22+ (v22 recommended for Docker consistency).
- Docker & Docker Compose.
- Supabase Project (URL + Keys).
- Steam API Key([Get one here](https://steamcommunity.com/dev/apikey)).

### Local Setup

1.  **Clone & Install**:
    ```bash
    npm install
    cd api && npm install && cd ..
    cd user-dashboard && npm install && cd ..
    cd devdashboard && npm install && cd ..
    ```
2.  **Environment Variables**:
    Create a `.env` file in the root directory (see `Environment Configuration` section below).
3.  **Run Locally**:

    ```bash
    # Run API
    cd api && npm run dev

    # Run User Dashboard
    cd user-dashboard && npm run dev
    ```

---

## 3. Data Pipeline & Automation

The core value of GameBacklog is its automated data pipeline which keeps Steam data fresh.

### key Services

#### 1. Steam AppID Sync (`sync:games`)

- **Source**: `api/src/services/steam-sync-service.ts`
- **Purpose**: Fetches the master list of all ~150,000+ AppIDs from Steam.
- **Logic**:
  1.  Hits `ISteamApps/GetAppList`.
  2.  Diffs against existing DB entries.
  3.  Upserts new games.
- **Frequency**: Run once initially, or periodically (e.g., monthly) to find new releases.

#### 2. Game Refresh Worker (`refresh:games`)

- **Source**: `api/src/services/steam-pics-refresh-service.ts`
- **Purpose**: The "heavy lifter". Fetches detailed metadata (images, description, tags, price, release date).
- **Logic**:
  - **PICS System**: Uses Steam's "changenumber" system to get a list of all apps that have been added or updated since the last run.
  - **Login**: Logs into Steam anonymously using `steam-user`.
  - **Efficiency**: Only processes games that have actually changed on Steam, rather than iterating through the entire database.
  - **Batching**: Processes games in batches to efficiently query the database and fetch data.
  - **Rate Limiting**: Strictly limited to stay under Steam's rate limits.

#### 3. Player Count Sync (`sync:players`)

- **Source**: `api/src/services/steam-player-count-sync-service.ts`
- **Purpose**: Tracks concurrent player numbers.
- **Logic**:
  - Runs on a tighter loop (e.g., hourly).
  - Updates the specific `player_count` field only.
  - Auto-disables sync for dead games (0 players for 24h).

---

## 4. Script Reference

### API Scripts (`/api`)

| Script             | Command                     | Description                                                    |
| :----------------- | :-------------------------- | :------------------------------------------------------------- |
| **Dev Server**     | `npm run dev`               | Starts server with hot-reload (`ts-node-dev`).                 |
| **Build**          | `npm run build`             | Compiles TS to JS in `/dist`.                                  |
| **Start**          | `npm start`                 | Runs the compiled production server.                           |
| **Sync List**      | `npm run sync:games`        | Fetches master AppID list from Steam.                          |
| **Enrich All**     | `npm run sync:enrich`       | Runs the enrichment logic (manual trigger).                    |
| **Refresh Worker** | `npm run refresh:games`     | **Main Production Worker**. Runs the detailed enrichment loop. |
| **Recalc Stats**   | `npm run recalculate:stats` | Manually triggers stats aggregation (total games, etc.).       |

### Frontend Scripts (`/user-dashboard` & `/devdashboard`)

| Script         | Command           | Description                                 |
| :------------- | :---------------- | :------------------------------------------ |
| **Dev Server** | `npm run dev`     | Starts Vite dev server.                     |
| **Build**      | `npm run build`   | Builds strict static assets for production. |
| **Preview**    | `npm run preview` | Locally preview the production build.       |

---

## 5. Deployment

### Docker Setup

The project is fully containerized.  
**Images**:

- `feikovd/gamebacklog-api`
- `feikovd/gamebacklog-userdash`
- `feikovd/gamebacklog-devdash`

**Run with Compose**:

```bash
docker-compose up -d
```

_Note: The `docker-compose.yml` expects environment variables to be passed from the host (e.g., Portainer) or a `.env` file._

### CI/CD (GitHub Actions)

A workflow `.github/workflows/docker-publish.yml` is configured to:

1.  Trigger on push to `main`.
2.  Login to **Docker Hub**.
3.  Build optimized `linux/amd64` images.
4.  Push `latest` tags to the registry.

**Required Secrets**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`.

### Cross-Platform Building

If building manually on Mac (ARM64) for a Linux Server (AMD64):

```bash
docker buildx build --platform linux/amd64 -t <image> . --push
```

---

## 6. Development Standards

_See `DEVELOPMENT.md` for full details._

- **Linting**: ESLint + Prettier enabled.
- **Formatting**: Run `npm run format` before commits.
- **Testing**: Jest configured for API.
