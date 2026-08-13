"use client";

import Link from "next/link";
import { AgentsStrip } from "@/components/agent-logo";
import { ProviderCatalog } from "@/components/provider-catalog";

// Homepage: a short centred hero, then the provider catalog itself. The
// explanatory sections live in the Knowledgebase; detail pages stay under
// /marketplace/<provider>/....

export default function LandingPage() {
  return (
    <main className="w-full">
      {/* Hero */}
      <section className="border-b border-panel-border">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 xl:py-20">
          <div className="max-w-[920px]">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Agent skills for AI-built DPI
            </h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-[#374151]">
              Reviewed, agent-agnostic skills for the education wallet building block - published
              from public GitHub repositories, installable into any AI coding agent.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#catalog"
                className="rounded-lg bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Browse skills
              </Link>
              <Link
                href="/knowledgebase"
                className="rounded-lg border border-[#dadde1] bg-white px-6 py-3 text-base font-semibold text-brand transition-colors hover:border-brand hover:bg-brand hover:text-white"
              >
                How it works
              </Link>
            </div>
            <AgentsStrip label="Works with" className="mt-10" />
          </div>
        </div>
      </section>

      {/* The catalog, on the homepage itself */}
      <ProviderCatalog />
    </main>
  );
}
