# Serving Frontend from Backend & ngrok Public Access

## Overview

Two goals:
1. Build the React frontend and serve it as static files from Express
2. Expose the Express server publicly via ngrok CLI

`vite-ngrok` is a Vite dev plugin and is not applicable here — once the frontend
is served from Express, ngrok CLI is the simpler and correct tool.

---

## 1. Update Frontend Fetch URLs to Relative Paths

Before building, update all hardcoded `http://localhost:3000` URLs in the
frontend to relative paths. This ensures requests work both locally and through
ngrok without any environment-specific configuration.

### `front_end/src/components/Basket.tsx`

```ts
// Before
const { newRequest, connected } = useSSE(`http://localhost:3000/baskets/${url}/stream`);

// After
const { newRequest, connected } = useSSE(`/baskets/${url}/stream`);
```

```ts
// Before
let response = await fetch(`http://localhost:3000/baskets/${url}/`);

// After
let response = await fetch(`/baskets/${url}/`);
```

```ts
// Before
const response = await fetch(`http://localhost:3000/${url}/clear`, options);

// After
const response = await fetch(`/${url}/clear`, options);
```

Check all other components for any remaining `http://localhost:3000` references
and update them to relative paths as well.

---

## 2. Build the Frontend

```bash
cd front_end && npm run build
```

This produces a `front_end/dist` folder of static files that Express will serve.
Re-run this command any time the frontend changes.

---

## 3. Update `server.ts` to Serve the Frontend

Add static file serving and a catch-all route to `server.ts`. The catch-all
ensures React Router handles client-side routes like `/baskets/:url` — without
it, refreshing on those routes would return a 404 from Express.

```ts
import path from "path";

// Serve Vite build output as static files
app.use(express.static(path.resolve(__dirname, "../../front_end/dist")));

// Catch-all: for any unmatched route, serve index.html and let React Router handle it.
// Must be registered AFTER all API routes.
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../../front_end/dist", "index.html"));
});
```

### Path note

The path `../../front_end/dist` assumes `server.ts` compiles to
`server/dist/src/`. Adjust the number of `../` steps if your `tsconfig`
outputs elsewhere. Verify by checking the `outDir` in `server/tsconfig.json`.

### Placement in `server.ts`

The static middleware and catch-all must come **after** `registerHttpRoutes`
is called, otherwise the catch-all will intercept API requests:

```ts
const httpRouter = Router();
registerHttpRoutes(httpRouter);
app.use("/", httpRouter);

// Static serving comes after API routes
app.use(express.static(path.resolve(__dirname, "../../front_end/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../../front_end/dist", "index.html"));
});
```

---

## 4. Set Up ngrok

### Install and authenticate (one-time setup)

```bash
npm install -g ngrok
ngrok config add-authtoken YOUR_TOKEN
```

Get your auth token from https://dashboard.ngrok.com/authtokens.

### Expose the Express server

```bash
ngrok http 3000
```

ngrok will output a public URL like:
```
https://abc123.ngrok-free.app -> http://localhost:3000
```

Share this URL for public access. It tunnels directly to your Express server
which serves both the API and the React frontend.

---

## Summary of Changes

| File | Action |
|---|---|
| `front_end/src/components/Basket.tsx` | Replace `http://localhost:3000` with relative URLs |
| `front_end/src/server.ts` | Add static file serving and catch-all route |
| `front_end/` | Run `npm run build` to generate `dist` |
| ngrok | Install CLI, authenticate, run `ngrok http 3000` |
