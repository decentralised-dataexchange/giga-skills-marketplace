"use client";

import { useEffect, useRef, useState } from "react";

import { apiPath } from "@/lib/base-path";

/**
 * Live status of one OWS exchange: opens the SSE stream and drops to
 * two-second polling when SSE errors. Each received payload is handed to the
 * caller once; the server deletes an event when it is consumed.
 */
export function useExchangeStatus(
  exchangeId: string | null,
  onEvent: (payload: Record<string, unknown>) => void,
) {
  const [transport, setTransport] = useState<"sse" | "polling" | "idle">("idle");
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    if (!exchangeId) return;

    let closed = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    const source = new EventSource(apiPath(`/api/exchanges/${exchangeId}/events`));
    setTransport("sse");

    source.onmessage = (message) => {
      try {
        handler.current(JSON.parse(message.data));
      } catch {
        // Ignore unparseable frames.
      }
    };

    source.onerror = () => {
      if (closed) return;
      source.close();
      setTransport("polling");
      pollTimer = setInterval(async () => {
        try {
          const answer = await fetch(apiPath(`/api/exchanges/${exchangeId}/status`));
          const body = (await answer.json()) as {
            events?: Record<string, unknown>[];
          };
          for (const payload of body.events ?? []) handler.current(payload);
        } catch {
          // Keep polling.
        }
      }, 2000);
    };

    return () => {
      closed = true;
      source.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [exchangeId]);

  return transport;
}
