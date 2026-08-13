import { requirePortalRole } from '@/lib/guards';

export default async function DpaAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortalRole('dpa');
  return <>{children}</>;
}
