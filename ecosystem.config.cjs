module.exports = {
  apps: [{
    name: 'drivesense-api',
    script: './server/dist/simple-api.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 788
    },
    kill_timeout: 5000,
    listen_timeout: 10000,
    error_file: '/var/log/drivesense/error.log',
    out_file: '/var/log/drivesense/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
