import { notFound, redirect } from "next/navigation";
import { canonicalCatalogPath } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Provider-agnostic entry point for a review trail.
export default async function SkillReviewEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const path = await canonicalCatalogPath(slug);
  if (!path) notFound();
  redirect(`${path}/review`);
}
