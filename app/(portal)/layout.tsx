import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import Sidebar from '@/components/Sidebar';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  const email = session.user.email;
  const initial = (session.user.name ?? email).trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-zinc-50/60 dark:bg-black">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-tint text-xs font-semibold text-brand">
              {initial}
            </span>
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{session.user.name ?? email}</span>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 shadow-sm transition-colors hover:bg-brand-tint hover:text-brand dark:border-zinc-700 dark:text-zinc-300"
            >
              로그아웃
            </button>
          </form>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
