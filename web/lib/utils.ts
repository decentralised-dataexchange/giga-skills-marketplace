import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

// Top-level route segments a provider slug must not shadow (the provider
// discovery path lives at /<slug>/.well-known/skills/...).
export const RESERVED_SLUGS = new Set([
  "a",
  "api",
  "builder",
  "developer",
  "fonts",
  "governance",
  "login",
  "provider",
  "providers",
  "settings",
  "showcase",
  "skill",
  "usecase",
  "well-known",
]);

// Flatten markdown to plain text for compact previews (list rows, cards, cells).
export function stripMd(s?: string | null): string {
  if (!s) return "";
  return s
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
