---
description: Start local development environment for API and dashboard
---

# Start Development Environment

This workflow starts the API and user dashboard for local development.

## Prerequisites

- Node.js 18+ installed
- Dependencies installed (`npm install` in root, `/api`, and `/user-dashboard`)
- `.env` file configured (copy from `.env.example`)

## Steps

1. Start the API server (runs on port 6543):
   // turbo

```bash
cd api && npm run dev
```

2. Start the user dashboard (runs on port 5173):
   // turbo

```bash
cd user-dashboard && npm run dev
```

3. Open the dashboard in browser:
   - User Dashboard: http://localhost:5173
   - API check: http://localhost:6543/api/stats

## Notes

- API must be running for dashboard auth to work
- Both use hot-reload (changes auto-refresh)
- Check terminal for compilation errors
