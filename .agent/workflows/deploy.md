---
description: Deploy GameBacklog to production with Docker or PM2
---

# Deploy to Production

Two deployment options: Docker Compose or PM2.

## Option A: Docker Compose

1. Build the API image:

```bash
cd api && docker build -t feikovd/gamebacklog-api:latest .
```

2. Build the user dashboard image:

```bash
cd user-dashboard && docker build -t feikovd/gamebacklog-userdash:latest .
```

3. Start all services:
   // turbo

```bash
docker-compose up -d
```

4. Check logs:
   // turbo

```bash
docker-compose logs -f
```

## Option B: PM2

1. Build the API:
   // turbo

```bash
cd api && npm run build
```

2. Build the user dashboard:
   // turbo

```bash
cd user-dashboard && npm run build
```

3. Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
```

4. Check status:
   // turbo

```bash
pm2 status
```

## Post-Deployment Verification

- Check API responds: `curl http://localhost:6543/api/stats`
- Check dashboard is serving: `curl http://localhost/`
- Review PM2 logs: `pm2 logs gamebacklog-api`

## Notes

- Ensure `.env` vars are available to the deployment environment
- For Docker, env vars are passed via `env_file` in compose
- For PM2, export vars before `pm2 start` or use process env file
