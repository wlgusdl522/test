import { h1, pageWide } from '@/lib/ui';
import ExpenseTabsClient from '@/components/expenses/ExpenseTabsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={pageWide}>
      <h1 className={h1}>카드사용대장</h1>
      <ExpenseTabsClient />
      {children}
    </main>
  );
}
