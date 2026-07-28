import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 24px',
          borderBottom: '1px solid #eee',
          fontSize: 14,
        }}
      >
        <span>{session.user.email}</span>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button type="submit">로그아웃</button>
        </form>
      </header>
      {children}
    </div>
  );
}
