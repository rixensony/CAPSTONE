# SkillBridge — Deployment guide

> This repo was built and verified locally against an in-memory Mongo plus Vite dev server.
> This document takes the same stack to a hosted, durable setup. No deployment was performed
> for the submission (no credentials were available); every step below is documented so it can
> be replayed as-is.

## 1. What gets deployed

| Piece | Where it runs | Notes |
|---|---|---|
| `server/` (Express API) | Render / Railway / Fly.io / any Node host | Node ≥ 18; Build: `npm ci`; Start: `npm start` |
| `client/` (React SPA) | Vercel / Netlify / Render static site | Build: `npm ci && npm run build`; publish `client/dist` |
| MongoDB | MongoDB Atlas (free M0 cluster is enough) | Atlas → check driver compatibility: Mongoose 8, Node driver ≥ 4.12 |

## 2. MongoDB Atlas

1. Create a free cluster and a database user (username/password).
2. Network access: add `0.0.0.0/0` (simplest; tighten to the host's egress IPs in production).
3. Copy the connection string, URL-encode the password:
   `mongodb+srv://user:PASS@cluster0.xxxxx.mongodb.net/skillbridge?retryWrites=true&w=majority`

## 3. API host (Render example)

1. New → Web Service → connect the repo → root directory `server`.
2. Environment:
   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | Render injects; code reads `process.env.PORT` |
   | `MONGODB_URI` | the Atlas string from step 2 |
   | `JWT_SECRET` | long random string — `openssl rand -hex 64` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | `https://<your-client-domain>` (CORS allow-list) |
   | `AUTH_RATE_MAX` | `50` (optional tune) |
3. Health check path: `/health`.
4. First boot: the API creates indexes automatically. Load demo data once from your machine:
   `MONGODB_URI="<atlas-uri>" npm run seed` (prints the demo password to your console —
   keep it private or change the password from the app without sharing).
   For a clean production app, **do not** seed; register real users instead.

## 4. Client host (Vercel example)

1. Import the repo → root directory `client`.
2. Build command `npm run build`, output directory `dist`.
3. Environment variables:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-api-domain>/api` |
4. Deploy a **static SPA**: Vercel handles single-page rewrite automatically. On Netlify add
   `public/_redirects` → `/* /index.html 200` (already safe to commit) or configure
   SPA routing in the panel.

## 5. Post-deploy verification

```bash
curl https://<api-domain>/health                       # {"status":"ok",...}
curl https://<api-domain>/api/projects?limit=1         # 200 + envelope (public)
curl -X POST https://<api-domain>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}'                # 200 + token (rate-limited)
```

Then in the browser: register → login → explore → open project → send a join request →
owner accepts → project goes `full` when seats fill. Repeat checks `docs/testing.md` §2.

## 6. Production hardening checklist

- [ ] `helmet` is already on; verify `CLIENT_URL` matches the exact deployed origin (CORS).
- [ ] Keep `JWT_SECRET` in the host's secret store, never in the repo.
- [ ] Swap the in-memory Mongo for Atlas (done above) — all Mongoose code is host-agnostic.
- [ ] Consider setting up a persistent log drain / uptime monitor for `GET /health`.
- [ ] HTTPS is automatic on Render/Vercel; never proxy with disabled TLS verification.
- [ ] Review rate limits (300 req/15 min API, AUTH_RATE_MAX for auth) for expected traffic.

## 7. Alternative: docker-compose (self-hosted)

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
  api:
    build: ./server          # Dockerfile: node:20-alpine, npm ci --omit=dev, CMD npm start
    env_file: ./server/.env  # MONGODB_URI=mongodb://mongo:27017/skillbridge
    ports: ["5000:5000"]
  web:
    build: ./client          # multi-stage: node build → nginx serving dist with SPA fallback
    ports: ["80:80"]
    environment:
      - VITE_API_URL=http://localhost:5000/api  # must be baked at build time
```
