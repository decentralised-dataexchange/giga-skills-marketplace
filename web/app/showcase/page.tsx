"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/markdown";
import { Pagination } from "@/components/pagination";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PAGE_SIZE = 9;

function ytId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function AppCard({ app }: { app: any }) {
  const yt = app.videoUrl ? ytId(app.videoUrl) : null;
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      {yt ? (
        <iframe
          className="aspect-video w-full border-b border-border"
          src={`https://www.youtube-nocookie.com/embed/${yt}`}
          title={`${app.title} demo video`}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : app.videoUrl ? (
        <a
          href={app.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="grid aspect-video w-full place-items-center border-b border-border bg-cyan-tint text-sm font-semibold text-brand hover:bg-accent"
        >
          Watch demo ↗
        </a>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="font-bold text-ink">{app.title}</h3>
        <Markdown className="flex-1 text-sm text-muted-foreground [&_p]:m-0 [&_p]:line-clamp-3">{app.description}</Markdown>
        <div className="flex flex-wrap gap-1.5">
          {app.usecases.map((u: string) => (
            <Link key={u} href={`/usecase/${u}`} className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand hover:underline">
              {u}
            </Link>
          ))}
          {app.skills.map((s: string) => (
            <Link key={s} href={`/skill/${s}`} className="rounded bg-secondary px-2 py-0.5 text-xs font-semibold text-ink/70 hover:underline">
              {s}
            </Link>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>by {app.developer.name} · {timeAgo(app.createdAt)}</span>
          {app.repoUrl && (
            <a href={app.repoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
              Source ↗
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ShowcasePage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ applications: any[]; total: number }>({ applications: [], total: 0 });

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (q.trim()) params.set("q", q.trim());
    api(`/api/applications?${params.toString()}`)
      .then((d) => setData({ applications: d.applications, total: d.total ?? d.applications.length }))
      .catch(console.error);
  }, [q, page]);

  return (
    <main className="mx-auto w-full max-w-[1536px] px-5 pb-24 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Showcase</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Applications developers built with published skills and use cases. {data.total} showcased.
          </p>
        </div>
        <Input
          type="search"
          aria-label="Search applications"
          className="max-w-xs border-input bg-white"
          placeholder="Search applications…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.applications.map((a) => (
          <AppCard key={a.id} app={a} />
        ))}
      </div>
      {!data.applications.length && (
        <p className="mt-8 rounded-xl border border-dashed border-border bg-white py-16 text-center text-sm text-muted-foreground">
          No applications yet. Developers can submit theirs from the Developer Console.
        </p>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} className="mt-8" />
    </main>
  );
}
