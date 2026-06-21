# Deploying the minimal realtime backend to Fly.io

This server is a minimal Express + WebSocket backend used by the greyhawk-dronjons frontend for realtime session state.

Features
- REST API: GET /api/session/:id, POST /api/session/:id
- Claim endpoint: POST /api/session/:id/claim?page=KEY
- WebSocket endpoint: /ws?session=ID (connect to ws://HOST/ws?session=ID)
- Persistence: db.json (lowdb)
- Admin actions protected by ADMIN_TOKEN env var
- Optional Google OAuth: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable

Quick start (local)
1. cd server
2. npm install
3. ADMIN_TOKEN=changeme node index.js
4. Visit http://localhost:3000/api/session/default

Fly.io deploy notes
- Install flyctl (https://fly.io/docs/hands-on/install-flyctl/)
- Login: flyctl auth login
- Create app: flyctl apps create greyhawk-dronjons-server
- Provision a volume if you want persistence across restarts (recommended):
  flyctl volumes create data --size 1
- Copy fly.toml example to project root and set the volume mount in it (example provided in repo)
- Set env vars on Fly:
  flyctl secrets set ADMIN_TOKEN=YOUR_TOKEN
  (optional) flyctl secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... SESSION_SECRET=...
- Deploy: flyctl deploy

Important
- Fly instances have ephemeral filesystem unless you attach a volume. For persistence of db.json attach a volume and mount it at /data (example fly.toml included).

Security
- In production change ADMIN_TOKEN to a strong secret and do not use permissive DB rules. If enabling Google OAuth, set SESSION_SECRET.
