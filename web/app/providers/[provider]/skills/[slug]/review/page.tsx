"use client";

import { useParams } from "next/navigation";
import { ReviewTrail } from "@/components/review-trail";
import { skillPath } from "@/lib/routes";

export default function SkillReviewPage() {
  const { provider, slug } = useParams<{ provider: string; slug: string }>();
  return <ReviewTrail slug={slug} backHref={skillPath(provider, slug)} />;
}
