// ecosystem.config.cjs
module.exports = {
  apps: [
    // =========================
    // 1) API / Web Server
    // =========================
    {
      name: "lapnet-api",
      script: "server.js",
      cwd: __dirname,

      // If you want to use cluster mode (multiple CPU cores), use instances: "max"
      // If your server is low-memory / free tier, consider using instances: 1
      instances: "max",
      exec_mode: "cluster",

      // Stability
      autorestart: true,
      max_memory_restart: "300M",
      restart_delay: 1000,

      // Disable watch in production
      watch: false,
      time: true,

      // Logs
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      out_file: "./logs/api-out.log",
      error_file: "./logs/api-err.log",

      // ENV
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        // In most hosting platforms (Render, etc.) PORT is set by the platform
        // If you want to force it, you can add: PORT: 3000
      },
    },

    // =========================
    // 2) Job: aggregateVisitors
    // =========================
    {
      name: "lapnet-aggregate-visitors",
      script: "src/jobs/aggregateVisitors.js",
      cwd: __dirname,
   instances: 1,
exec_mode: "fork",


      // args for your job script
      args: "--backfill=180",

      // If you want this job to run automatically on a schedule (Cron)
      // ✅ Example: run every day at 03:00
      // If you do NOT want scheduling, just remove/comment cron_restart
      cron_restart: "0 3 * * *",

      // Job behavior:
      // - If this script runs once and exits (batch job), keep autorestart: false
      // - If you want it to keep running (not recommended for batch jobs), set true
      autorestart: false,

      // Logs
      time: true,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      out_file: "./logs/job-out.log",
      error_file: "./logs/job-err.log",

      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
