# WebSocket Implementation Guide

## Overview

WebSockets provide a persistent, bidirectional channel between browser and server. Unlike HTTP (one request → one response → done), a WebSocket stays open so the server can push data at any time.

**Goal:** When someone sends a webhook to `/:endpoint`, all browser tabs currently viewing that basket should receive the new request in real time — no page refresh.

**Data flow:**
1. Browser opens basket page → `useWebSocket` connects to `ws://localhost:3000/baskets/:endpoint`
2. Server registers that socket in a `clients` map keyed by endpoint
3. Someone POSTs to `/:endpoint` → server saves to MongoDB → server loops over `clients.get(endpoint)` and calls `client.send(savedDoc)` on each
4. Browser receives message → React state updates → new request appears instantly

---

## Status

- [x] `server/src/models/mongoModel.ts` — `addWebhookRequest` now returns the saved doc ✅
- [ ] `server/src/models/mongoSchema.ts` — add `timestamp` field
- [ ] `server/src/controllers/basketController.ts` — broken partial edit; full replacement needed
- [ ] `server/src/routes/wsRoutes.ts` — swap handler to `handleWsConnection`
- [ ] `server/src/server.ts` — wire up `express-ws` and register WS router
- [ ] `front_end/src/components/Basket.tsx` — uncomment import + fix URL scheme

---

## Change 2 — `server/src/controllers/basketController.ts`

**Why:** Three things are needed here:
1. A module-level `clients` map to track which WebSocket connections are watching each basket
2. A `handleWsConnection` method with the correct `(ws, req)` signature that `express-ws` expects
3. A broadcast inside `handleWebhookRequest` to push saved docs to connected clients

**The current file has a syntax error** — `const clients = new Map<string, Set<` is incomplete and placed inside the object literal where `const` declarations are illegal. Replace the entire file with:

```ts
import type { Request, Response } from "express";
import { WebSocket } from "ws";
import { mongoModel } from "../models/mongoModel";
import { pgModel } from "../models/pgModel";
import type { RequestData } from "../types/requests";

// Module-level registry: maps basket endpoint → connected WebSocket clients
// Must be outside the basketController object — const is not valid inside an object literal
const clients = new Map<string, Set<WebSocket>>();

export const basketController = {

  // WebSocket handler — express-ws calls this with (ws, req) instead of (req, res)
  // Registers the socket when a client connects, removes it when they disconnect
  handleWsConnection(ws: WebSocket, req: Request<{ endpoint: string }>) {
    const { endpoint } = req.params;
    if (!clients.has(endpoint)) clients.set(endpoint, new Set());
    clients.get(endpoint)!.add(ws);
    ws.on('close', () => {
      clients.get(endpoint)?.delete(ws);
    });
  },

  async handleGetBasketRequests(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;
    try {
      const requests = await mongoModel.getBasketRequests(endpoint);
      res.status(200).json(requests);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Failed to retrieve basket" });
    }
  },

  async handleCreateNewBasket(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;
    try {
      const basketExists = await pgModel.basketExists(endpoint);
      if (basketExists) {
        res.status(409).json({ error: "Endpoint already taken. Please choose another endpoint." });
      } else {
        try {
          const token = await pgModel.addNewBasket(endpoint);
          res.status(200).json({ [`basket_${endpoint}`]: token });
        } catch (e) {
          res.status(400).json({ error: "Basket could not be created." });
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  async handleWebhookRequest(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;
    const { method, headers, body } = req;
    const data: RequestData = { endpoint, method, headers, body };

    try {
      // Capture the returned saved document (includes _id and auto-generated timestamp)
      const saved = await mongoModel.addWebhookRequest(data);

      // Broadcast to all WebSocket clients currently viewing this basket
      const audience = clients.get(endpoint);
      if (audience) {
        const payload = JSON.stringify(saved);
        for (const client of audience) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        }
      }

      res.status(200).json({ msg: "Webhook message received." });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: 'Webhook request failed.' });
    }
  },

  async handleClearBasket(req: Request<{ endpoint: string }>, res: Response) {
    const { endpoint } = req.params;
    if (await pgModel.basketExists(endpoint)) {
      try {
        const { deletedCount } = await mongoModel.clearBasket(endpoint);
        res.status(200).json({ deletedCount });
      } catch (e) {
        res.status(400).json({ error: "Basket could not be cleared." });
      }
    } else {
      res.status(400).json({ error: "Basket doesn't exist!" });
    }
  },
};
```

---

## Change 3 — `server/src/routes/wsRoutes.ts`

**Why:** The route currently points at `handleGetBasketRequests`, which is an HTTP handler. It sends `res.status().json()` — there is no `res` object in a WebSocket handler, so it silently does nothing. Swap it to the new `handleWsConnection`.

One line change:

```ts
import { basketController } from "../controllers/basketController";
import type { Router } from 'express-ws';

export function registerWsRoutes(router: Router) {
  // Changed from handleGetBasketRequests to handleWsConnection
  router.ws("/baskets/:endpoint", basketController.handleWsConnection);
}
```

---

## Change 4 — `server/src/server.ts`

**Why:** `express-ws` is never applied to the app, and `registerWsRoutes` is never called. This means the server currently refuses all WebSocket connections.

Three additions are required:
1. `import expressWs from "express-ws"` — import the package
2. `expressWs(app)` — must be called **before** creating any routers, it patches the app with `.ws()` support
3. Import and register `wsRoutes` after the HTTP router

Replace the entire file:

```ts
import "./models/env";
import express from "express";
import expressWs from "express-ws";          // NEW
import cors from "cors";
import { Router } from "express";
import { registerHttpRoutes } from './routes/httpRoutes';
import { registerWsRoutes } from './routes/wsRoutes';  // NEW
import { connectDBs } from "./models/dbConnection";

const app = express();
expressWs(app);  // NEW — must come before any router creation
const PORT = 3000;

app.use(express.json());
app.use(cors());

const httpRouter = Router();
registerHttpRoutes(httpRouter);
app.use("/", httpRouter);

// NEW — register WebSocket routes
// `as any` is a TypeScript workaround: express-ws augments the Router type,
// but the plain Express Router import doesn't reflect that augmentation
const wsRouter = Router() as any;
registerWsRoutes(wsRouter);
app.use("/", wsRouter);

async function main() {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
  });

  await connectDBs();

  ['SIGINT', 'SIGTERM'].forEach(signal => {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  });
}

main();

export default app;
```

---

## Change 5 — `front_end/src/components/Basket.tsx`

**Why:** Two bugs crash the component before anything works:
1. The `useWebSocket` import is commented out but the hook is still called on line 10 → `ReferenceError: useWebSocket is not defined` on every render
2. The URL uses `http://` — browsers require `ws://` for WebSocket connections and will throw an error otherwise

**Line 5** — remove the `//` comment markers:

```ts
// BEFORE (broken — import is missing, but useWebSocket is still called below):
// import { useWebSocket } from '../hooks/useWebSocket';

// AFTER:
import { useWebSocket } from '../hooks/useWebSocket';
```

**Line 10** — change `http://` to `ws://`:

```ts
// BEFORE:
const { newRequest, sendMessage } = useWebSocket(`http://localhost:3000/baskets/${url}`);

// AFTER:
const { newRequest, sendMessage } = useWebSocket(`ws://localhost:3000/baskets/${url}`);
```

No other changes needed in this file. The existing `handleNewRequest` effect and `getRequests` initial fetch are already correct.

---

## How the Frontend Hook Works

For reference, `useWebSocket` in `front_end/src/hooks/useWebSocket.ts`:

- Opens a `new WebSocket(url)` on mount
- `onmessage`: parses the JSON payload and calls `setNewRequest(parsed)` — this triggers `Basket.tsx`'s `useEffect(handleNewRequest, [newRequest])`
- `handleNewRequest` in `Basket.tsx` appends the new request to the `requests` array, which re-renders the list
- `sendMessage('GOT IT!')` is called as an acknowledgment — currently the server ignores incoming client messages, so this is harmless but does nothing

---

## Verification

Start both servers, then open a basket in the browser and send a webhook from a terminal:

```bash
curl -X POST http://localhost:3000/YOUR-BASKET-NAME \
  -H "Content-Type: application/json" \
  -d '{"hello": "world"}'
```

**Expected:** The new request appears in the browser without refreshing.

**Browser console should show:**
- `WebSocket connected` — on page load (not a ReferenceError)

**Server console should show:**
- No import/TypeScript errors on startup
