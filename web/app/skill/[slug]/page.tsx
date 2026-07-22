import { notFound, redirect } from "next/navigation";
import { canonicalCatalogPath } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Skill slugs travel on their own: a use case's `uses_skills` list, a showcase
// entry, an agent prompt. This resolves the owning provider and sends the
// visitor to the canonical, provider-scoped detail page.
export default async function SkillEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = await canonicalCatalogPath(slug);
  if (!path) notFound();
  redirect(path);
}
