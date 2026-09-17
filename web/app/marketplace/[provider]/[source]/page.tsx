"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, Search, Star, X } from "@/components/icons";
import { api, fetchAllProviderSkills, timeAgo } from "@/lib/client";
import { installRepoCommand, installSkillsCommand } from "@/lib/agents";
import { providerPath, skillPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface Provider {
  id: string;
  name: string;
  slug: string | null;
  skillCount: number;
}

interface SkillEntry {
  slug: string;
  description: string;
  publishedAt: string | null;
  categories?: string[];
  source: { repo: string | null } | null;
  repo: {
    url: string;
    owner: string;
    repo: string;
    dir: string;
    stars: number;
  } | null;
}

// The catalog <source> segment: the source record's repo name, falling back
// to the published version's repo blob, then the "bundles" pseudo-source.
const sourceSegment = (s: SkillEntry) => s.source?.repo ?? s.repo?.repo ?? "bundles";

// The category of a skill: the metadata.category extension when the skill
// declares one, else the top-level repo directory (the legacy grouping),
// else the "skills" catch-all.
const skillCategory = (s: SkillEntry) => {
  if (s.categories?.length) return s.categories[0];
  const dir = s.repo?.dir ?? "";
  return dir.includes("/") ? dir.split("/")[0] : "skills";
};

// Every category a skill belongs to: its declared metadata.categories, else the
// single legacy category. The first entry is the primary (its section home); a
// skill can carry extra tags (for example "education") so a filter gathers a
// cross-cutting set without moving the skill out of its natural section.
const skillCategories = (s: SkillEntry): string[] =>
  s.categories?.length ? s.categories : [skillCategory(s)];

// The query param that carries the active category filters, comma-separated,
// so a filtered view is shareable by its URL.
const CATEGORY_PARAM = "category";

// A self-contained multi-select category filter: a trigger button and a panel
// of checkboxes, toggled by local open state and closed on an outside click or
// Escape. It is deliberately plain (no portal, no floating-ui) so it can never
// stall the page; the chosen set is owned by the caller via the URL.
function CategoryDropdown({
  categories,
  active,
  onToggle,
  onClear,
  disabled = false,
}: {
  categories: string[];
  active: Set<string>;
  onToggle: (category: string) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={disabled ? "This source has no categories to filter" : undefined}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          disabled
            ? "cursor-not-allowed border-border text-muted-foreground opacity-50"
            : active.size > 0
              ? "border-brand text-brand"
              : "border-border text-muted-foreground hover:border-brand/40 hover:text-ink",
        )}
      >
        {active.size === 0
          ? "All categories"
          : `${active.size} categor${active.size === 1 ? "y" : "ies"} selected`}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-lg border border-border bg-white p-1 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-muted-foreground">Filter by category</span>
            {active.size > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium text-brand hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          {categories.map((cat) => (
            <label
              key={cat}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={active.has(cat)}
                onChange={() => onToggle(cat)}
                className="size-4 shrink-0 accent-brand"
              />
              <span className="truncate">{cat}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// One source of a provider: a GitHub repository (addressed by repo name), or
// the "bundles" pseudo-source for skills published without a repository.
function SourcePageInner() {
  const { provider: handle, source } = useParams<{
    provider: string;
    source: string;
  }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [skills, setSkills] = useState<SkillEntry[] | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // Interaction state that is not shareable, reset when the source changes.
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // The active category filters live in the URL, so a filtered view is
  // shareable. The query string is the single source of truth; toggling a
  // category rewrites it, and the derived set drives filtering and the menu.
  const activeCats = new Set(
    (searchParams.get(CATEGORY_PARAM) ?? "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean),
  );

  function writeCategoryFilter(next: Set<string>) {
    const params = new URLSearchParams(searchParams.toString());
    const list = [...next];
    if (list.length) params.set(CATEGORY_PARAM, list.join(","));
    else params.delete(CATEGORY_PARAM);
    const qs = params.toString();
    // replace(), not push(): filtering should not stack browser history.
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  function toggleCat(cat: string) {
    const next = new Set(activeCats);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    writeCategoryFilter(next);
  }

  // Clear the search and the selection when the visitor moves to another
  // source. The category filters live in the URL, so they clear on their own
  // when the path changes. Adjusting state during render is React's
  // recommended pattern for a reset keyed to a changed prop.
  const routeKey = `${handle}/${source}`;
  const [seenRoute, setSeenRoute] = useState(routeKey);
  if (seenRoute !== routeKey) {
    setSeenRoute(routeKey);
    setQuery("");
    setSelected(new Set());
  }

  useEffect(() => {
    api(`/api/providers/${encodeURIComponent(handle)}`)
      .then(setProvider)
      .catch((e) => setError(e.message));
    fetchAllProviderSkills(handle)
      .then((all) => setSkills(all.filter((s: SkillEntry) => sourceSegment(s) === source)))
      .catch(() => setSkills([]));
  }, [handle, source]);

  const repo = skills?.find((s) => s.repo)?.repo ?? null;
  // The interactive controls (search, filters, checkboxes) only make sense for
  // a real repository with more than one skill to choose between.
  const interactive = !!repo && (skills?.length ?? 0) > 1;

  // Every distinct category in the source, most-populated first, for the menu.
  // A skill counts once per category it carries, so a cross-cutting tag (for
  // example "education") appears alongside the primary ones.
  const allCategories = [
    ...(skills ?? []).reduce((m, s) => {
      for (const c of skillCategories(s)) m.set(c, (m.get(c) ?? 0) + 1);
      return m;
    }, new Map<string, number>()),
  ]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  // The skills that pass the search box and the active category filters. A skill
  // matches when any of its categories is active, so the "education" filter
  // gathers the whole showcase set while each skill keeps its natural section.
  const q = query.trim().toLowerCase();
  const visible = (skills ?? []).filter((s) => {
    const matchesQ =
      !q || s.slug.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
    const matchesCat = activeCats.size === 0 || skillCategories(s).some((c) => activeCats.has(c));
    return matchesQ && matchesCat;
  });

  // Section the visible skills by category, most-populated first.
  const sections = [
    ...visible.reduce((m, s) => {
      const key = skillCategory(s);
      return m.set(key, [...(m.get(key) ?? []), s]);
    }, new Map<string, SkillEntry[]>()),
  ].sort(([, a], [, b]) => b.length - a.length);

  // The install command reflects the selection: the whole source when nothing
  // (or everything) is ticked, else one --skill flag per ticked skill.
  const selectedList = (skills ?? []).filter((s) => selected.has(s.slug)).map((s) => s.slug);
  const command = !repo
    ? ""
    : selected.size === 0 || selected.size === (skills?.length ?? 0)
      ? installRepoCommand(repo.url)
      : installSkillsCommand(repo.url, selectedList);

  // The select-all checkbox acts on the currently visible skills.
  const visibleSlugs = visible.map((s) => s.slug);
  const allVisibleSelected =
    visibleSlugs.length > 0 && visibleSlugs.every((sl) => selected.has(sl));
  const someVisibleSelected = visibleSlugs.some((sl) => selected.has(sl));

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleSlugs.forEach((sl) => next.delete(sl));
      else visibleSlugs.forEach((sl) => next.add(sl));
      return next;
    });
  }
  function toggleSkill(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function copyInstall() {
    if (!command) return;
    navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (error)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground sm:px-6 lg:px-8">
        {error}
      </main>
    );
  if (!provider || skills === null)
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground sm:px-6 lg:px-8">
        Loading...
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"
      >
        <Link href="/" className="shrink-0 hover:text-ink">
          marketplace
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <Link
          href={providerPath(provider.slug ?? handle)}
          className="min-w-0 truncate hover:text-ink"
        >
          {provider.slug ?? handle}
        </Link>
        <span className="shrink-0" aria-hidden="true">
          /
        </span>
        <span className="min-w-0 truncate">{source}</span>
      </nav>

      {/* Header: title and stats */}
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-ink">
          {repo ? `${repo.owner}/${repo.repo}` : "Marketplace bundles"}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink">
          <span className="whitespace-nowrap">
            <b className="tabular-nums">{skills.length}</b> skill
            {skills.length === 1 ? "" : "s"}
          </span>
          {repo && (
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Star className="size-4 text-amber-500" aria-hidden="true" />
              <b className="tabular-nums">{repo.stars}</b> GitHub stars
            </span>
          )}
          {repo && (
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-brand hover:underline"
            >
              GitHub <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* Install command for the current selection. It installs the whole
          source by default, or only the ticked skills once some are chosen. */}
      {command && skills.length > 0 && (
        <div className="mb-10 max-w-3xl">
          {interactive && (
            <p className="mb-2 text-sm text-muted-foreground">
              {selected.size === 0
                ? "The command installs every skill in this source. Select skills to install a subset."
                : selected.size === skills.length
                  ? "The command installs every skill in this source."
                  : `The command installs ${selected.size} selected skill${selected.size === 1 ? "" : "s"}.`}
            </p>
          )}
          <div className="flex w-full items-center gap-2 rounded-md bg-muted px-3 py-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-ink">
              <span className="select-none opacity-50">$ </span>
              {command}
            </code>
            <button
              type="button"
              onClick={copyInstall}
              aria-label="Copy install command"
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-ink"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Search field with the category filter on its right. The filter is a
          checkbox dropdown so it scales to many categories, and the choice
          lives in the URL so the filtered view is shareable. Chosen categories
          also show as removable pills below for at-a-glance state. */}
      {interactive && (
        <div className="mb-6 space-y-3">
          <div className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center">
                <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <input
                type="search"
                aria-label="Search skills"
                className="w-full border-b border-input bg-transparent py-3 pl-8 pr-8 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ink lg:text-sm"
                placeholder="Search skills…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-0 flex items-center text-muted-foreground hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <CategoryDropdown
              categories={allCategories}
              active={activeCats}
              onToggle={toggleCat}
              onClear={() => writeCategoryFilter(new Set())}
              disabled={allCategories.length <= 1}
            />
          </div>

          {allCategories.length > 1 && activeCats.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {[...activeCats].map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-full border border-brand bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() => toggleCat(cat)}
                    aria-label={`Remove ${cat} filter`}
                    className="transition-colors hover:text-brand-dark"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => writeCategoryFilter(new Set())}
                className="text-xs font-medium text-muted-foreground hover:text-ink"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Skill table, sectioned by category (metadata.category, else the
          top-level repo directory) with a select-all header and per-skill
          checkboxes that drive the install command above */}
      <div className="w-full py-4">
        <div className="flex items-center gap-3 border-b border-border py-3 text-sm font-medium uppercase text-muted-foreground">
          {interactive && (
            <input
              type="checkbox"
              ref={(el) => {
                if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
              }}
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              aria-label="Select all skills"
              className="size-4 shrink-0 accent-brand"
            />
          )}
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-3 lg:grid-cols-16 lg:gap-4">
            <span className="lg:col-span-13">Skill</span>
            <span className="text-right lg:col-span-3">Published</span>
          </div>
        </div>
        <div className="space-y-10">
          {sections.map(([category, group]) => (
            <section key={category}>
              {sections.length > 1 && (
                <h2 className="mb-3 mt-6 text-sm font-medium uppercase text-ink">{category}</h2>
              )}
              <div className="divide-y divide-border">
                {group.map((s) => (
                  <div
                    key={s.slug}
                    className="flex items-start gap-3 py-3 transition-colors hover:bg-accent/30"
                  >
                    {interactive && (
                      <input
                        type="checkbox"
                        checked={selected.has(s.slug)}
                        onChange={() => toggleSkill(s.slug)}
                        aria-label={`Select ${s.slug}`}
                        className="mt-0.5 size-4 shrink-0 accent-brand"
                      />
                    )}
                    <Link
                      href={skillPath(provider.slug ?? handle, source, s.slug)}
                      className="group grid min-w-0 flex-1 grid-cols-[1fr_auto] items-start gap-3 lg:grid-cols-16 lg:gap-4"
                    >
                      <span className="min-w-0 overflow-hidden lg:col-span-13">
                        <span className="block truncate font-semibold text-ink group-hover:text-brand">
                          {s.slug}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground lg:text-sm">
                          {s.description}
                        </span>
                      </span>
                      <span className="pt-0.5 text-right text-sm text-muted-foreground lg:col-span-3">
                        {timeAgo(s.publishedAt)}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        {!skills.length && (
          <p className="border-b border-border py-16 text-center text-sm text-muted-foreground">
            No skills in this source.
          </p>
        )}
        {skills.length > 0 && !visible.length && (
          <p className="border-b border-border py-16 text-center text-sm text-muted-foreground">
            No skills match your search or filters.
          </p>
        )}
      </div>
    </main>
  );
}

export default function SourcePage() {
  // useSearchParams needs a Suspense boundary to keep the route out of a
  // build-time bail-out; the page is client-rendered on demand anyway.
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-7xl px-4 py-10 text-muted-foreground sm:px-6 lg:px-8">
          Loading...
        </main>
      }
    >
      <SourcePageInner />
    </Suspense>
  );
}
