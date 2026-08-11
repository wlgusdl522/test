import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  return <div className="p-6 print:p-0">{children}</div>;
}
