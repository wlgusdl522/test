'use server';

import { revalidatePath } from 'next/cache';
import { requireIsAccountingViewer } from '@/lib/auth-helpers';
import { getCardLedgerList, markCardLedgerNotified } from '@/lib/mutate/cardLedger';
import { getStaffList } from '@/lib/mutate/staff';
import { getSystemSettings } from '@/lib/mutate/settings';
import { notifyJandiPersonal } from '@/lib/notify/jandi';
import { getSiteUrl } from '@/lib/siteUrl';
import { parseAmount } from '@/lib/format';

export async function sendPhotoMissingNotificationAction(formData: FormData): Promise<void> {
  await requireIsAccountingViewer();
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  if (ids.length === 0) return;

  const [all, staffList, settings] = await Promise.all([
    getCardLedgerList(),
    getStaffList(),
    getSystemSettings(),
  ]);
  const siteUrl = getSiteUrl();
  const targets = all.filter((r) => ids.includes(r.id) && r.담당자이메일);

  await Promise.all(
    targets.map((r) => {
      const link = `${siteUrl}/expenses/mine?all=1&photoFor=${r.id}`;
      const message =
        `[카드사용대장] 물품검수사진 미등록 안내\n` +
        `${r.사용일자} ${r.예산과목} · ${r.사용내역} (${parseAmount(r.사용금액).toLocaleString()}원)\n` +
        `물품검수사진이 아직 등록되지 않았습니다.\n${link}`;
      return notifyJandiPersonal(r.담당자이메일, staffList, message, settings.itemCheckReportJandiWebhook);
    })
  );

  await markCardLedgerNotified(targets.map((r) => r.id));
  revalidatePath('/expenses/manage');
}
