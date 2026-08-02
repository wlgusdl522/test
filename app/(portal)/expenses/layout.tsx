import { h1, pageWide } from '@/lib/ui';
import { isAccountingViewer } from '@/lib/auth-helpers';
import ExpenseTabsClient from '@/components/expenses/ExpenseTabsClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExpensesLayout({ children }: { children: React.ReactNode }) {
  const canReview = await isAccountingViewer();
  return (
    <main className={pageWide}>
      <h1 className={h1}>카드사용대장</h1>
      <ExpenseTabsClient canReview={canReview} />
      {children}
    </main>
  );
}
