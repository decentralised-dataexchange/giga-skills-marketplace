/**
 * Unique Learner Identifier and general record ids, browser edition.
 *
 * The showcase uses the format `ULID-<16 Crockford Base32 characters>` for
 * learner identifiers. Record ids for other store entries use the same
 * generator with a type prefix so every id stays opaque and non-enumerable.
 */

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function crockford(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) out += CROCKFORD[bytes[i] % 32];
  return out;
}

/** The national learner identifier: ULID- plus 16 Crockford Base32 characters. */
export function newUlid(): string {
  return `ULID-${crockford(16)}`;
}

/** An opaque record id with a type prefix, e.g. app_9Q3ZT... */
export function newId(prefix: string): string {
  return `${prefix}_${crockford(20)}`;
}
