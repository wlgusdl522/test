import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ADMIN_EMAILS, getViewerStaffRecord } from '@/lib/auth-helpers';
import Sidebar from '@/components/Sidebar';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  const email = session.user.email;
  const me = await getViewerStaffRecord();
  const userName = me?.성명 || session.user.name || email;
  const userSubtitle = ADMIN_EMAILS.includes(email.toLowerCase())
    ? '관리자'
    : me
      ? `${me.소속팀} · ${me['직급/직책']}`
      : email;

  return (
    <div className="flex min-h-screen bg-zinc-50/60 dark:bg-black">
      <Sidebar userName={userName} userSubtitle={userSubtitle} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
