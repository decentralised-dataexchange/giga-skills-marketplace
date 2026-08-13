// HTTP boundary between the web app and the independently deployable marketplace.
// If MARKETPLACE_API_URL is omitted, legacy in-process handlers remain available for local development.
const baseUrl = process.env.MARKETPLACE_API_URL?.replace(/\/$/, "");

export const hasMarketplaceService = Boolean(baseUrl);

export class MarketplaceApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "MarketplaceApiError";
  }
}

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
    throw new MarketplaceApiError(
      response.status,
      body.error ?? `Marketplace request failed (${response.status})`,
    );
  }
  return body;
}
