"use client";

/**
 * Append-only audit log with a SHA-256 hash chain, kept in this browser's
 * store. Each event's hash covers the previous event's hash plus this
 * event's content, so any later edit to a stored event breaks the chain.
 * The hash-input field order matches the original server-side registry, so
 * the semantics read the same. The trail records this browser's demo run.
 */

import { newId } from "@/lib/showcase/ids";
import { getState, store, type AuditEvent } from "@/lib/showcase/store";

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hashInput(entry: {
  prevHash: string;
  id: string;
  actorPseudonym: string | null;
  actorRole: string;
  action: string;
  subjectType: string;
  subjectId: string;
  payload: string;
  createdAt: string;
}): string {
  return [
    entry.prevHash,
    entry.id,
    entry.actorPseudonym ?? "",
    entry.actorRole,
    entry.action,
    entry.subjectType,
    entry.subjectId,
    entry.payload,
    entry.createdAt,
  ].join("|");
}

// Appends serialise on this queue so two quick events never race the chain.
let appendQueue: Promise<void> = Promise.resolve();

export function audit(entry: {
  actorPseudonym?: string | null;
  actorRole: string;
  action: string;
  subjectType: string;
  subjectId: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  appendQueue = appendQueue.then(async () => {
    const events = getState().audit;
    const prevHash = events[events.length - 1]?.hash ?? "genesis";
    const createdAt = new Date().toISOString();
    const id = newId("aud");
    const payload = JSON.stringify(entry.payload ?? {});
    const actorPseudonym = entry.actorPseudonym ?? null;
    const hash = await sha256Hex(
      hashInput({
        prevHash,
        id,
        actorPseudonym,
        actorRole: entry.actorRole,
        action: entry.action,
        subjectType: entry.subjectType,
        subjectId: entry.subjectId,
        payload,
        createdAt,
      }),
    );
    store.setAudit([
      ...events,
      {
        seq: events.length + 1,
        id,
        actorPseudonym,
        actorRole: entry.actorRole,
        action: entry.action,
        subjectType: entry.subjectType,
        subjectId: entry.subjectId,
        payload,
        prevHash,
        hash,
        createdAt,
      },
    ]);
  });
  return appendQueue;
}

/** The full timeline, newest first, for the audit trail page. */
export function auditTimeline(events: AuditEvent[], limit = 200): AuditEvent[] {
  return [...events].sort((a, b) => b.seq - a.seq).slice(0, limit);
}

/** Verify the hash chain; returns the first broken seq or null when intact. */
export async function verifyAuditChain(events: AuditEvent[]): Promise<number | null> {
  const ordered = [...events].sort((a, b) => a.seq - b.seq);
  let prevHash = "genesis";
  for (const event of ordered) {
    const expected = await sha256Hex(
      hashInput({
        prevHash,
        id: event.id,
        actorPseudonym: event.actorPseudonym,
        actorRole: event.actorRole,
        action: event.action,
        subjectType: event.subjectType,
        subjectId: event.subjectId,
        payload: event.payload,
        createdAt: event.createdAt,
      }),
    );
    if (event.prevHash !== prevHash || event.hash !== expected) return event.seq;
    prevHash = event.hash;
  }
  return null;
}
