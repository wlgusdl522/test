'use server';

import { revalidatePath } from 'next/cache';
import { setBudgetAmounts } from '@/lib/mutate/boardBudgetExecution';

export async function submitBudgetAmountsAction(시설: string, year: string, amounts: Record<string, number>): Promise<void> {
  await setBudgetAmounts(시설, year, amounts);
  revalidatePath('/business-summary/accounting/budget');
}
