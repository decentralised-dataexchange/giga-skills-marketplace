import { createHash } from 'crypto';

import { getDb } from '@/lib/db';
import { newId } from '@/lib/ids';

/**
 * Append-only audit log with a SHA-256 hash chain.
 *
 * Each row's hash covers the previous row's hash plus this row's content, so
 * any later edit to a stored row breaks the chain. The database triggers in
 * db.ts refuse UPDATE and DELETE outright.
 */

export type AuditEvent = {
  seq: number;
  id: string;
  actorUserId: string | null;
  actorRole: string;
  action: string;
  subjectType: string;
  subjectId: string;
  payload: string;
  prevHash: string;
  hash: string;
  createdAt: string;
};

export function audit(entry: {
  actorUserId?: string | null;
  actorRole: string;
  action: string;
  subjectType: string;
  subjectId: string;
  payload?: Record<string, unknown>;
}): void {
  const db = getDb();
  const now = new Date().toISOString();
  const id = newId('aud');
  const payload = JSON.stringify(entry.payload ?? {});

  const insert = db.transaction(() => {
    const prev = db
      .prepare('SELECT "hash" FROM "audit_events" ORDER BY "seq" DESC LIMIT 1')
      .get() as { hash: string } | undefined;
    const prevHash = prev?.hash ?? 'genesis';
    const hash = createHash('sha256')
      .update(
        [
          prevHash,
          id,
          entry.actorUserId ?? '',
          entry.actorRole,
          entry.action,
          entry.subjectType,
          entry.subjectId,
          payload,
          now,
        ].join('|')
      )
      .digest('hex');

    db.prepare(
      `INSERT INTO "audit_events"
        ("id", "actorUserId", "actorRole", "action", "subjectType", "subjectId",
         "payload", "prevHash", "hash", "createdAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      entry.actorUserId ?? null,
      entry.actorRole,
      entry.action,
      entry.subjectType,
      entry.subjectId,
      payload,
      prevHash,
      hash,
      now
    );
  });

  insert();
}

/** The full timeline, newest first, for the Ministry audit screen. */
export function auditTimeline(limit = 200): AuditEvent[] {
  return getDb()
    .prepare('SELECT * FROM "audit_events" ORDER BY "seq" DESC LIMIT ?')
    .all(limit) as AuditEvent[];
}

/** Verify the hash chain; returns the first broken seq or null when intact. */
export function verifyAuditChain(): number | null {
  const rows = getDb()
    .prepare('SELECT * FROM "audit_events" ORDER BY "seq" ASC')
    .all() as AuditEvent[];

  let prevHash = 'genesis';
  for (const row of rows) {
    const expected = createHash('sha256')
      .update(
        [
          prevHash,
          row.id,
          row.actorUserId ?? '',
          row.actorRole,
          row.action,
          row.subjectType,
          row.subjectId,
          row.payload,
          row.createdAt,
        ].join('|')
      )
      .digest('hex');
    if (row.prevHash !== prevHash || row.hash !== expected) return row.seq;
    prevHash = row.hash;
  }
  return null;
}
