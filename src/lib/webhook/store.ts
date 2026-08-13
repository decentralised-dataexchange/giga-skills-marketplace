import { getDb } from '@/lib/db';

/**
 * SQLite-backed webhook event store, keyed by exchange id. The receiver
 * inserts, SSE and the polling endpoint consume-and-delete, and expired rows
 * are swept on every insert. Duplicate deliveries are dropped by the primary
 * key on deliveryId, so redelivery is idempotent.
 */

const TTL_MS = 10 * 60 * 1000;

export type StoredEvent = {
  deliveryId: string;
  owsExchangeId: string;
  topic: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export function storeEvent(entry: {
  deliveryId: string;
  owsExchangeId: string;
  topic: string;
  payload: Record<string, unknown>;
}): void {
  const db = getDb();
  const now = Date.now();

  db.prepare('DELETE FROM "exchange_events" WHERE "expiresAt" < ?').run(
    new Date(now).toISOString()
  );

  db.prepare(
    `INSERT INTO "exchange_events"
       ("deliveryId", "owsExchangeId", "topic", "payload", "createdAt", "expiresAt")
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT("deliveryId") DO NOTHING`
  ).run(
    entry.deliveryId,
    entry.owsExchangeId,
    entry.topic,
    JSON.stringify(entry.payload),
    new Date(now).toISOString(),
    new Date(now + TTL_MS).toISOString()
  );
}

/** Atomically take (and delete) all stored events for one exchange id. */
export function consumeEvents(owsExchangeId: string): StoredEvent[] {
  const rows = getDb()
    .prepare(
      `DELETE FROM "exchange_events" WHERE "owsExchangeId" = ?
       RETURNING "deliveryId", "owsExchangeId", "topic", "payload", "createdAt"`
    )
    .all(owsExchangeId) as Array<Omit<StoredEvent, 'payload'> & { payload: string }>;

  return rows.map((row) => ({
    ...row,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
  }));
}
