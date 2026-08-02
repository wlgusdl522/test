import { h1, pageWide } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={pageWide}>
      <h1 className={`${h1} mb-5`}>카드사용대장</h1>
      {children}
    </main>
  );
}
