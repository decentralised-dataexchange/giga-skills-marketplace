import { notFound, redirect } from "next/navigation";
import { catalogHomes } from "@/lib/catalog";
import { SkillChooser } from "@/components/skill-chooser";

export const dynamic = "force-dynamic";

// Skill slugs travel on their own in agent prompts. This resolves the owning
// provider and sends the visitor to the canonical, provider-scoped detail
// page. Skill names are unique per organisation, not across the catalog, so
// when several providers publish the same name the visitor picks the one they
// mean.
export default async function SkillEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const homes = await catalogHomes(slug);
  if (!homes.length) notFound();
  if (homes.length === 1) redirect(homes[0].path);
  return <SkillChooser slug={slug} homes={homes} suffix="" />;
}
