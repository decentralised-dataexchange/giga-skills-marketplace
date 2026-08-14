import { requirePortalRole } from '@/lib/guards';
import { EducationShell } from '@/components/EducationShell';

export default async function EducationAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortalRole('education');
  return <EducationShell signedIn>{children}</EducationShell>;
}
