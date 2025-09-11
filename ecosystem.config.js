module.exports = {
  apps: [
    // ==============================================
    // MAIN API SERVER
    // ==============================================
    {
      name: 'gamebacklog-api',
      script: 'dist/index.js',
      cwd: './api',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 6543
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log'
    },

    // ==============================================
    // STEAM GAME SYNC (One-time setup)
    // ==============================================
    {
      name: 'steam-sync',
      script: 'dist/services/steam-sync-service.js',
      cwd: './api',
      autorestart: false, // Run once and exit
      watch: false,
      max_memory_restart: '2G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/steam-sync-error.log',
      out_file: './logs/steam-sync-out.log',
      log_file: './logs/steam-sync-combined.log'
    },

    // ==============================================
    // STEAM GAME REFRESH WORKERS (Multiple workers for parallel processing)
    // ==============================================
    {
      name: 'steam-refresh-worker-0',
      script: 'dist/services/steam-refresh-service.js',
      cwd: './api',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        WORKER_ID: 0,
        TOTAL_WORKERS: 3
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/steam-refresh-worker-0-error.log',
      out_file: './logs/steam-refresh-worker-0-out.log',
      log_file: './logs/steam-refresh-worker-0-combined.log'
    },
    {
      name: 'steam-refresh-worker-1',
      script: 'dist/services/steam-refresh-service.js',
      cwd: './api',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        WORKER_ID: 1,
        TOTAL_WORKERS: 3
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/steam-refresh-worker-1-error.log',
      out_file: './logs/steam-refresh-worker-1-out.log',
      log_file: './logs/steam-refresh-worker-1-combined.log'
    },
    {
      name: 'steam-refresh-worker-2',
      script: 'dist/services/steam-refresh-service.js',
      cwd: './api',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',
      env: {
        WORKER_ID: 2,
        TOTAL_WORKERS: 3
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/steam-refresh-worker-2-error.log',
      out_file: './logs/steam-refresh-worker-2-out.log',
      log_file: './logs/steam-refresh-worker-2-combined.log'
    },

    // ==============================================
    // SCHEDULED MAINTENANCE TASKS
    // ==============================================
    {
      name: 'stats-recalculator',
      script: 'dist/scripts/recalculate-stats.js',
      cwd: './api',
      cron_restart: '0 5 * * *', // Run every day at 5:00 AM
      autorestart: false,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/stats-recalculator-error.log',
      out_file: './logs/stats-recalculator-out.log',
      log_file: './logs/stats-recalculator-combined.log'
    },

    // ==============================================
    // ANALYTICS RECALCULATION (Optional - for dashboard analytics)
    // ==============================================
    {
      name: 'analytics-recalculator',
      script: 'dist/scripts/recalculate-analytics.js',
      cwd: './api',
      cron_restart: '0 6 * * *', // Run every day at 6:00 AM
      autorestart: false,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/analytics-recalculator-error.log',
      out_file: './logs/analytics-recalculator-out.log',
      log_file: './logs/analytics-recalculator-combined.log'
    }
  ],
}; 