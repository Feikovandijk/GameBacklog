# GameBacklog Manager

A Steam game library management system with a TypeScript backend, a Vite + React user dashboard, analytics & automated Steam data synchronization.

Note: The developer analytics dashboard (devdashboard) is intentionally omitted from this documentation.

Quick links:
- API source: api/
- User dashboard: user-dashboard/
- Database setup script: api/src/scripts/setup_database.sql
- Docker Compose: docker-compose.yml
- PM2 process definitions: ecosystem.config.js
- CI: .github/workflows/ci.yml
- Example env: .env.example

---

## Table of contents

- About
- Architecture overview
- Prerequisites
- Quick start (local)
- API — development & production
- User dashboard — development & production
- Steam data pipeline (sync & workers)
- Database setup (Supabase / Postgres)
- Docker (compose)
- Production with PM2
- CI / Testing / Linting
- Configuration (env variables)
- Security & deployment notes
- Troubleshooting
- Contributing
- Where to look next

---

## About

GameBacklog Manager aggregates Steam game metadata and lets users manage a personal backlog (user library), track playtime and achievements, and power dashboards/analytics. It includes:

- API: Node.js + TypeScript server (api/)
- Background workers: Steam sync / refresh / player counts / enrichment
- User Dashboard: Vite + React TypeScript UI (user-dashboard/)
- Postgres-compatible DB schema & RLS (setup script included)
- Docker Compose for containerized local / quick deployments
- PM2 ecosystem for production process orchestration
- CI pipeline for linting, type-check and builds

---

## Architecture overview

GameBacklog/
- api/ — Backend API, workers, scripts, DB migration SQL
- user-dashboard/ — User-facing Vite + React app
- docker-compose.yml — Local container orchestration
- ecosystem.config.js — PM2 process definitions for production
- .env.example — Environment variables required

In production you typically run:
- API server (express)
- One or more steam-refresh worker(s) (parallel data enrichment)
- Optional scheduled jobs (recalculations)
- Database: Supabase / Postgres

---

## Prerequisites

- Node.js 18+ (repo uses TypeScript; CI uses Node 20.x)
- npm
- A Postgres-compatible database (Supabase recommended)
- Steam Web API key: https://steamcommunity.com/dev/apikey
- (Optional) PM2 for production
- (Optional) Docker & docker-compose

---

## Quick start (local)

1. Clone the repository:
   ```bash
   git clone https://github.com/Feikovandijk/GameBacklog.git
   cd GameBacklog
   ```

2. Install dependencies (root installs dev tooling for git hooks; then install each subproject):
   ```bash
   npm install   # sets up husky, lint-staged (prepare hook)
   npm install --prefix api
   npm install --prefix user-dashboard
   ```

3. Copy .env and edit:
   ```bash
   cp .env.example .env
   # Edit .env to include your SUPABASE_*, STEAM_API_KEY*, SESSION_SECRET etc.
   ```

4. Setup database (see Database section below) and run the API + dashboard locally (next sections).

---

## API — development & production

API lives in the `api/` directory. Key scripts are listed in `api/package.json`.

Common commands:

- Development (hot reload):
  ```bash
  cd api
  npm run dev
  # Server runs on the configured PORT (default 6543)
  ```

- Build (TypeScript -> dist):
  ```bash
  cd api
  npm run build
  ```

- Start production (after build):
  ```bash
  cd api
  npm start
  ```

- Run tests:
  ```bash
  cd api
  npm test
  ```

- Useful helper scripts (one-off or operator scripts):
  ```bash
  npm run sync:games         # initial Steam games import (ts-node)
  npm run sync:games:pics    # refresh header images
  npm run sync:players       # update current player counts
  npm run sync:enrich        # enrich games (ts-node script)
  npm run refresh:games      # start compiled worker (node dist/...) for continuous refresh
  npm run recalculate:stats  # recalc summary stats
  npm run recalculate:analytics # recalc analytics (node compiled)
  ```

API health & endpoints
- Health: GET /api/health (confirm server is up)
- Auth & user endpoints handled by Steam OAuth and session; see api/src/auth and api/src/index.ts for details.

CORS and sessions:
- The server uses express-session and a whitelist of allowed origins (localhost by default and FRONTEND_URL from .env).
- In production validate FRONTEND_URL and use HTTPS.

Where to look:
- Entry: api/src/index.ts
- Config: api/src/config/index.ts
- Supabase client: api/src/supabase/client.ts
- Steam services: api/src/services/*.ts

---

## User dashboard — development & production

The frontend is a Vite + React TypeScript project in `user-dashboard/`.

Commands:

- Development:
  ```bash
  cd user-dashboard
  npm run dev
  # Opens on http://localhost:5173 by default
  ```

- Build:
  ```bash
  cd user-dashboard
  npm run build
  ```

- Preview production build:
  ```bash
  cd user-dashboard
  npm run preview
  ```

By default the dashboard expects the API at BACKEND_URL (see .env.example). For local dev you can use `VITE_API_URL=/api` + a local reverse proxy or run both API and dashboard and configure CORS accordingly.

---

## Steam data pipeline (sync & workers)

This project uses multiple services to keep Steam game data current.

Important scripts:
- steam-sync-service.ts — one-time full Steam app list import (~265k games). Run during initial DB setup.
- steam-refresh-service.ts — long-running worker to fetch/refresh per-game details (supports worker partitioning).
- steam-pics-refresh-service.ts — refreshes header images.
- steam-player-count-sync-service.ts — syncs current players and stores history.

Running workers locally:

- Single worker (compiled dist):
  ```bash
  # Build API first
  cd api
  npm run build

  # Run one worker (assumes node dist/... exists)
  node dist/services/steam-refresh-service.js
  ```

- Parallel workers (recommended for large datasets):
  ```bash
  # Worker 0
  WORKER_ID=0 TOTAL_WORKERS=3 node dist/services/steam-refresh-service.js &

  # Worker 1
  WORKER_ID=1 TOTAL_WORKERS=3 node dist/services/steam-refresh-service.js &

  # Worker 2
  WORKER_ID=2 TOTAL_WORKERS=3 node dist/services/steam-refresh-service.js &
  ```

Notes:
- Workers read WORKER_ID and TOTAL_WORKERS from env; set them via your process manager (PM2 or docker-compose) or export in shell.
- Use multiple Steam API keys (STEAM_API_KEY_0, STEAM_API_KEY_1, ...) to increase throughput and reduce rate-limit impacts.
- The initial `sync:games` is typically run once to populate the `games` master table.

---

## Database setup (Supabase / Postgres)

A full DB schema is included: `api/src/scripts/setup_database.sql`. It performs table creation, constraints, RLS policies and helper functions.

Basic setup steps (example using psql or Supabase SQL editor):

1. Create a Postgres database or Supabase project.
2. Run the setup SQL:
   ```bash
   psql "postgresql://user:password@host:5432/dbname" -f api/src/scripts/setup_database.sql
   ```
   Or paste the SQL into Supabase SQL editor and execute.

3. Ensure the API has the service role key or credentials to perform sync operations. For Supabase, set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.

Important notes:
- The SQL enables RLS on tables and creates policies for authenticated users and public reads where appropriate. When using Supabase, service-role key bypasses RLS for workers; frontends should use anon keys and follow policies.
- The script creates `games`, `users`, `user_games`, `achievements`, `user_achievements`, `statistics`, `player_count_history`, and other helper tables.
- Read the SQL for details about indices, UUID setup (uuid-ossp extension), and RLS policies.

---

## Docker (docker-compose.yml)

A docker-compose file for quick deployments is included.

Local/quick start with Docker:
1. Build images (or pull if you have published images referenced in compose):
   - For local builds, you may need to create Dockerfiles or customize images. Provided Dockerfiles exist under api/, user-dashboard/ and user-dashboard/Dockerfile.

2. Start services:
   ```bash
   docker-compose up -d
   ```

3. View logs:
   ```bash
   docker-compose logs -f
   ```

Services defined:
- api (feikovd/gamebacklog-api:latest) — exposes 6543
- worker — runs node dist/scripts/worker.js using same image
- user-dashboard — serves frontend on port 80
- dev-dashboard — omitted from docs but present in compose (depends_on api)

Environment:
- docker-compose references `.env` via env_file for configuration.

Stop & remove:
```bash
docker-compose down
```

Note: The compose uses pre-built images (feikovd/*). For local development you may want to build your own images or run services using npm scripts.

---

## Production with PM2 (ecosystem.config.js)

A PM2 ecosystem file is included to manage processes in production: `ecosystem.config.js`.

Common PM2 commands:

- Start all processes defined:
  ```bash
  # Build the API first
  cd api && npm run build && cd ..

  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup  # follow printed instructions to enable on boot
  ```

- View processes and logs:
  ```bash
  pm2 status
  pm2 logs gamebacklog-api
  pm2 logs steam-refresh-worker-0
  ```

- Restart / stop:
  ```bash
  pm2 restart all
  pm2 stop all
  pm2 delete all
  ```

Notes:
- The ecosystem config includes:
  - `gamebacklog-api` (main server) with max_memory_restart 1G
  - `steam-sync` one-time import job
  - multiple `steam-refresh-worker-*` entries with worker envs (WORKER_ID, TOTAL_WORKERS)
  - scheduled `recalculate-stats` and `recalculate-analytics` cron jobs
- When using PM2 with environment variables, ensure .env or environment is loaded into PM2-managed processes (export before pm2 start or use a process env file manager).

---

## CI / Testing / Linting

GitHub Actions is configured at `.github/workflows/ci.yml` to run on push/PR to main & dev:

- Installs dependencies per-subproject
- Lints API & dashboard
- Type checks
- Runs tests (API)
- Builds artifacts

To run checks locally:
```bash
# API lint/type/test
cd api
npm run lint
npm run type-check
npm test

# User dashboard lint / type
cd user-dashboard
npm run lint
npm run type-check
```

Root package.json sets up husky and lint-staged to format staged files with Prettier.

---

## Configuration (environment variables)

See `.env.example` for all variables. Important ones summarized:

- Server & session:
  - PORT=6543
  - SESSION_SECRET=your-secret-key-here

- Steam API:
  - STEAM_API_KEY (or STEAM_API_KEY_0, STEAM_API_KEY_1, ...)
  - Use multiple keys to distribute worker load

- Supabase / Postgres:
  - SUPABASE_URL=https://your-project.supabase.co
  - SUPABASE_ANON_KEY=your-anon-key
  - SUPABASE_SERVICE_KEY=your-service-role-key

- Dashboard / frontend:
  - VITE_API_URL=/api
  - BACKEND_URL=http://api:6543
  - FRONTEND_URL=http://localhost:5173

- Worker:
  - WORKER_ID=0
  - TOTAL_WORKERS=1

Example (.env):
```env
PORT=6543
SESSION_SECRET=$(openssl rand -hex 32)
STEAM_API_KEY_0=your_steam_key_0
STEAM_API_KEY_1=your_steam_key_1
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=anon_key_here
SUPABASE_SERVICE_KEY=service_role_key_here
WORKER_ID=0
TOTAL_WORKERS=3
FRONTEND_URL=http://localhost:5173
```

Remember: never commit real keys to the repository.

---

## Security & deployment notes

- Always keep SESSION_SECRET and SUPABASE_SERVICE_KEY secret.
- Use SECURE cookies in production (NODE_ENV=production -> secure cookie).
- Validate FRONTEND_URL and avoid wildcard CORS origins in production.
- Use HTTPS in production for API and frontend.
- For Supabase: use the service role key only for server-side workers; frontends should use anon keys or authenticated sessions.
- Rotate Steam API keys if exposed; avoid embedding keys in images or public CI logs.

---

## Troubleshooting & tips

- API builds but errors on runtime: check `.env` variables are loaded and SUPABASE_SERVICE_KEY is set.
- CORS blocked in browser: confirm FRONTEND_URL matches origin and is in API allowedOrigins or running both locally with known ports.
- Workers appear stuck: verify WORKER_ID and TOTAL_WORKERS are set and your worker log shows partitioning info. Inspect PM2 or Docker logs.
- DB migrations: If tables missing, re-run `api/src/scripts/setup_database.sql` against your DB instance. For Supabase, use the SQL editor to apply it.
- High memory/CPU with many workers: reduce TOTAL_WORKERS or increase worker resource limits; use separate machines or horizontal scaling.
- Tests failing in CI: run `npm run test` in api/ locally, ensure dependencies and environment for tests are present.

---

## Contributing

- Code style: Prettier + ESLint (config in subprojects). Use pre-commit hooks (husky) to format staged files.
- Branching: follow GitHub Flow (feature branches -> PR -> CI -> merge).
- Add tests for new backend logic (Jest) and run `npm run test` in api/.
- Update `api/src/scripts/setup_database.sql` if changing DB schema.
- Describe changes in PR body and update README sections if behavioral changes occur (env, scripts).

---

## Where to look next (developer pointers)

- API configuration: `api/src/config/index.ts`
- Main server & security-related notes: `api/src/index.ts`
- Workers & services: `api/src/services/*.ts`
- Database setup & RLS policies: `api/src/scripts/setup_database.sql`
- API available scripts: `api/package.json`
- User Dashboard entry: `user-dashboard/src/main.tsx` and `user-dashboard/package.json`

---

If you want, I can:
- Produce a short quick-start script (bash) to bootstrap a local dev environment,
- Generate a sample PM2 environment file and commands,
- Or create a checklist for deploying to a fresh Supabase + VM environment.

Happy hacking!