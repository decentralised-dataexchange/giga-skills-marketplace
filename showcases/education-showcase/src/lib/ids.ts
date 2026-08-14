import { randomBytes } from "crypto";

/**
 * Unique Learner Identifier and general row ids.
 *
 * The RFQ showcase uses the format `ULID-<16 Crockford Base32 characters>` for
 * learner identifiers. Row ids for other tables use the same generator with a
 * table-specific prefix so every id stays opaque and non-enumerable.
 */

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function crockford(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CROCKFORD[bytes[i] % 32];
  return out;
}

/** The national learner identifier: ULID- plus 16 Crockford Base32 characters. */
export function newUlid(): string {
  return `ULID-${crockford(16)}`;
}

/** An opaque row id with a type prefix, e.g. app_9Q3ZT... */
export function newId(prefix: string): string {
  return `${prefix}_${crockford(20)}`;
}
