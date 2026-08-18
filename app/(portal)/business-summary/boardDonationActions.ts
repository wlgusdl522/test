'use server';

import { revalidatePath } from 'next/cache';
import { saveDonationDetails, type DonationItem, type DonationRowInput } from '@/lib/mutate/boardDonation';

export async function saveDonationDetailsAction(
  항목: DonationItem,
  시설: string,
  ym: string,
  rows: DonationRowInput[]
): Promise<void> {
  await saveDonationDetails(항목, 시설, ym, rows);
  revalidatePath('/business-summary/donations');
  revalidatePath('/business-summary/donations/view');
}
