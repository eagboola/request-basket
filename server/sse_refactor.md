# SSE Refactor Plan

## Overview

The WebSocket implementation is replaced with Server-Sent Events (SSE).
The key architectural change is that the `clients` Map no longer stores
`WebSocket` objects — it stores Express `Response` objects, since SSE pushes
data by writing to an open HTTP response.

`server.ts` requires **no changes** — it contains no WebSocket init or upgrade logic.

### Outline

```javascript
const clients = new Map(); // basketId -> [res, res, ...]
```

When a new request hits `POST /:basketId`, you look up `clients.get(basketId)` and push the event to each connected `res` object.

**Frontend needs three things, not two:**
1. Initial `GET /:basketId/requests` to load existing requests
2. `EventSource` connection to `GET /:basketId/stream` for live updates
3. Cleanup — close the `EventSource` on component unmount

#### Packages Needed

**Backend:** none beyond what you have — SSE is just Express setting specific headers on a response object.

**Frontend:** none — the browser's native `EventSource` API handles everything. Optionally, [`@microsoft/fetch-event-source`](https://github.com/Azure/fetch-event-source) if you need more control (custom headers, POST-based SSE).


#### The Full Flow
```
Frontend                          Backend                        DB
   |                                 |                            |
   |-- GET /:basketId/requests ----->|                            |
   |                                 |-- query ---------------->  |
   |<-- [existing requests] ---------|<-- results --------------- |
   |                                 |                            |
   |-- GET /:basketId/stream ------->|                            |
   |   (SSE connection stays open)   |-- clients.set(basketId)--> |
   |                                 |                            |
   |                                 |<-- POST /:basketId --------| (external sender)
   |                                 |-- save to DB ----------->  |
   |                                 |-- clients.get(basketId)    |
   |<-- SSE event (new request) -----|   push to all res objects  |
```

---

## 1. Delete `wsRoutes.ts`

This file is no longer needed. It can be safely deleted.

---

## 2. Extract `sseClients.ts`

Create `server/src/services/sseClients.ts` to hold the shared `clients` Map.
This avoids circular dependencies between the controller and any future services
that also need to push SSE events.

```ts
// server/src/services/sseClients.ts
import type { Response } from "express";

const clients = new Map<string, Set<Response>>();

export default clients;
```

---

## 3. Update `basketController.ts`

### 3a. Remove WebSocket imports and the local `clients` Map

Remove:
```ts
import { WebSocket } from "ws";
const clients = new Map<string, Set<WebSocket>>;
```

Add:
```ts
import clients from "../services/sseClients";
```

### 3b. Remove `handleWebSocketConnection`

This method is no longer needed and can be deleted entirely.

### 3c. Complete `streamBasketEvents`

This method handles the SSE handshake, registers the client, and cleans up
on disconnect.

```ts
async streamBasketEvents(req: Request<{ endpoint: string }>, res: Response) {
  const { endpoint } = req.params;

  // SSE headers — keep connection open, disable buffering
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Register this response object as a connected client
  if (!clients.has(endpoint)) clients.set(endpoint, new Set());
  const basketClients = clients.get(endpoint);
  if (basketClients) basketClients.add(res);

  // Send a heartbeat comment immediately to confirm connection
  res.write(": connected\n\n");

  // Clean up when client disconnects
  req.on("close", () => {
    const basketClients = clients.get(endpoint);
    if (basketClients) {
      basketClients.delete(res);
      if (basketClients.size === 0) clients.delete(endpoint);
    }
  });
},
```

### 3d. Update `handleWebhookRequest` to push SSE events

After saving to MongoDB, push the new request to any connected SSE clients
for that basket. The push is opportunistic — if no clients are connected,
it silently skips.

```ts
async handleWebhookRequest(req: Request<{ endpoint: string }>, res: Response) {
  const { endpoint } = req.params;
  const { method, headers, body } = req;

  const data: RequestData = {
    endpoint,
    method,
    headers,
    body,
  };

  try {
    await mongoModel.addWebhookRequest(data);

    // Push to any connected SSE clients for this basket
    const basketClients = clients.get(endpoint);
    if (basketClients && basketClients.size > 0) {
      const payload = `data: ${JSON.stringify(data)}\n\n`;
      basketClients.forEach((client) => client.write(payload));
    }

    res.status(200).json({ msg: "Webhook message received." });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Webhook request failed." });
  }
},
```

---

## 4. `httpRoutes.ts` — no structural changes needed

The SSE route is already registered:
```ts
router.get("/baskets/:endpoint/stream", basketController.streamBasketEvents);
```

One **ordering issue** to fix: `router.all("/:endpoint", ...)` is a catch-all
and must remain **below** all more specific routes to avoid swallowing them.
The current order is correct — verify it stays this way after any edits:

```ts
export function registerHttpRoutes(router: Router) {
  router.get("/baskets/:endpoint", basketController.handleGetBasketRequests);
  router.post("/baskets/create/:endpoint", basketController.handleCreateNewBasket);
  router.get("/baskets/:endpoint/stream", basketController.streamBasketEvents);
  router.put("/:endpoint/clear", basketController.handleClearBasket);
  router.all("/:endpoint", basketController.handleWebhookRequest); // catch-all — keep last
}
```

---

## 5. Add SSE Type (optional but recommended)

Create `server/src/types/SSEClient.ts` to make the client type explicit:

```ts
// server/src/types/SSEClient.ts
import type { Response } from "express";

export type SSEClient = Response;
export type SSEClientMap = Map<string, Set<SSEClient>>;
```

Then update `sseClients.ts` to use it:

```ts
import type { SSEClientMap } from "../types/SSEClient";

const clients: SSEClientMap = new Map();

export default clients;
```

---

## Summary of File Changes

| File | Action |
|---|---|
| `server/src/server.ts` | No changes needed |
| `server/src/routes/wsRoutes.ts` | Delete |
| `server/src/routes/httpRoutes.ts` | Verify route ordering only |
| `server/src/controllers/basketController.ts` | Remove WS logic, complete `streamBasketEvents`, update `handleWebhookRequest` |
| `server/src/services/sseClients.ts` | Create — extracted shared `clients` Map |
| `server/src/types/SSEClient.ts` | Create (optional) — explicit SSE type |
