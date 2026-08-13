import { requirePortalRole } from '@/lib/guards';

export default async function MoeAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortalRole('moe');
  return <>{children}</>;
}
