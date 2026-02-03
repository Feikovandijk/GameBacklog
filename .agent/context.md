# GameBacklog Project Context

## Overview

GameBacklog is a Steam game library management system with automated data synchronization.

**Stack:**

- **API** (`/api`): Node.js + Express + TypeScript, Supabase (PostgreSQL)
- **User Dashboard** (`/user-dashboard`): Vite + React + TypeScript + TailwindCSS
- **Dev Dashboard** (`/devdashboard`): Vite + React + TypeScript (internal analytics)

## Coding Standards

### TypeScript

- Strict mode enabled across all packages
- Use interfaces for API types (defined in `api/src/types/` and `user-dashboard/src/services/api.ts`)
- Avoid `any` - use proper typing or `unknown` with guards

### API Development (`/api`)

- Entry point: `src/index.ts`
- Configuration: `src/config/index.ts`
- Supabase client: `src/supabase/client.ts`
- Steam services: `src/services/*.ts`
- Auth: `src/auth/steam-auth.ts` (Passport Steam OAuth)

### Frontend Development (`/user-dashboard`)

- **Follow** `style_guide.md` for all UI work
- Use TailwindCSS with semantic classes from `tailwind.config.ts`
- API calls: Use `api` axios instance from `src/services/api.ts`
- Icons: Google Material Symbols Outlined

### Theme Colors (use Tailwind classes)

| Name           | Class                         | Hex       |
| -------------- | ----------------------------- | --------- |
| Primary        | `bg-primary` / `text-primary` | `#00E5BC` |
| Background     | `bg-background-dark`          | `#0B1121` |
| Surface        | `bg-surface-dark`             | `#161E32` |
| Border         | `border-border-dark`          | `#2A3550` |
| Text Secondary | `text-text-secondary`         | `#94A3B8` |

## Key Patterns

### API Endpoints

All endpoints prefixed with `/api/`. Use Express Router pattern.

### React Components

```tsx
interface Props {
  /* typed props */
}
const Component: React.FC<Props> = ({ prop }) => {
  /* ... */
};
```

### Data Fetching

Use `useEffect` + `useState` for component data. API calls via `api.get()` / `api.post()`.

## Environment Variables

See `.env.example`. Key vars:

- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`
- `STEAM_API_KEY_0`, `STEAM_API_KEY_1`, ... (multiple keys for workers)
- `SESSION_SECRET`, `FRONTEND_URL`, `PORT`

## Common Commands

### Development

```bash
# API (port 6543)
cd api && npm run dev

# User Dashboard (port 5173)
cd user-dashboard && npm run dev
```

### Quality Checks

```bash
npm run lint && npm run type-check && npm run test
```

### Steam Data Workers

```bash
npm run sync:games      # Initial Steam app list import
npm run refresh:games   # Continuous game enrichment worker
npm run sync:players    # Player count sync
```

## Important Notes

1. **Never commit secrets** - Use `.env` file (gitignored)
2. **RLS enabled** - Supabase tables use Row Level Security
3. **CORS configured** - API whitelist in `src/index.ts`
4. **Pre-commit hooks** - Husky + lint-staged + Prettier
