import { requirePortalRole } from '@/lib/guards';

export default async function CivicworksAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortalRole('civicworks');
  return <>{children}</>;
}
