import { notFound, redirect } from "next/navigation";
import { catalogHomes } from "@/lib/catalog";
import { SkillChooser } from "@/components/skill-chooser";

export const dynamic = "force-dynamic";

// Provider-agnostic entry point for a review trail; with several published
// owners the visitor picks the provider whose trail they mean.
export default async function SkillReviewEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const homes = await catalogHomes(slug);
  if (!homes.length) notFound();
  if (homes.length === 1) redirect(`${homes[0].path}/review`);
  return <SkillChooser slug={slug} homes={homes} suffix="/review" />;
}
