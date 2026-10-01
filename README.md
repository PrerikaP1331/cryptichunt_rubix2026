# The Labyrinth

RUBIX Cryptic Hunt with a React client and an Express/MongoDB API. The client and API deploy independently.

## Project layout

- `client/` contains the Vite app, its dependencies, and static-host configuration.
- `server/` contains the API and server-side puzzle validation.
- The root `package.json` contains backend dependencies and convenience scripts.

## Run locally

```bash
npm install
npm --prefix client install
npm run server
npm run dev
```

Vite prints its local URL and proxies `/api` requests to `http://localhost:4000`. Team login is at `/`; the admin leaderboard is at `/leaderboard`.

## Team accounts and API

The server seeds `TEAM1` through `TEAM30` with passwords `pass1` through `pass30`. Public registration is disabled. Answer keys and round-order validation are server-side. The participant leaderboard endpoint returns `403`; the admin leaderboard requires an authenticated admin account.

Copy `.env.example` to `.env` and set `MONGODB_URI`. Set `ADMIN_USERNAME` and a unique `ADMIN_PASSWORD` to enable an admin account. If MongoDB is unavailable locally, the API uses an in-memory store; production startup requires MongoDB.

## Separate deployment

### Backend on Render

The root `render.yaml` deploys only the API. Create a Render Blueprint from the repository and provide `MONGODB_URI`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`. The service runs `npm ci` and `npm start`. Allow the Render service to connect to the Atlas database. The backend health check is `/api/health`.

After deploying the frontend, set the exact frontend origin in the Render `CLIENT_ORIGIN` environment variable, for example `https://your-site.netlify.app`, then redeploy the backend.

### Frontend on Netlify

Create a Netlify site from the same repository and set its base directory to `client`. `client/netlify.toml` builds and publishes `dist`, including the SPA rewrite needed for direct visits to `/leaderboard`. Set `VITE_API_BASE_URL` in the Netlify build environment to the Render API origin, for example `https://your-api.onrender.com`.

For another static host, use `npm run build` in `client/`, publish `client/dist`, and configure an SPA rewrite to `/index.html`.

Never commit database or admin credentials. `npm run build` at the repository root builds the client; `npm start` starts the API.
