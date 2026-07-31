import { getActiveStaffDirectory } from '@/lib/mutate/staff';
import StaffDirectoryClient from '@/components/staff/StaffDirectoryClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function StaffDirectoryPage() {
  const staff = await getActiveStaffDirectory();
  const sorted = [...staff].sort((a, b) => a.소속팀.localeCompare(b.소속팀) || a.성명.localeCompare(b.성명));

  return <StaffDirectoryClient staff={sorted} />;
}
