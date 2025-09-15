# GameBacklog Manager

A comprehensive Steam game library management system with user dashboards, analytics, and automated data synchronization.

## 🏗️ Architecture Overview

```
GameBacklog/
├── api/                    # Backend API & Services
├── user-dashboard/         # User-facing React dashboard
├── devdashboard/          # Developer analytics dashboard
├── ecosystem.config.js    # PM2 deployment configuration
└── docker-compose.yml     # Docker orchestration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account and project
- **Steam API Key** from [Steam Web API](https://steamcommunity.com/dev/apikey)
- **PM2** for production deployment

### Environment Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/yourusername/GameBacklog.git
   cd GameBacklog
   npm install
   cd api && npm install && cd ..
   cd user-dashboard && npm install && cd ..
   cd devdashboard && npm install && cd ..
   ```

2. **Configure environment variables:**
   ```bash
   # Copy and edit the .env file
   cp .env.example .env
   ```
   
   Required variables:
   ```env
   # Steam API Configuration, feel free to add multiple keys here
   STEAM_API_KEY_0=your_steam_api_key_here
   STEAM_API_KEY_1=backup_steam_api_key_here
   
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   
   # Server Configuration
   PORT=6543
   ```

3. **Set up Supabase database:**
   - See `api/database-schema.sql` for the complete setup

## 🛠️ Development

### Local Development

#### Backend API
```bash
cd api
npm run dev          # Start API server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server
```

#### User Dashboard
```bash
cd user-dashboard
npm run dev         # Start Vite dev server
npm run build       # Build for production
npm run preview     # Preview production build
```

#### Developer Dashboard
```bash
cd devdashboard
npm run dev         # Start Vite dev server
npm run build       # Build for production
```

### Available Scripts

#### API Scripts (`api/`)
- `npm run dev` - Development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server
- `npm run sync:games` - Initial Steam games sync (one-time)
- `npm run sync:games:pics` - Refresh header images for all games
- `npm run sync:players` - Sync current player count for all games
- `npm run sync:enrich` - Enrich game data with additional information from the Steam API
- `npm run refresh:games` - Enrich game data from Steam
- `npm run recalculate:stats` - Recalculate dashboard statistics
- `npm run recalculate:analytics` - Recalculate analytics data

#### User Dashboard Scripts (`user-dashboard/`)
- `npm run dev` - Development server (http://localhost:5173)
- `npm run build` - Production build
- `npm run preview` - Preview production build

#### Developer Dashboard Scripts (`devdashboard/`)
- `npm run dev` - Development server (http://localhost:5174)
- `npm run build` - Production build

## 🎮 Steam Data Pipeline

### Services Overview

1. **steam-sync-service.ts** - Initial Steam games database sync
   - Fetches all ~265,000 Steam games
   - Adds new games to database
   - Updates total games count

2. **steam-refresh-service.ts** - Game data enrichment
   - Enriches basic game data with detailed information
   - Fetches descriptions, images, prices, reviews, achievements
   - Supports multiple workers for parallel processing

3. **user-steam-sync-service.ts** - User library synchronization
   - Syncs individual user's Steam game libraries
   - Tracks playtime, achievements, and game statistics
   - Updates user's personal game backlog

### Running Steam Services

#### One-time Setup
```bash
cd api
npm run build
npm run sync:games    # Initial Steam games sync
```

#### Continuous Data Enrichment
```bash
# Single worker
npm run refresh:games

# Multiple workers (faster processing)
WORKER_ID=0 TOTAL_WORKERS=2 npm run refresh:games &
WORKER_ID=1 TOTAL_WORKERS=2 npm run refresh:games &
```

## 🚀 Production Deployment

### PM2 Deployment

The project includes a comprehensive PM2 ecosystem configuration for production deployment.

#### Deploy All Services
```bash
# Build the project
cd api && npm run build && cd ..

# Start all services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up auto-start on boot
pm2 startup
```

#### Service Management
```bash
# View all processes
pm2 status

# View logs
pm2 logs gamebacklog-api
pm2 logs steam-refresh-worker-0

# Restart services
pm2 restart all
pm2 restart gamebacklog-api

# Stop services
pm2 stop all
pm2 delete all
```

### PM2 Services Overview

- **gamebacklog-api** - Main API server (port 6543)
- **steam-sync** - One-time Steam games sync
- **steam-refresh-worker-0/1/2** - Parallel game data enrichment
- **stats-recalculator** - Daily statistics recalculation (5 AM)
- **analytics-recalculator** - Daily analytics recalculation (6 AM)

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Database Schema

### Core Tables

- **games** - Steam games master data
- **users** - User accounts and profiles
- **user_games** - User's personal game libraries
- **achievements** - Game achievements data
- **user_achievements** - User's achievement progress
- **statistics** - Analytics and counters
- **review_history** - Review trend tracking

### Key Features

- **UUID primary keys** for all tables
- **Automatic timestamps** with triggers
- **Row Level Security** for data protection
- **Optimized indexes** for query performance
- **Foreign key constraints** for data integrity

## 🔧 Configuration

### API Configuration (`api/src/config/index.ts`)

```typescript
interface Config {
  port: number;
  steamApiKey: string;
  steamApiKeys: string[];
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  worker: {
    id: number;
    total: number;
  };
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STEAM_API_KEY` | Primary Steam API key | ✅ |
| `STEAM_API_KEY_0/1` | Additional API keys for workers | ✅ |
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ |
| `PORT` | API server port (default: 6543) | ❌ |
| `WORKER_ID` | Worker ID for parallel processing | ❌ |
| `TOTAL_WORKERS` | Total number of workers | ❌ |

## 🐛 Troubleshooting

### Common Issues

#### Environment Variables Not Loading
```bash
# Check if .env file exists and has correct path
ls -la .env
cat .env

# Test environment loading
cd api && node -e "console.log(require('./dist/config/index.js').default)"
```

#### Steam API Rate Limiting
- The services include built-in rate limiting
- Adjust `GAMES_PER_MINUTE_LIMIT` in services if needed
- Use multiple Steam API keys for higher limits

#### Database Connection Issues
- Verify Supabase credentials in `.env`
- Check Supabase project status
- Ensure database schema is properly set up

#### PM2 Process Issues
```bash
# Check PM2 status
pm2 status

# View detailed logs
pm2 logs --lines 100

# Restart problematic process
pm2 restart <process-name>
```

### Performance Optimization

#### Memory Usage
- **API Server**: ~1GB
- **Steam Workers**: ~2GB each
- **Total Recommended**: 8-10GB RAM

#### Scaling Workers
```bash
# Add more workers by editing ecosystem.config.js
# Increase TOTAL_WORKERS and add more worker configurations
```

## 📝 Development Guidelines

### Code Style

- **TypeScript** for all backend code
- **React** with TypeScript for frontend
- **ESLint** configuration included
- **Prettier** for code formatting

### Git Workflow

```bash
# Feature development
git checkout -b feature/new-feature
# Make changes
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Create pull request
# Merge after review
```

### Testing

```bash
# Run linting
cd api && npm run lint

# Build test
npm run build

# Manual testing
npm run dev
```

## 📚 API Documentation

### Authentication
- Steam OAuth integration
- Session-based authentication
- User profile management

### Endpoints
- `GET /api/health` - Health check
- `GET /api/user/profile` - User profile
- `GET /api/user/games` - User's game library
- `POST /api/user/sync` - Trigger Steam sync

### WebSocket Events
- Real-time sync progress updates
- Achievement notifications
- Game status changes
=======
WIP

Tool to manage game backlogs, aimed at developers.

