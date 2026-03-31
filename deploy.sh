#!/bin/bash
set -e

cd /opt/drivesense

# Pull latest changes
git pull origin main

# ─── Client ──────────────────────────────────────────────────────────────────
cd client
npm install --omit=dev
npx vite build
cd ..

# ─── Server ──────────────────────────────────────────────────────────────────
cd server
npm install --omit=dev
npx tsc
cd ..

# ─── Restart API via PM2 ─────────────────────────────────────────────────────
if command -v pm2 &> /dev/null; then
  if pm2 describe drivesense-api &> /dev/null; then
    pm2 restart drivesense-api
  else
    pm2 start ecosystem.config.cjs --env production
  fi
  pm2 save
else
  echo "PM2 not installed — skipping API restart"
  echo "Install with: npm install -g pm2"
  echo "Then run: pm2 start ecosystem.config.cjs --env production"
fi

echo "Deploy complete: $(date)"
