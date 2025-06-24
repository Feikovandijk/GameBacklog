module.exports = {
  apps: [
    {
      name: 'steam-pics-refresher',
      script: 'node_modules/.bin/ts-node',
      args: 'src/services/steam-pics-refresh-service.ts',
      cwd: './api',
      cron_restart: '*/5 * * * *', // Run every 5 minutes
      autorestart: false, // We only want it to run on the cron schedule
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'steam-full-refresher',
      script: 'node_modules/.bin/ts-node',
      args: 'src/services/steam-refresh-service.ts',
      cwd: './api',
      cron_restart: '0 3 * * *', // Run every day at 3:00 AM
      autorestart: false,
      watch: false,
      max_memory_restart: '1G', // This process might be more memory intensive
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'stats-recalculator',
      script: 'node_modules/.bin/ts-node',
      args: 'src/scripts/recalculate-stats.ts',
      cwd: './api',
      cron_restart: '0 5 * * *', // Run every day at 5:00 AM (after the full refresh)
      autorestart: false,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ],
}; 