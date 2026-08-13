"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight } from "@/components/icons";
import { DOCS, DOC_ORDER } from "@/lib/docs";
import { cn } from "@/lib/utils";

// "Knowledgebase / Section / Page" trail above the article.
export function DocsBreadcrumb() {
  const pathname = usePathname();
  const current = DOC_ORDER.find((p) => p.href === pathname);
  const section = DOCS.find((s) => s.pages.some((p) => p.href === pathname));
  return (
    <p className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <Link href="/knowledgebase" className="font-medium hover:text-ink">
        Knowledgebase
      </Link>
      {section && (
        <>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span>{section.label}</span>
        </>
      )}
      {current && current.href !== "/knowledgebase" && (
        <>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-ink">{current.title}</span>
        </>
      )}
    </p>
  );
}

// Sidebar navigation in the Docusaurus menu treatment: bold section labels
// over rounded menu items; the active page carries the brand tint.
export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Knowledgebase" className="space-y-5">
      {DOCS.map((section) => (
        <div key={section.label}>
          <p className="mb-1 px-3 text-[13px] font-bold text-ink">{section.label}</p>
          <div className="space-y-0.5">
            {section.pages.map((p) => {
              const active = pathname === p.href;
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-1.5 text-sm text-ink/70 transition-colors hover:bg-black/5 hover:text-ink",
                    active &&
                      "bg-cyan-tint font-medium text-brand hover:bg-cyan-tint hover:text-brand",
                  )}
                >
                  {p.title}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

// Small-screen table of contents: a collapsible box above the article.
export function DocsNavMobile() {
  const pathname = usePathname();
  const current = DOC_ORDER.find((p) => p.href === pathname);

  return (
    <details className="group rounded-lg border border-panel-border bg-panel lg:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-ink">
        {current?.title ?? "Knowledgebase"}
        <ChevronDown
          className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-panel-border px-4 py-3">
        <DocsNav />
      </div>
    </details>
  );
}

const headingSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

// The right-hand "On this page" rail: anchors for every h2 in the article,
// with the section in view highlighted (the Docusaurus table of contents).
export function DocsToc() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<{ id: string; text: string }[]>([]);
  const [active, setActive] = useState("");

  useEffect(() => {
    const nodes = [...document.querySelectorAll<HTMLHeadingElement>(".docs-prose h2")];
    const list = nodes.map((node) => {
      const id = node.id || headingSlug(node.textContent ?? "");
      node.id = id;
      return { id, text: node.textContent ?? "" };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from the rendered article
    setHeadings(list);

    // The section in view is the last heading above the masthead line; at the
    // very end of a short page, the last section counts as in view.
    const onScroll = () => {
      let current = nodes[0]?.id ?? "";
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= 130) current = node.id;
      }
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4 && nodes.length) {
        current = nodes[nodes.length - 1].id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="hidden w-[220px] shrink-0 xl:block">
      <div className="sticky top-[104px] border-l border-panel-border pl-4 text-sm">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          On this page
        </p>
        <ul className="space-y-1.5">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                className={cn(
                  "block leading-snug text-ink/60 transition-colors hover:text-ink",
                  active === h.id && "font-medium text-brand",
                )}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

// Previous/next footer links, walking the flat page order.
export function DocsPager() {
  const pathname = usePathname();
  const index = DOC_ORDER.findIndex((p) => p.href === pathname);
  if (index < 0) return null;
  const prev = index > 0 ? DOC_ORDER[index - 1] : null;
  const next = index < DOC_ORDER.length - 1 ? DOC_ORDER[index + 1] : null;

  return (
    <div className="mt-12 grid gap-4 border-t border-panel-border pt-6 sm:grid-cols-2">
      {prev ? (
        <Link
          href={prev.href}
          className="group rounded-lg border border-panel-border p-4 transition-colors hover:border-brand"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Previous
          </span>
          <span className="mt-1 block font-semibold text-ink group-hover:text-brand">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="group rounded-lg border border-panel-border p-4 text-right transition-colors hover:border-brand"
        >
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Next
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
          <span className="mt-1 block font-semibold text-ink group-hover:text-brand">
            {next.title}
          </span>
        </Link>
      )}
    </div>
  );
}
