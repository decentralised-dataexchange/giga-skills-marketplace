"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "@/components/icons";
import { api } from "@/lib/client";
import { Markdown } from "@/components/markdown";
import { Pagination } from "@/components/pagination";
import { Tip } from "@/components/tip";
import { providerPath } from "@/lib/routes";

interface Provider {
  id: string;
  slug: string | null;
  name: string;
  logo: string | null;
  website: string | null;
  description: string;
  skillCount: number;
}

function monogram(text: string) {
  return text
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 2)
    .toUpperCase();
}

const PAGE_SIZE = 12;

// The public provider catalog (the skills.sh-style leaderboard list), embedded
// on the homepage. Detail pages stay under /marketplace/<provider>/....
export function ProviderCatalog() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [providers, setProviders] = useState<{
    providers: Provider[];
    total: number;
  }>({
    providers: [],
    total: 0,
  });

  useEffect(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (q.trim()) params.set("q", q.trim());
    api(`/api/providers?${params.toString()}`)
      .then((d) =>
        setProviders({
          providers: d.providers,
          total: d.total ?? d.providers.length,
        }),
      )
      .catch(console.error);
  }, [q, page]);

  return (
    <section id="catalog" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <h2 className="mb-2 text-3xl font-semibold tracking-tight text-ink">Marketplace</h2>
      <p className="text-sm text-muted-foreground">
        {providers.total} provider{providers.total === 1 ? "" : "s"}
      </p>

      {/* Underline search field, as the skills.sh index search */}
      <div className="relative mt-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <input
          type="search"
          aria-label="Search providers"
          className="w-full border-b border-input bg-transparent py-3 pl-8 pr-8 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ink lg:text-sm"
          placeholder="Search providers…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Flat provider table, as the skills.sh leaderboard list */}
      <div className="w-full py-4">
        <div className="hidden border-b border-border py-3 text-sm font-medium uppercase text-muted-foreground lg:grid lg:grid-cols-16 lg:gap-4">
          <div className="col-span-13">Provider</div>
          <div className="col-span-3 text-right">Skills</div>
        </div>
        <div className="divide-y divide-border">
          {providers.providers.map((p) => (
            <Link
              key={p.id}
              href={providerPath(p.slug ?? p.id)}
              className="group grid grid-cols-[1fr_auto] items-center gap-3 py-3 transition-colors hover:bg-accent/30 lg:grid-cols-16 lg:gap-4"
            >
              <span className="flex min-w-0 items-center gap-3 lg:col-span-13">
                {p.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.logo}
                    alt=""
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-panel text-xs font-bold tracking-tight text-ink ring-1 ring-border">
                    {monogram(p.name)}
                  </span>
                )}
                <span className="flex min-w-0 flex-col lg:flex-row lg:items-baseline lg:gap-2">
                  <Tip content={p.name}>
                    <span className="truncate font-semibold text-ink group-hover:text-brand lg:max-w-[50%] lg:shrink-0">
                      {p.name}
                    </span>
                  </Tip>
                  <Tip content={p.description}>
                    <span className="min-w-0">
                      <Markdown className="min-w-0 text-xs text-muted-foreground [&_p]:m-0 [&_p]:line-clamp-1 lg:text-sm">
                        {p.description}
                      </Markdown>
                    </span>
                  </Tip>
                </span>
              </span>
              <span className="text-right text-sm tabular-nums text-ink lg:col-span-3">
                {p.skillCount}
              </span>
            </Link>
          ))}
        </div>
      </div>
      {!providers.providers.length && (
        <p className="border-b border-border py-16 text-center text-sm text-muted-foreground">
          No providers match your search.
        </p>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={providers.total}
        onPage={setPage}
        className="mt-6"
      />
    </section>
  );
}
