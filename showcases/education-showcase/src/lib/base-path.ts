/**
 * The deployment base path. Empty in local development (the app owns the
 * origin); '/showcase' in the monolith deployment, where the showcase shares
 * the marketplace domain and lives under that prefix.
 *
 * NEXT_PUBLIC_ so the value inlines into the client bundle at build time,
 * matching the basePath the build was made with.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix an API route for client-side fetch/EventSource calls. */
export function apiPath(path: string): string {
  return `${BASE_PATH}${path}`;
}

/** Prefix a public asset path for plain <img> and QR logo uses. */
export function assetPath(path: string): string {
  return `${BASE_PATH}${path}`;
}
