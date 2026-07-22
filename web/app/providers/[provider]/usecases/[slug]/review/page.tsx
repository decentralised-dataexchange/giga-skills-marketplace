"use client";

import { useParams } from "next/navigation";
import { ReviewTrail } from "@/components/review-trail";
import { usecasePath } from "@/lib/routes";

export default function UsecaseReviewPage() {
  const { provider, slug } = useParams<{ provider: string; slug: string }>();
  return <ReviewTrail slug={slug} backHref={usecasePath(provider, slug)} />;
}
