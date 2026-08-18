"use client";

import { useEffect, useRef } from "react";

/**
 * Live status of one OWS exchange, by plain polling: every three seconds
 * the hook asks the server, and the server reads the exchange's record
 * straight from OWS - no webhooks, no tunnel, no relay storage anywhere.
 * The answer arrives as webhook-shaped topic events, so the callers read
 * one vocabulary. An extra poll on visibility/pageshow catches up the
 * moment the page returns from the wallet app on the same device.
 *
 * The caller names the sandbox and the exchange kind: the exchange id
 * alone does not say which OWS history holds it.
 */

const POLL_MS = 3000;

export type ExchangeOrg = "moe" | "civicworks";
export type ExchangeKind = "presentation" | "issuance";

export function useExchangeStatus(
  exchangeId: string | null,
  org: ExchangeOrg,
  kind: ExchangeKind,
  onEvent: (payload: Record<string, unknown>) => void,
) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    if (!exchangeId) return;
    let closed = false;
    let inFlight = false;

    const poll = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const answer = await fetch(
          `/showcase/api/exchanges/${exchangeId}/status?org=${org}&kind=${kind}`,
        );
        const body = (await answer.json()) as { events?: Record<string, unknown>[] };
        if (closed) return;
        for (const payload of body.events ?? []) handler.current(payload);
      } catch {
        // Transient failure: the next tick retries.
      } finally {
        inFlight = false;
      }
    };

    void poll();
    const timer = setInterval(poll, POLL_MS);
    const onResume = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("pageshow", onResume);

    return () => {
      closed = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, [exchangeId, org, kind]);
}
