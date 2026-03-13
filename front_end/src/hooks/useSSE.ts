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