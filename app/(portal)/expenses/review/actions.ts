'use server';

import { revalidatePath } from 'next/cache';
import { getCardLedgerList, printCardLedgerRecord, printCardLedgerRecords, unlockCardLedgerRecord } from '@/lib/mutate/cardLedger';
import { setItemCheckPhotoPrinted } from '@/lib/mutate/itemCheckPhoto';
import { setItemCheckReportPrinted } from '@/lib/mutate/itemCheckReport';
import { requireIsAccountingViewer } from '@/lib/auth-helpers';
import { getStaffList } from '@/lib/mutate/staff';
import { getSystemSettings } from '@/lib/mutate/settings';
import { notifyJandiPersonal } from '@/lib/notify/jandi';
import { getSiteUrl } from '@/lib/siteUrl';

export async function printCardLedgerAction(formData: FormData) {
  await requireIsAccountingViewer();
  await printCardLedgerRecord(String(formData.get('id') ?? ''));
  revalidatePath('/expenses/review');
}

export async function printCardLedgerBatchAction(formData: FormData) {
  await requireIsAccountingViewer();
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  await printCardLedgerRecords(ids);
  revalidatePath('/expenses/review');
}

export async function unlockCardLedgerAction(formData: FormData) {
  await requireIsAccountingViewer();
  await unlockCardLedgerRecord(String(formData.get('id') ?? ''));
  revalidatePath('/expenses/review');
}

// 회계확인 체크 — 담당자가 등록한 사진/조서 내용을 회계가 확인했다는 표시. 인쇄(잠금)와는 별개로
// 언제든 켜고 끌 수 있다(설정에 지정된 회계담당자 또는 관리자만).
export async function setPhotoAccountingCheckAction(formData: FormData) {
  await requireIsAccountingViewer();
  await setItemCheckPhotoPrinted(String(formData.get('id') ?? ''), formData.get('checked') === '1');
  revalidatePath('/expenses/review');
}

export async function setReportAccountingCheckAction(formData: FormData) {
  await requireIsAccountingViewer();
  await setItemCheckReportPrinted(String(formData.get('id') ?? ''), formData.get('checked') === '1');
  revalidatePath('/expenses/review');
}

// 검수사진 미등록 건을 담당자 개인 잔디웹훅으로(없으면 공용 웹훅으로) 알린다.
// 링크를 누르면 해당 건의 사진 등록 폼이 바로 펼쳐진 목록 화면으로 이동한다.
export async function notifyMissingPhotoAction(formData: FormData) {
  await requireIsAccountingViewer();
  const ids = formData.getAll('missingIds').map(String).filter(Boolean);
  if (ids.length === 0) return;

  const [ledger, staffList, settings] = await Promise.all([getCardLedgerList(), getStaffList(), getSystemSettings()]);
  const baseUrl = getSiteUrl();

  await Promise.all(
    ids.map(async (id) => {
      const r = ledger.find((x) => x.id === id);
      if (!r || !r.담당자이메일) return;
      const message =
        `[카드사용대장] 물품검수사진 미등록 안내\n` +
        `${r.사용일자} · ${r.예산과목} · ${r.사용내역} (${Number(r.사용금액 || 0).toLocaleString()}원)\n` +
        `아래 링크에서 바로 사진을 등록해주세요.\n${baseUrl}/expenses/mine?photoFor=${id}`;
      await notifyJandiPersonal(r.담당자이메일, staffList, message, settings.itemCheckReportJandiWebhook);
    })
  );

  revalidatePath('/expenses/review');
}
