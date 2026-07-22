import { notFound, redirect } from "next/navigation";
import { canonicalCatalogPath } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Provider-agnostic entry point: resolves the owning provider and sends the
// visitor to the canonical, provider-scoped use-case page.
export default async function UsecaseEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = await canonicalCatalogPath(slug);
  if (!path) notFound();
  redirect(path);
}
