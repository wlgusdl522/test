import { getTransitCardList, getTransitLedgerList, sumFlowsThrough } from '@/lib/mutate/transitCard';
import { parseAmount } from '@/lib/format';
import {
  btn, btnDanger, btnSecondary, cardTableWrap, h1, input, inputBase, label, pageFluid,
  tableClean, tdClean, thClean, trHoverClean,
} from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import PrinterIcon from '@/components/icons/PrinterIcon';
import { addTransitLedgerAction, deleteTransitLedgerAction, updateTransitLedgerAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRANSPORT_OPTIONS = ['버스', '택시', '지하철', '혼합'];

function LedgerActions({ id }: { id: string }) {
  return (
    <>
      <a href={`/transit-card?edit=${id}`} className={btnSecondary}>수정</a>
      <form action={deleteTransitLedgerAction}>
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmitButton confirmMessage="이 내역을 삭제할까요?" className={btnDanger}>삭제</ConfirmSubmitButton>
      </form>
    </>
  );
}

export default async function TransitCardLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; ym?: string; all?: string; cardId?: string; new?: string }>;
}) {
  const { edit, ym, all, cardId, new: isNewParam } = await searchParams;
  const [allRecords, cards] = await Promise.all([getTransitLedgerList(), getTransitCardList()]);
  const editing = edit ? allRecords.find((r) => r.id === edit) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentYm = todayIso.slice(0, 7);
  const showAll = all === '1';
  const activeYm = showAll ? '' : (ym || currentYm);
  const activeCard = cardId || '';
  const cardParam = activeCard ? `cardId=${encodeURIComponent(activeCard)}` : '';

  const records = allRecords
    .filter((r) => !activeYm || r['사용일자'].startsWith(activeYm))
    .filter((r) => !activeCard || r['교통카드'] === activeCard);

  function cardLabel(id: string): string {
    const c = cards.find((c) => c.카드ID === id);
    return c ? `${c.카드명 || c.카드ID}` : id;
  }

  // 탭에 카드별 "현재 잔액"(오늘까지 전체 이력 기준)을 같이 보여준다 — 월/카드 필터와는 무관한 값.
  function currentBalance(cardId: string): number {
    const c = cards.find((c) => c.카드ID === cardId);
    const before = sumFlowsThrough(cardId, allRecords, todayIso);
    return parseAmount(c?.초기잔액 ?? '0') + before.charge - before.use;
  }

  function tabHref(nextCardId: string): string {
    const params = new URLSearchParams();
    if (ym) params.set('ym', ym);
    if (showAll) params.set('all', '1');
    if (nextCardId) params.set('cardId', nextCardId);
    const qs = params.toString();
    return `/transit-card${qs ? `?${qs}` : ''}`;
  }

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>교통카드사용대장</h1>

      <div className="flex items-center justify-end mb-2">
        <a
          href={`/print/transit-card?ym=${activeYm || currentYm}${cardParam ? `&${cardParam}` : ''}`}
          target="_blank"
          className={btnSecondary}
        >
          <PrinterIcon />
          교통카드 월별 인쇄
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <a
          href={`/transit-card${cardParam ? `?${cardParam}` : ''}`}
          className={`text-xs px-2.5 py-1 rounded-full ${!ym && !showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          이번달
        </a>
        <form method="get" className="flex items-center gap-1.5">
          {activeCard && <input type="hidden" name="cardId" value={activeCard} />}
          <input type="month" name="ym" defaultValue={ym || currentYm} className={`${inputBase} w-auto text-xs py-1`} />
          <button type="submit" className={`${btnSecondary} text-xs py-1`}>조회</button>
        </form>
        <a
          href={`/transit-card?all=1${cardParam ? `&${cardParam}` : ''}`}
          className={`text-xs px-2.5 py-1 rounded-full ${showAll ? 'bg-brand-tint text-brand-dark dark:text-brand font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'}`}
        >
          전체보기
        </a>

        <FormToggle label={editing ? '교통카드 사용 수정' : '교통카드 사용 등록'} defaultOpen={!!editing || isNewParam === '1'}>
          <form action={editing ? updateTransitLedgerAction : addTransitLedgerAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <label className={label}>
              교통카드 *
              <select name="cardId" defaultValue={editing?.['교통카드'] ?? cards[0]?.카드ID ?? ''} required className={input}>
                {cards.map((c) => <option key={c.카드ID} value={c.카드ID}>{c.카드명 || c.카드ID} ({c.카드ID})</option>)}
              </select>
            </label>
            <label className={label}>
              사용일자 *
              <input type="date" name="date" defaultValue={editing?.['사용일자'] ?? todayIso} required className={input} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              목적 *
              <input name="purpose" defaultValue={editing?.['목적'] ?? ''} required className={input} />
            </label>
            <label className={label}>
              출발지
              <input name="from" defaultValue={editing?.['출발지'] ?? ''} className={input} />
            </label>
            <label className={label}>
              도착지
              <input name="to" defaultValue={editing?.['도착지'] ?? ''} className={input} />
            </label>
            <label className={label}>
              교통수단
              <select name="transport" defaultValue={editing?.['교통수단'] ?? '버스'} className={input}>
                {TRANSPORT_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className={label}>
              충전액
              <input type="number" name="charge" defaultValue={editing?.['충전액'] ?? ''} className={input} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              사용액
              <input type="number" name="use" defaultValue={editing?.['사용액'] ?? ''} className={input} />
            </label>
            <div className="sm:col-span-2 flex items-center gap-3">
              <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
            </div>
          </form>
        </FormToggle>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
        <a
          href={tabHref('')}
          className={`-mb-px shrink-0 rounded-t-md border border-b-0 px-3.5 py-2 text-sm transition-colors ${
            !activeCard
              ? 'border-zinc-200 bg-white font-medium text-brand dark:border-zinc-800 dark:bg-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          전체
        </a>
        {cards.map((c) => {
          const active = activeCard === c.카드ID;
          return (
            <a
              key={c.카드ID}
              href={tabHref(c.카드ID)}
              className={`-mb-px shrink-0 rounded-t-md border border-b-0 px-3.5 py-2 text-sm transition-colors ${
                active
                  ? 'border-zinc-200 bg-white font-medium text-brand dark:border-zinc-800 dark:bg-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <span className="block">{c.카드명 || c.카드ID}</span>
              <span className="block text-[11px] font-normal text-zinc-400">{currentBalance(c.카드ID).toLocaleString()}원</span>
            </a>
          );
        })}
      </div>

      {records.length === 0 ? (
        <div className={`${cardTableWrap} mt-3`}>
          <p className="p-3 text-sm text-zinc-400">해당 조건에 맞는 내역이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 모바일: 표는 칸이 너무 좁아져서 대신 카드 목록으로 보여준다 */}
          <div className="mt-3 flex flex-col gap-2 sm:hidden">
            {records.map((r) => (
              <div key={r.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r['사용일자']}</span>
                  <span className="text-xs text-zinc-400">{cardLabel(r['교통카드'])}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                  {r['담당자명']} · {r['목적']}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {r['출발지']} → {r['도착지']} ({r['교통수단']})
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {r['충전액'] ? `충전 ${Number(r['충전액']).toLocaleString()}원` : ''}
                  {r['충전액'] && r['사용액'] ? ' · ' : ''}
                  {r['사용액'] ? `사용 ${Number(r['사용액']).toLocaleString()}원` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <LedgerActions id={r.id} />
                </div>
              </div>
            ))}
          </div>

          {/* 데스크톱: 기존 표 레이아웃 유지 */}
          <div className={`hidden sm:block ${cardTableWrap} mt-3`}><table className={tableClean}>
            <thead>
              <tr>
                <th className={thClean}>사용일자</th><th className={thClean}>카드</th><th className={thClean}>담당자</th>
                <th className={thClean}>목적</th><th className={thClean}>출발지</th><th className={thClean}>도착지</th>
                <th className={thClean}>교통수단</th><th className={thClean}>충전액</th><th className={thClean}>사용액</th><th className={thClean}></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className={trHoverClean}>
                  <td className={tdClean}>{r['사용일자']}</td>
                  <td className={tdClean}>{cardLabel(r['교통카드'])}</td>
                  <td className={tdClean}>{r['담당자명']}</td>
                  <td className={tdClean}>{r['목적']}</td>
                  <td className={tdClean}>{r['출발지']}</td>
                  <td className={tdClean}>{r['도착지']}</td>
                  <td className={tdClean}>{r['교통수단']}</td>
                  <td className={tdClean}>{r['충전액'] ? `${Number(r['충전액']).toLocaleString()}원` : ''}</td>
                  <td className={tdClean}>{r['사용액'] ? `${Number(r['사용액']).toLocaleString()}원` : ''}</td>
                  <td className={`${tdClean} flex gap-1.5`}>
                    <LedgerActions id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </>
      )}
    </main>
  );
}
