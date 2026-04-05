# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GameBacklog is a Steam game library management system. Users authenticate via Steam OAuth, sync their Steam library, manage a personal game backlog (with statuses like want_to_play, currently_playing, completed, etc.), and view analytics. Background workers keep Steam game data current.

## Repository Structure

This is a **monorepo with three independent sub-projects** (each with its own `package.json`, `node_modules`, and build tooling):

- **`api/`** — Node.js/Express backend (TypeScript, compiled with `tsc`)
- **`user-dashboard/`** — User-facing React + Vite frontend (TypeScript, Tailwind CSS, Ant Design)
- **`devdashboard/`** — Developer analytics React + Vite frontend (TypeScript, Tailwind CSS, Recharts)
- Root `package.json` only manages Husky git hooks and lint-staged (Prettier)

## Build, Lint, and Test Commands

All commands run from the respective sub-project directory (or use `--prefix`):

### API (`api/`)

```bash
npm run dev              # Dev server with hot-reload (ts-node-dev)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled production server
npm test                 # Run Jest tests
npm run test:watch       # Jest in watch mode
npm run test:coverage    # Jest with coverage report
npm run lint             # ESLint
npm run lint:fix         # ESLint auto-fix
npm run type-check       # tsc --noEmit
npm run format           # Prettier write
npm run format:check     # Prettier check
```

### User Dashboard (`user-dashboard/`)

```bash
npm run dev              # Vite dev server (port 5173)
npm run build            # tsc -b && vite build
npm run lint             # ESLint
npm run type-check       # tsc --noEmit
```

### Dev Dashboard (`devdashboard/`)

```bash
npm run dev              # Vite dev server
npm run build            # tsc && vite build
npm run lint             # ESLint
npm run type-check       # tsc --noEmit
```

### Running a single API test

```bash
cd api && npx jest --testPathPattern="example.test" --watch
```

### CI (GitHub Actions)

Runs on push/PR to `main` and `dev`. Steps: install, lint:ci, type-check, build, test (API only), security audit. See `.github/workflows/ci.yml`.

## Architecture Details

### API (`api/src/`)

- **Entry point**: `index.ts` — Express app with all routes defined inline (no separate router files)
- **Config**: `config/index.ts` — loads root `.env` via `dotenv` with path `../../../.env`
- **Auth**: `auth/steam-auth.ts` — Passport.js with Steam OAuth strategy; sessions stored via `express-session`
- **Database**: `supabase/client.ts` — Supabase JS client (Postgres). Uses service role key server-side
- **CSRF**: `middleware/csrf.ts` — double-submit cookie pattern via `csrf-csrf`. Applied to state-changing user routes (POST/PUT/DELETE on `/api/user/games`)
- **Services** (background workers, each a standalone script):
  - `steam-sync-service.ts` — one-time full Steam app list import
  - `steam-refresh-service.ts` — long-running worker for game detail enrichment (supports sharding via `WORKER_ID`/`TOTAL_WORKERS`)
  - `steam-player-count-sync-service.ts` — player count updates
  - `steam-pics-refresh-service.ts` — header image refresh
  - `user-steam-sync-service.ts` — syncs a user's Steam library on demand
- **Tests**: `__tests__/` — Jest + ts-jest, test files match `**/__tests__/**/*.test.ts`. Setup in `__tests__/setup.ts` sets `NODE_ENV=test`
- **DB schema**: `scripts/setup_database.sql` — full schema with RLS policies

### User Dashboard (`user-dashboard/src/`)

- **API client**: `services/api.ts` — Axios instance with `withCredentials: true`, all type definitions and API wrappers (`authAPI`, `userGamesAPI`, `gamesAPI`)
- **Routing**: React Router v7 (`react-router-dom`)
- **UI components**: Ant Design (`antd`) + custom Tailwind CSS, Framer Motion for animations
- **Key pages**: `LoginPage`, `DashboardOverview`, `GameLibrary`, `KanBanBoard`, `AddGamePage`
- **Dashboard sub-components**: `components/dashboard/` (StatsGrid, GenreBreakdown, etc.)

### Dev Dashboard (`devdashboard/src/`)

- Platform-wide analytics dashboard using Recharts. Intentionally omitted from user-facing docs.

## Key Patterns and Conventions

- **Prettier config** (root `.prettierrc.json`): single quotes, semicolons, 2-space indent, 80 char width, trailing commas ES5, JSX single quotes, arrow parens avoid
- **Git hooks**: Husky pre-commit runs lint-staged (Prettier on `**/*.{ts,js,json,md,yml}`)
- **Environment**: Single root `.env` file (see `.env.example`). API config loads it via relative path. Frontend uses `VITE_API_URL` env var
- **Game statuses**: `want_to_play`, `currently_playing`, `completed`, `completed_100`, `on_hold`, `dropped`
- **API routes are all in `api/src/index.ts`** — no router extraction. Public endpoints (stats, analytics, game search, trending) don't require auth. User endpoints (`/api/user/*`) use `requireAuth` middleware
- **Branching**: feature branches from `dev`, PRs to `main`/`dev`

## Environment Setup

```bash
npm install                          # Root (husky/lint-staged)
npm install --prefix api             # API dependencies
npm install --prefix user-dashboard  # User dashboard dependencies
npm install --prefix devdashboard    # Dev dashboard dependencies
cp .env.example .env                 # Then fill in real values
```

Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `STEAM_API_KEY`, `SESSION_SECRET`, `CSRF_SECRET`, `FRONTEND_URL`, `API_URL`.

## Deployment Notes

- **`API_URL` must be the scheme+host only** (e.g., `https://gamelog.feiko.org`), **without any `/api` path suffix**. The Steam OAuth `returnURL` is built as `${API_URL}/auth/steam/return`; the nginx `location /auth/` block proxies those requests to Express. `steam-auth.ts` strips a trailing `/api` path defensively, but the canonical value should have no path component. The user-dashboard nginx proxy handles `/api/*` → Express for all other API calls.
- **`CSRF_SECRET`** must be set (generate with `openssl rand -hex 32`). The API refuses to start in production without it.
- **Reverse proxy must forward `X-Forwarded-Proto: https`** to the user-dashboard container. Express is configured with `trust proxy: 1` and the session middleware uses `proxy: true` + `secure: true` in production, so a missing/incorrect `X-Forwarded-Proto` would cause express-session to silently drop the `connect.sid` cookie and bounce users back to the login page. The dashboard's nginx (`user-dashboard/default.conf.template`) defaults the header to `https` when the outer proxy omits it, since the public site is HTTPS-only.
- Docker images are built for `linux/amd64`. On ARM (Apple Silicon), use `docker buildx build --platform linux/amd64`.
- The `.env` file is shared across containers via `env_file` in `docker-compose.yml`.
