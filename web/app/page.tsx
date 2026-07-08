"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Entry {
  slug: string;
  description: string;
  version: string;
  installs: number;
  protocols: string[];
  org: { name: string };
}

export default function MarketplacePage() {
  const [skills, setSkills] = useState<Entry[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api("/api/marketplace").then((d) => setSkills(d.skills)).catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return skills.filter((s) =>
      [s.slug, s.description, s.org.name, s.protocols.join(" ")].join(" ").toLowerCase().includes(needle),
    );
  }, [skills, q]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-20 pt-8">
      <section className="mb-8 rounded-2xl border border-border bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),radial-gradient(ellipse_80%_70%_at_50%_-10%,rgba(96,165,250,0.10),transparent)] bg-[size:44px_44px,44px_44px,100%_100%] p-10 text-center">
        <h1 className="mx-auto max-w-2xl text-balance text-4xl font-medium tracking-tight">
          Provider-published skill files. Any agent. Any model.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          Wallet solution providers publish reviewed skill files and anyone can compose them into working
          applications with the AI Integration Assistant. Built on W3C Verifiable Credentials, OpenID4VCI/VP, and
          the GovStack Wallet Building Block.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button nativeButton={false} render={<Link href="/builder" />}>Open the App Builder</Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/login" />}>Publish a skill</Button>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium">Published skills</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} skill{filtered.length === 1 ? "" : "s"} available
          </p>
        </div>
        <Input
          className="max-w-xs"
          placeholder="Search skills, providers, protocols..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Link key={s.slug} href={`/skill/${s.slug}`}>
            <Card className="h-full gap-3 p-5 transition-colors hover:border-muted-foreground/30 hover:bg-secondary/40">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.slug}</span>
                <Badge variant="secondary" className="tabular-nums">v{s.version}</Badge>
              </div>
              <p className="line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {s.protocols.map((p) => (
                  <Badge key={p} className="border-0 bg-blue-500/15 text-blue-300">{p}</Badge>
                ))}
              </div>
              <div className="mt-auto flex justify-between text-xs text-muted-foreground">
                <span>{s.org.name}</span>
                <span className="tabular-nums">{s.installs} install{s.installs === 1 ? "" : "s"}</span>
              </div>
            </Card>
          </Link>
        ))}
        {!filtered.length && (
          <p className="col-span-full py-16 text-center text-sm text-muted-foreground">No skills match your search.</p>
        )}
      </div>
    </main>
  );
}
