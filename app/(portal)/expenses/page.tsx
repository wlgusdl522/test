import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';
import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getItemCheckReportList } from '@/lib/mutate/itemCheckReport';
import { getSystemSettings } from '@/lib/mutate/settings';
import { btn, btnDanger, btnSecondary, card, h1, input, inputBase, label, pageWide, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addCardLedgerAction, deleteCardLedgerAction, updateCardLedgerAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; q?: string; ym?: string }>;
}) {
  const { edit, q, ym } = await searchParams;
  const [allRecords, budgetItems, photos, reports, settings] = await Promise.all([
    getCardLedgerList(),
    getKeyedList(BUDGET_ITEM_TABLE),
    getItemCheckPhotoList(),
    getItemCheckReportList(),
    getSystemSettings(),
  ]);
  const editing = edit ? allRecords.find((r) => r.id === edit) : null;
  const photoByLedgerId = new Map(photos.map((p) => [p.카드사용대장ID, p]));
  const reportByLedgerId = new Map(reports.map((r) => [r.카드사용대장ID, r]));

  const records = allRecords.filter((r) => {
    if (ym && !r.사용일자.startsWith(ym)) return false;
    if (q && !`${r.사용내역} ${r.담당자명} ${r.예산과목}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <main className={pageWide}>
      <div className="flex items-center justify-between">
        <h1 className={h1}>카드사용대장</h1>
        <a href="/print/card-ledger" target="_blank" className="text-sm text-brand hover:underline">월별 인쇄</a>
      </div>

      <form method="get" className="flex gap-2 mb-3">
        <input type="month" name="ym" defaultValue={ym ?? ''} className={`${inputBase} w-auto`} />
        <input name="q" defaultValue={q ?? ''} placeholder="사용내역/담당자/예산과목 검색" className={`${inputBase} w-auto`} />
        <button type="submit" className={btnSecondary}>조회</button>
        {(ym || q) && <a href="/expenses" className="text-xs text-zinc-500 hover:underline self-center">초기화</a>}
      </form>

      <FormToggle label={editing ? '내역 수정' : '신규 등록'} defaultOpen={!!editing}>
        <form action={editing ? updateCardLedgerAction : addCardLedgerAction} className={`${card} grid grid-cols-2 gap-3`}>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <label className={label}>
            구분 *
            <select name="type" defaultValue={editing?.구분 ?? '체크카드'} className={input}>
              <option value="체크카드">체크카드</option>
              <option value="신용카드">신용카드</option>
              <option value="계좌이체">계좌이체</option>
            </select>
          </label>
          <label className={label}>
            사용일자 *
            <input type="date" name="date" defaultValue={editing?.사용일자 ?? ''} required className={input} />
          </label>
          <label className={label}>
            담당자명
            <input name="name" defaultValue={editing?.담당자명 ?? ''} placeholder="본인 이름(비우면 자동)" className={input} />
          </label>
          <label className={label}>
            사용금액 *
            <input type="number" name="amount" defaultValue={editing?.사용금액 ?? ''} required className={input} />
          </label>
          <label className={label}>
            예산과목 *
            <select name="budgetItem" defaultValue={editing?.예산과목 ?? ''} required className={input}>
              {budgetItems.map((b) => <option key={b.예산과목명} value={b.예산과목명}>{b.예산과목명}</option>)}
            </select>
          </label>
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
            {editing && <a href="/expenses" className="text-xs text-zinc-500 hover:underline">취소</a>}
          </div>
        </form>
      </FormToggle>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>사용일자</th><th className={th}>구분</th><th className={th}>담당자</th>
            <th className={th}>사용금액</th><th className={th}>예산과목</th><th className={th}>사용내역</th>
            <th className={th}>카드번호</th><th className={th}>연계 업무</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const photo = photoByLedgerId.get(r.id);
            const report = reportByLedgerId.get(r.id);
            const needsReport = settings.itemCheckReportThreshold > 0 && Number(r.사용금액 || 0) >= settings.itemCheckReportThreshold;
            return (
              <tr key={r.id} className={trZebraHover}>
                <td className={td}>{r.사용일자}</td>
                <td className={td}>{r.구분}</td>
                <td className={td}>{r.담당자명}</td>
                <td className={td}>{Number(r.사용금액 || 0).toLocaleString()}원</td>
                <td className={td}>{r.예산과목}</td>
                <td className={td}>{r.사용내역}</td>
                <td className={td}>{r.카드번호}</td>
                <td className={`${td} flex flex-col gap-1`}>
                  <a
                    href={photo ? `/expenses/photos?editId=${photo.id}` : `/expenses/photos?ledgerId=${r.id}`}
                    className={`text-xs hover:underline ${!photo ? 'text-[#b51c31] font-semibold' : 'text-brand'}`}
                  >
                    {photo ? '사진 보기/수정' : '사진 등록(필수)'}
                  </a>
                  <a
                    href={report ? `/expenses/reports?edit=${report.id}` : `/expenses/reports?ledgerId=${r.id}`}
                    className={`text-xs hover:underline ${!report && needsReport ? 'text-[#b51c31] font-semibold' : 'text-brand'}`}
                  >
                    {report ? '조서 보기/수정' : needsReport ? '조서 작성(필수)' : '조서 작성'}
                  </a>
                </td>
                <td className={`${td} flex gap-1.5`}>
                  <a href={`/expenses?edit=${r.id}`} className={btnSecondary}>수정</a>
                  <form action={deleteCardLedgerAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className={btnDanger}>삭제</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </main>
  );
}
