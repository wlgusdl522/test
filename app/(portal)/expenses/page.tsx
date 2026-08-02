import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';
import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getSystemSettings } from '@/lib/mutate/settings';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { btn, card, input, label } from '@/lib/ui';
import CardLedgerEntryFields from '@/components/expenses/CardLedgerEntryFields';
import CardTypeTabs from '@/components/expenses/CardTypeTabs';
import { addCardLedgerAction, updateCardLedgerAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [allRecords, budgetItems, settings, me] = await Promise.all([
    getCardLedgerList(),
    getKeyedList(BUDGET_ITEM_TABLE),
    getSystemSettings(),
    getViewerStaffRecord(),
  ]);
  const editing = edit ? allRecords.find((r) => r.id === edit) : null;

  return (
    <form action={editing ? updateCardLedgerAction : addCardLedgerAction} className={`${card} grid grid-cols-2 gap-3`}>
      {editing && <input type="hidden" name="id" value={editing.id} />}
      <label className={label}>
        구분 *
        <CardTypeTabs defaultValue={editing?.구분 ?? '체크카드'} />
      </label>
      <label className={label}>
        사용일자 *
        <input type="date" name="date" defaultValue={editing?.사용일자 ?? todayKst()} required className={input} />
      </label>
      <label className={label}>
        담당자명
        <input name="name" defaultValue={editing?.담당자명 ?? me?.성명 ?? ''} className={input} />
      </label>
      <label className={label}>
        예산과목 *
        <select name="budgetItem" defaultValue={editing?.예산과목 ?? ''} required className={input}>
          {budgetItems.map((b) => <option key={b.예산과목명} value={b.예산과목명}>{b.예산과목명}</option>)}
        </select>
      </label>
      <CardLedgerEntryFields
        defaultAmount={editing?.사용금액}
        defaultExempt={editing?.검수불요여부 === 'Y'}
        defaultExemptReason={editing?.검수불요사유}
        reportThreshold={settings.itemCheckReportThreshold}
      />
      <label className={label}>
        카드번호(뒤 4자리)
        <input name="cardNo" defaultValue={editing?.카드번호 ?? ''} maxLength={4} className={input} />
      </label>
      <label className={`${label} col-span-2`}>
        사용내역 *
        <input name="description" defaultValue={editing?.사용내역 ?? ''} required className={input} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
        {editing && <a href="/expenses/mine" className="text-xs text-zinc-500 hover:underline">취소</a>}
      </div>
    </form>
  );
}
