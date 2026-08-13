import { redirect } from "next/navigation";

// Publishing now lives in the drawer on the Skill Sources page; old links and
// bookmarks land there with the drawer already open.
export default async function PublishRedirect({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
}) {
  const { repo } = await searchParams;
  redirect(`/provider/submissions?publish=1${repo ? `&repo=${encodeURIComponent(repo)}` : ""}`);
}
