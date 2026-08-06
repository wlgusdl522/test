import { h1, pageFluid } from '@/lib/ui';
import ExpenseTabsClient from '@/components/expenses/ExpenseTabsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>카드사용대장</h1>
      <ExpenseTabsClient />
      {children}
    </main>
  );
}
