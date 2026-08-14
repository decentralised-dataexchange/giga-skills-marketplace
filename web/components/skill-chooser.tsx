// Server-rendered chooser for a bare skill slug with several published
// owners: skill names are unique per organisation, not across the catalog,
// so the visitor picks the provider they mean.
import Link from "next/link";
import type { CatalogHome } from "@/lib/catalog";

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

export function SkillChooser({
  slug,
  homes,
  suffix,
}: {
  slug: string;
  homes: CatalogHome[];
  suffix: "" | "/review";
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        Several providers publish <span className="font-mono">{slug}</span>
      </h1>
      <p className="mt-2 text-muted-foreground">
        Skill names are unique inside one organisation, not across the catalog. Pick the provider
        you mean:
      </p>
      <ul className="mt-6 space-y-3">
        {homes.map((h) => (
          <li key={h.provider}>
            <Link
              href={`${h.path}${suffix}`}
              className="flex items-center gap-4 rounded-lg border border-border bg-white p-4 transition-colors hover:border-brand/40 hover:bg-cyan-tint/30"
            >
              {h.providerLogo ? (
                // eslint-disable-next-line @next/next/no-img-element -- provider-supplied logo url
                <img
                  src={h.providerLogo}
                  alt=""
                  className="size-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-muted-foreground">
                  {h.providerName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{h.providerName}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {h.provider}/{h.source}/{slug}
                </span>
              </span>
              <span className="shrink-0 text-right text-sm text-muted-foreground">
                {h.version ? <span className="block">v{h.version}</span> : null}
                {fmt(h.publishedAt) ? (
                  <span className="block text-xs">{fmt(h.publishedAt)}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
