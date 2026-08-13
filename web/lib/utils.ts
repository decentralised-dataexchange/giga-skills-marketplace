import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Row ids are UUIDs. Path segments are untrusted, and PostgreSQL raises a hard
// error when a non-UUID string is compared against a uuid column, so callers
// check the shape first and answer 404 instead of 500.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// URL/path-safe slug from a free-text name (e.g. an organisation name).
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "provider"
  );
}

// Slugs that must stay usable as route segments and cannot be taken by an
// organisation handle.
export const RESERVED_SLUGS = new Set([
  "api",
  "fonts",
  "governance",
  "login",
  "marketplace",
  "provider",
  "providers",
  "settings",
  "skill",
  "well-known",
]);
