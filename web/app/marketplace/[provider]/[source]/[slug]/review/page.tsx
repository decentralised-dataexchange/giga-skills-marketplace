"use client";

import { useParams } from "next/navigation";
import { ReviewTrail } from "@/components/review-trail";

export default function SkillReviewPage() {
  const { provider, source, slug } = useParams<{
    provider: string;
    source: string;
    slug: string;
  }>();
  return <ReviewTrail provider={provider} source={source} slug={slug} />;
}
