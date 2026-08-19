import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getItemCheckReportList } from '@/lib/mutate/itemCheckReport';
import { isAccountingViewer } from '@/lib/auth-helpers';
import { btnSecondary, selectFilter } from '@/lib/ui';
import CardLedgerReviewClient from '@/components/expenses/CardLedgerReviewClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function CardLedgerReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; status?: string; ym?: string }>;
}) {
  const canManage = await isAccountingViewer();
  const { name, status, ym } = await searchParams;
  const [allUnsorted, photos, reports] = await Promise.all([
    getCardLedgerList(),
    getItemCheckPhotoList(),
    getItemCheckReportList(),
  ]);

  // 회계가 처리할 건부터 눈에 띄어야 하므로 기본값은 "인쇄 대기" — 처리할 게 없는 날엔
  // 전체 상태를 눌러 다 봐야 하지만, 매번 밀린 전체 목록에서 걸러야 하는 것보다는 낫다.
  const effectiveStatus = status ?? '인쇄대기';
  const all = [...allUnsorted].sort((a, b) => (b.사용일자 || '').localeCompare(a.사용일자 || ''));

  const names = [...new Set(all.map((r) => r.담당자명).filter(Boolean))].sort();
  const photoByLedgerId: Record<string, Record<string, string>> = {};
  photos.forEach((p) => { photoByLedgerId[p.카드사용대장ID] = p; });
  const reportByLedgerId: Record<string, Record<string, string>> = {};
  reports.forEach((r) => { reportByLedgerId[r.카드사용대장ID] = r; });

  const rows = all.filter((r) => {
    if (name && r.담당자명 !== name) return false;
    if (ym && !r.사용일자.startsWith(ym)) return false;
    if (effectiveStatus === '인쇄대기' && r.상태 !== '검수완료') return false;
    if (effectiveStatus === '인쇄완료' && r.상태 !== '인쇄완료') return false;
    return true;
  });

  return (
    <>
      {!canManage && (
        <p className="text-xs text-zinc-400 mb-3">읽기 전용으로 조회 중입니다. 인쇄·반려 처리는 회계담당자만 할 수 있습니다.</p>
      )}
      <form method="get" className="flex gap-2 mb-3">
        <input type="month" name="ym" defaultValue={ym ?? ''} className={selectFilter} />
        <select name="name" defaultValue={name ?? ''} className={selectFilter}>
          <option value="">전체 담당자</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select name="status" defaultValue={effectiveStatus} className={selectFilter}>
          <option value="인쇄대기">인쇄 대기(검수완료)</option>
          <option value="인쇄완료">인쇄 완료</option>
          <option value="all">전체 상태</option>
        </select>
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      <CardLedgerReviewClient rows={rows} photoByLedgerId={photoByLedgerId} reportByLedgerId={reportByLedgerId} canManage={canManage} />
    </>
  );
}
