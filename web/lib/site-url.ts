// The public URL of this deployment, e.g. https://skills-marketplace.igrant.io.
// SITE_URL is read at runtime (the Helm chart sets it from `domain`), so one
// image serves any hostname and no page hard-codes it.
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:4820").replace(/\/+$/, "");
}
