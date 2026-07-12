// HTTP boundary between the Integration Assistant and the independently deployable marketplace.
// If MARKETPLACE_API_URL is omitted, legacy in-process handlers remain available for local development.
const baseUrl = process.env.MARKETPLACE_API_URL?.replace(/\/$/, "");

export const hasMarketplaceService = Boolean(baseUrl);

export async function marketplaceRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!baseUrl) throw new Error("MARKETPLACE_API_URL is not configured");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const error = new Error(body.error ?? `Marketplace request failed (${response.status})`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  return body;
}

export interface SkillContextRecord {
  slug: string;
  version: string;
  orgName: string;
  files: { path: string; content: string }[];
}

export function fetchSkillContext(slugs: string[]): Promise<{ skills: SkillContextRecord[] }> {
  const query = slugs.map((slug) => `slug=${encodeURIComponent(slug)}`).join("&");
  return marketplaceRequest(`/internal/v1/skill-context?${query}`, {
    headers: process.env.MARKETPLACE_INTERNAL_TOKEN
      ? { authorization: `Bearer ${process.env.MARKETPLACE_INTERNAL_TOKEN}` }
      : {},
  });
}
