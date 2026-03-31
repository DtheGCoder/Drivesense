module.exports = {
  apps: [{
    name: 'drivesense-api',
    script: './server/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    kill_timeout: 5000,
    listen_timeout: 10000,
    error_file: '/var/log/drivesense/error.log',
    out_file: '/var/log/drivesense/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
