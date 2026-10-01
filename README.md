# The Labyrinth

A React + TypeScript + Vite interface for the RUBIX Cryptic Hunt.

## Run locally

```bash
npm install
npm run server
npm run dev
```

Open the Vite URL shown in the terminal. Team login is at `/`. The admin leaderboard is at `/leaderboard` and requires an admin account.

## Backend API

```bash
npm run server
```

The backend starts on port `4000` and exposes:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/answers/submit`
- `GET /api/admin/leaderboard` with an authenticated admin session
- `GET /api/leaderboard` returns `403` for participant access

The server seeds `TEAM1` through `TEAM30` with passwords `pass1` through `pass30`. Public registration is disabled. If no MongoDB URI is present, the API falls back to an in-memory demo store for local testing.

For local development, Vite proxies `/api` requests to port `4000`. When the frontend and API are deployed on different origins, set `VITE_API_BASE_URL` to the API origin when building the frontend. Configure `MONGODB_URI`, `ADMIN_USERNAME`, and a unique `ADMIN_PASSWORD` on the server to enable the admin account. Admin access is disabled if admin credentials are not configured.

## Deploy to Render

1. Push this repository to GitHub and create a Render Blueprint from it.
2. In the Blueprint setup, provide `MONGODB_URI`, `ADMIN_USERNAME`, and a unique `ADMIN_PASSWORD` as secret environment values.
3. In MongoDB Atlas, allow network access from the Render service and verify the database user can access the `labyrinth` database.
4. Deploy the service. Render runs `npm ci && npm run build`, then `npm start`; Express serves both the frontend and API from the same origin.

Production startup fails if MongoDB is missing or unreachable, preventing event scores from silently being stored only in memory. Do not put database credentials or admin passwords in source control. When deploying the frontend and API separately, configure `VITE_API_BASE_URL` during the frontend build instead.

## Security boundary

Answer keys are kept on the server, and the server requires all earlier rounds to be solved before awarding points for a round. Admin leaderboard access is checked against the authenticated server-side admin role. The participant view exposes only the current team's own progress, solved levels, and timer.

## Build

```bash
npm run build
```
