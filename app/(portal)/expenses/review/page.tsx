import { Fragment } from 'react';
import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getItemCheckReportList } from '@/lib/mutate/itemCheckReport';
import { requireIsAccountingViewer } from '@/lib/auth-helpers';
import { ITEM_CHECK_PHOTO_SLOTS } from '@/lib/sheets/registry';
import { badgeBase, badgeTone, btn, btnDanger, btnSecondary, card, inputBase, selectFilter, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import { printCardLedgerAction, rejectCardLedgerAction } from './actions';
import { parseAmount } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  검수대기: 'gray',
  검수완료: 'amber',
  인쇄완료: 'green',
  반려: 'red',
  검수불요: 'gray',
};

export default async function CardLedgerReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; status?: string; expand?: string }>;
}) {
  await requireIsAccountingViewer();
  const { name, status, expand } = await searchParams;
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
  const photoByLedgerId = new Map(photos.map((p) => [p.카드사용대장ID, p]));
  const reportByLedgerId = new Map(reports.map((r) => [r.카드사용대장ID, r]));

  const rows = all.filter((r) => {
    if (name && r.담당자명 !== name) return false;
    if (effectiveStatus === '인쇄대기' && r.상태 !== '검수완료') return false;
    if (effectiveStatus === '인쇄완료' && r.상태 !== '인쇄완료') return false;
    return true;
  });

  function buildQuery(params: Record<string, string | undefined>): string {
    const sp = new URLSearchParams();
    if (name) sp.set('name', name);
    if (status) sp.set('status', status);
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v);
    }
    const qs = sp.toString();
    return `/expenses/review${qs ? `?${qs}` : ''}`;
  }

  return (
    <>
      <form method="get" className="flex gap-2 mb-3">
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

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>사용일자</th><th className={th}>담당자</th><th className={th}>사업명/사용내역</th>
            <th className={th}>사용금액</th><th className={th}>상태</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const photo = photoByLedgerId.get(r.id);
            const report = reportByLedgerId.get(r.id);
            const tone = badgeTone[STATUS_TONE[r.상태] ?? 'gray'];
            const isExpanded = expand === r.id;
            return (
              <Fragment key={r.id}>
                <tr className={trZebraHover}>
                  <td className={td}>{r.사용일자}</td>
                  <td className={td}>{r.담당자명}</td>
                  <td className={td}>
                    <div className="font-medium">{r.예산과목}</div>
                    <div className="text-xs text-zinc-500">{r.사용내역}</div>
                  </td>
                  <td className={td}>{parseAmount(r.사용금액).toLocaleString()}원</td>
                  <td className={td}><span className={`${badgeBase} ${tone}`}>{r.상태}</span></td>
                  <td className={td}>
                    <a href={isExpanded ? buildQuery({}) : buildQuery({ expand: r.id })} className="text-xs text-brand hover:underline">
                      {isExpanded ? '닫기' : '상세보기'}
                    </a>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="p-0 border border-[#e3e6ea] dark:border-zinc-800">
                      <div className={`${card} m-2`}>
                        <p className="text-sm font-semibold mb-2">물품검수사진</p>
                        {photo ? (
                          <div className="flex gap-2 mb-3">
                            {ITEM_CHECK_PHOTO_SLOTS.filter((slot) => photo[slot]).map((slot) => (
                              <a key={slot} href={photo[slot]} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
                                {slot} 보기
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 mb-3">미등록</p>
                        )}
                        {report && (
                          <>
                            <p className="text-sm font-semibold mb-2">물품검수조서</p>
                            <a href={`/print/item-check-report?id=${report.id}`} target="_blank" className="text-xs text-brand hover:underline">
                              조서 원문 보기
                            </a>
                          </>
                        )}
                        {r.상태 === '반려' && r.반려사유 && (
                          <p className="text-xs text-[#b51c31] mt-3">반려 사유: {r.반려사유}</p>
                        )}
                        <div className="flex items-center gap-3 mt-4">
                          {r.상태 === '검수완료' && (
                            <form action={printCardLedgerAction}>
                              <input type="hidden" name="id" value={r.id} />
                              <button type="submit" className={btn}>인쇄 (인쇄 시 잠금)</button>
                            </form>
                          )}
                          {r.상태 === '인쇄완료' && (
                            <form action={rejectCardLedgerAction} className="flex items-center gap-2">
                              <input type="hidden" name="id" value={r.id} />
                              <input name="reason" placeholder="반려 사유" required className={`${inputBase} w-56 text-xs`} />
                              <button type="submit" className={btnDanger}>반려</button>
                            </form>
                          )}
                          {(r.상태 === '검수대기' || r.상태 === '검수불요') && (
                            <p className="text-xs text-zinc-400">
                              {r.상태 === '검수불요' ? `검수 불요 (사유: ${r.검수불요사유})` : '아직 검수(사진/조서) 등록이 끝나지 않아 인쇄할 수 없습니다.'}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className={`${td} text-center text-zinc-400`}>내역이 없습니다.</td></tr>
          )}
        </tbody>
      </table></div>
    </>
  );
}
