# The Labyrinth

A React + TypeScript + Vite interface for the RUBIX Cryptic Hunt.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The participant route is `/`. The organiser mock dashboard is `/admin`.

## Security boundary

The dashboard is included as a frontend-ready mock for the admin workflow. In production, the admin session must be validated server-side. Participant requests to `/leaderboard` and its API must return `403`; never rely on hiding the route in the client. The participant view intentionally exposes only the current team's own progress, solved levels, and timer.

## Build

```bash
npm run build
```
