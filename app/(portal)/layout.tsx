import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import Sidebar from '@/components/Sidebar';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-2.5 text-sm dark:border-zinc-800">
          <span className="text-zinc-600 dark:text-zinc-400">{session.user.email}</span>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              로그아웃
            </button>
          </form>
        </header>
        <main className="flex-1 bg-zinc-50/50 dark:bg-zinc-900/50">{children}</main>
      </div>
    </div>
  );
}
