# SSE Frontend Refactor Plan

## Overview

The WebSocket hook and its usage in `Basket.tsx` are replaced with an SSE-based
hook. The `EventSource` API is native to the browser — no new packages are needed.

The connection lifecycle maps cleanly to React: the hook opens the `EventSource`
when `Basket` mounts and closes it when `Basket` unmounts (i.e. when the user
navigates away).

---

## 1. Replace `useWebSocket.ts` with `useSSE.ts`

Create `front_end/src/hooks/useSSE.ts`. The shape is similar to `useWebSocket`
but simpler — `EventSource` is receive-only, so `sendMessage` is removed entirely.

```ts
// front_end/src/hooks/useSSE.ts
import { useEffect, useState } from "react";
import type { Request } from "../types/Request";

export function useSSE(url: string) {
  const [newRequest, setNewRequest] = useState<Request | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log("SSE connected");
      setConnected(true);
    };

    eventSource.onmessage = (event: MessageEvent) => {
      const parsed: Request = JSON.parse(event.data);
      setNewRequest(parsed);
    };

    eventSource.onerror = () => {
      console.error("SSE error — connection lost, retrying...");
      setConnected(false);
      // EventSource retries automatically — no manual reconnect needed.
      // If the server is unreachable after retries, readyState will be CLOSED.
      if (eventSource.readyState === EventSource.CLOSED) {
        console.error("SSE connection closed permanently.");
      }
    };

    // Cleanup: close the connection when the component unmounts.
    return () => {
      eventSource.close();
    };
  }, [url]);

  return { newRequest, connected };
}
```

### Key differences from `useWebSocket`

| | `useWebSocket` | `useSSE` |
|---|---|---|
| Ref needed | Yes (`useRef<WebSocket>`) | No — `EventSource` is local to `useEffect` |
| `sendMessage` | Yes | Removed — SSE is receive-only |
| Reconnect on error | Manual | Automatic via `EventSource` |
| `connected` state | Yes | Yes |

A `useRef` is no longer needed because `eventSource` is scoped entirely within
`useEffect` — it's created, used, and cleaned up without needing to be accessed
outside of it.

---

## 2. Update `Basket.tsx`

### 2a. Replace the `useWebSocket` import and call

Remove:
```ts
import { useWebSocket } from '../hooks/useWebSocket';
const { newRequest, sendMessage } = useWebSocket(`http://localhost:3000/baskets/${url}`);
```

Add:
```ts
import { useSSE } from '../hooks/useSSE';
const { newRequest, connected } = useSSE(`http://localhost:3000/baskets/${url}/stream`);
```

Note the URL change: the SSE endpoint is `/baskets/:url/stream`, not `/baskets/:url`.

### 2b. Remove `sendMessage` from `handleNewRequest`

The `sendMessage` call and its comment can be removed — SSE is receive-only and
the server needs no acknowledgement from the client.

```ts
// Before
function handleNewRequest() {
  if (newRequest !== null) setRequests([...requests, newRequest]);
  sendMessage('GOT IT!');
}

// After
function handleNewRequest() {
  if (newRequest !== null) setRequests([...requests, newRequest]);
}
```

### 2c. Optionally surface `connected` in the UI

The `connected` boolean is available if you want to show a connection status indicator:

```tsx
{!connected && <p className="sse-status">Connecting...</p>}
```

---

## 3. No changes needed

- `App.tsx` — routing is unaffected
- `basketUtilities.ts` — unrelated to SSE
- `front_end/src/types/Request.ts` — the existing type aligns with the backend
  `RequestData` shape. No changes needed unless you want to add `endpoint` to
  the frontend type to match the backend payload exactly:

```ts
export interface Request {
  endpoint: string; // add if needed
  method: string;
  headers: HeadersType;
  body: string | {};
}
```

---

## Summary of File Changes

| File | Action |
|---|---|
| `front_end/src/hooks/useWebSocket.ts` | Replace with `useSSE.ts` |
| `front_end/src/hooks/useSSE.ts` | Create |
| `front_end/src/components/Basket.tsx` | Update import, hook call, and `handleNewRequest` |
| `front_end/src/types/Request.ts` | Optional — add `endpoint` field |
| `App.tsx` | No changes needed |
| `basketUtilities.ts` | No changes needed |
