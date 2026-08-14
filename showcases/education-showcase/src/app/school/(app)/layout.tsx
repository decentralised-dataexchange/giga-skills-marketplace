import { requirePortalRole } from "@/lib/guards";

export default async function SchoolAppLayout({ children }: { children: React.ReactNode }) {
  await requirePortalRole("school");
  return <>{children}</>;
}
