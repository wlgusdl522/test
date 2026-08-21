import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getItemCheckReportList } from '@/lib/mutate/itemCheckReport';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { getSystemSettings } from '@/lib/mutate/settings';
import { isAccountingViewer, requireViewerEmail } from '@/lib/auth-helpers';
import { BUDGET_ITEM_TABLE } from '@/lib/sheets/registry';
import { parseAmount, resolveBusinessName } from '@/lib/format';
import {
  btn, btnSecondary, card, cardTableWrap, filterPill, filterPillActive, inputBase, selectFilter,
  tableClean, tdClean, thClean,
} from '@/lib/ui';
import CardLedgerReviewClient from '@/components/expenses/CardLedgerReviewClient';
import PrinterIcon from '@/components/icons/PrinterIcon';
import { notifyMissingPhotoAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function monthBounds(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(lastDay).padStart(2, '0')}` };
}

const STATUS_TABS = [
  { value: 'all', label: '전체' },
  { value: '검수대기', label: '검수대기' },
  { value: '검수완료', label: '검수완료' },
  { value: '인쇄완료', label: '인쇄완료' },
  { value: '검수불요', label: '검수불요' },
] as const;

const STAT_TILES = [
  { key: 'amount', label: '총 사용금액', tone: '#1479ba' },
  { key: 'total', label: '전체 건수', tone: '#6b6f76' },
  { key: '검수대기', label: '검수대기', tone: '#a3620a' },
  { key: '검수완료', label: '검수완료', tone: '#a3620a' },
  { key: '인쇄완료', label: '인쇄완료', tone: '#0f7a4d' },
  { key: '검수불요', label: '검수불요', tone: '#6b6f76' },
] as const;

export default async function CardLedgerReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; status?: string; year?: string; from?: string; to?: string; mine?: string; q?: string }>;
}) {
  const canManage = await isAccountingViewer();
  const viewerEmail = await requireViewerEmail();
  const { name, status, year: yearParam, from: fromParam, to: toParam, mine: mineParam, q: qParam } = await searchParams;
  const [allUnsorted, photos, reports, budgetItems, settings] = await Promise.all([
    getCardLedgerList(),
    getItemCheckPhotoList(),
    getItemCheckReportList(),
    getKeyedList(BUDGET_ITEM_TABLE),
    getSystemSettings(),
  ]);

  const q = (qParam ?? '').trim();
  const searching = q.length > 0;
  const effectiveStatus = status ?? 'all';
  const currentYm = todayKst().slice(0, 7);
  const activeYear = yearParam || '';
  const onlyMine = mineParam === '1';
  const all = [...allUnsorted].sort((a, b) => (b.사용일자 || '').localeCompare(a.사용일자 || ''));

  // 연도를 고르면 그 해 전체를 보고, 아니면(전체 연도) 직접 고른 기간을 — 둘 다 없으면 이번달을 기본으로 본다.
  let activeFrom: string;
  let activeTo: string;
  if (activeYear) {
    activeFrom = `${activeYear}-01-01`;
    activeTo = `${activeYear}-12-31`;
  } else {
    const bounds = monthBounds(currentYm);
    activeFrom = fromParam || bounds.from;
    activeTo = toParam || bounds.to;
  }

  const names = [...new Set(all.map((r) => r.담당자명).filter(Boolean))].sort();
  const years = [...new Set(all.map((r) => (r.사용일자 || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const photoByLedgerId: Record<string, Record<string, string>> = {};
  photos.forEach((p) => { photoByLedgerId[p.카드사용대장ID] = p; });
  const reportByLedgerId: Record<string, Record<string, string>> = {};
  reports.forEach((r) => { reportByLedgerId[r.카드사용대장ID] = r; });

  const periodRows = all.filter((r) => {
    if (onlyMine && (r.담당자이메일 ?? '').toLowerCase() !== viewerEmail) return false;
    if (name && r.담당자명 !== name) return false;
    if (searching) {
      const haystack = `${r.담당자명} ${r.예산과목} ${r.사용내역}`.toLowerCase();
      return haystack.includes(q.toLowerCase());
    }
    return r.사용일자 >= activeFrom && r.사용일자 <= activeTo;
  });
  const rows = periodRows.filter((r) => effectiveStatus === 'all' || r.상태 === effectiveStatus);

  const totalAmount = periodRows.reduce((sum, r) => sum + parseAmount(r.사용금액), 0);
  const statCounts: Record<string, number> = { total: periodRows.length };
  for (const t of STATUS_TABS) {
    if (t.value === 'all') continue;
    statCounts[t.value] = periodRows.filter((r) => r.상태 === t.value).length;
  }

  // 검수사진 미등록 건 — 검수불요 처리된 건은 애초에 사진이 필요 없으니 제외.
  const missingPhotoRows = all.filter((r) => r.검수불요여부 !== 'Y' && r.상태 !== '인쇄완료' && !photoByLedgerId[r.id]);

  // 지금 화면에 걸린 건 중 사진이 등록된 것만 모아 한 번에 인쇄 — 개별로 열어 하나씩 인쇄할 필요가 없다.
  const batchPhotoIds = rows.map((r) => photoByLedgerId[r.id]?.id).filter((id): id is string => Boolean(id));

  function buildQuery(overrides: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (name) sp.set('name', name);
    if (status) sp.set('status', status);
    if (activeYear) sp.set('year', activeYear);
    if (fromParam) sp.set('from', fromParam);
    if (toParam) sp.set('to', toParam);
    if (onlyMine) sp.set('mine', '1');
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    return `/expenses/review${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      <div className="mb-5 flex justify-end">
        <a
          href={`/print/card-ledger?ym=${activeYear ? `${activeYear}-01` : currentYm}`}
          target="_blank"
          className={btnSecondary}
        >
          <PrinterIcon />
          카드사용대장 월별 인쇄
        </a>
      </div>

      {!canManage && (
        <p className="text-xs text-zinc-400 mb-3">읽기 전용으로 조회 중입니다. 인쇄·수정 활성화는 회계담당자만 할 수 있습니다.</p>
      )}

      {canManage && missingPhotoRows.length > 0 && (
        <form action={notifyMissingPhotoAction} className={`${card} mb-4`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">검수사진 미등록 {missingPhotoRows.length}건</span>
            <button type="submit" className={btn}>선택 건 잔디 알림 보내기</button>
          </div>
          <div className={cardTableWrap}><table className={tableClean}>
            <thead>
              <tr>
                <th className={thClean}></th><th className={thClean}>담당자</th><th className={thClean}>사용일자</th><th className={thClean}>사업명/사용내역</th>
              </tr>
            </thead>
            <tbody>
              {missingPhotoRows.map((r) => (
                <tr key={r.id}>
                  <td className={tdClean}><input type="checkbox" name="missingIds" value={r.id} defaultChecked /></td>
                  <td className={tdClean}>{r.담당자명}</td>
                  <td className={tdClean}>{r.사용일자}</td>
                  <td className={tdClean}>
                    <div className="font-medium">{resolveBusinessName(r.예산과목, budgetItems)}</div>
                    <div className="text-xs text-zinc-500">{r.사용내역}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </form>
      )}

      {/* 필터: 연도 / 기간 / 검색 */}
      <form method="get" className={`${card} flex flex-wrap items-end gap-3`}>
        {status && <input type="hidden" name="status" value={status} />}
        {onlyMine && <input type="hidden" name="mine" value="1" />}
        <label className="flex flex-col gap-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          연도
          <select name="year" defaultValue={activeYear} className={selectFilter}>
            <option value="">전체</option>
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          날짜
          <div className="flex items-center gap-1.5">
            <input type="date" name="from" defaultValue={fromParam || (!activeYear ? activeFrom : '')} className={`${inputBase} w-auto`} />
            <span className="text-zinc-400">~</span>
            <input type="date" name="to" defaultValue={toParam || (!activeYear ? activeTo : '')} className={`${inputBase} w-auto`} />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-zinc-500 dark:text-zinc-400 flex-1 min-w-[220px]">
          검색
          <input type="search" name="q" defaultValue={q} placeholder="담당자, 예산과목, 사용내역 검색" className={inputBase} />
        </label>
        <button type="submit" className={btn}>조회</button>
        <p className="w-full text-[11.5px] text-zinc-400">
          기본값: 현재 달 기준 조회 · 검색어를 입력하면 기간과 무관하게 전체 데이터에서 찾습니다.
        </p>
      </form>

      {/* 요약 통계 */}
      <div className="my-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_TILES.map((tile) => (
          <div
            key={tile.key}
            className="rounded-lg bg-white dark:bg-zinc-900 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
            style={{ borderLeft: `3px solid ${tile.tone}` }}
          >
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{tile.label}</div>
            <div className="text-[17px] font-semibold text-zinc-900 dark:text-zinc-50 mt-0.5">
              {tile.key === 'amount' ? `${totalAmount.toLocaleString()}원` : `${statCounts[tile.key] ?? 0}건`}
            </div>
          </div>
        ))}
      </div>

      {/* 상태 탭 + 내 사업만 보기 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_TABS.map((t) => (
            <a
              key={t.value}
              href={buildQuery({ status: t.value === 'all' ? undefined : t.value })}
              className={effectiveStatus === t.value ? filterPillActive : filterPill}
            >
              {t.label}
            </a>
          ))}
        </div>
        <a href={buildQuery({ mine: onlyMine ? undefined : '1' })} className={onlyMine ? filterPillActive : filterPill}>
          내 사업만 보기
        </a>
      </div>

      {names.length > 0 && (
        <form method="get" className="mb-3 flex flex-wrap items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {activeYear && <input type="hidden" name="year" value={activeYear} />}
          {fromParam && <input type="hidden" name="from" value={fromParam} />}
          {toParam && <input type="hidden" name="to" value={toParam} />}
          {onlyMine && <input type="hidden" name="mine" value="1" />}
          {q && <input type="hidden" name="q" value={q} />}
          <select name="name" defaultValue={name ?? ''} className={selectFilter}>
            <option value="">전체 담당자</option>
            {names.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button type="submit" className={btnSecondary}>담당자 필터 적용</button>
          {name && (
            <a href={buildQuery({ name: undefined })} className="text-xs text-zinc-400 hover:underline">담당자 필터 해제</a>
          )}
        </form>
      )}

      {batchPhotoIds.length > 0 && (
        <a
          href={`/print/item-check-photo?ids=${batchPhotoIds.join(',')}`}
          target="_blank"
          className={`${btnSecondary} inline-flex mb-3`}
        >
          현재 목록 사진 일괄인쇄 ({batchPhotoIds.length}건)
        </a>
      )}

      <CardLedgerReviewClient
        rows={rows}
        photoByLedgerId={photoByLedgerId}
        reportByLedgerId={reportByLedgerId}
        canManage={canManage}
        budgetItems={budgetItems}
        reportThreshold={settings.itemCheckReportThreshold}
      />
    </>
  );
}
