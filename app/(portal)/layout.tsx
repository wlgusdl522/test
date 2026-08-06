import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getViewerStaffRecord, isAdminEmail } from '@/lib/auth-helpers';
import { getNavLayout } from '@/lib/prefs-actions';
import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  const email = session.user.email;
  const [me, navLayout, viewerIsAdmin] = await Promise.all([getViewerStaffRecord(), getNavLayout(), isAdminEmail(email)]);
  const userName = me?.성명 || session.user.name || email;
  const userSubtitle = viewerIsAdmin
    ? '관리자'
    : me
      ? `${me.소속팀} · ${me['직급/직책']}`
      : email;

  if (navLayout === 'left') {
    return (
      <div className="flex min-h-screen bg-zinc-50/60 dark:bg-black">
        <Sidebar userName={userName} userSubtitle={userSubtitle} />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/60 dark:bg-black">
      <TopNav userName={userName} userSubtitle={userSubtitle} />
      <main>{children}</main>
    </div>
  );
}
