import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { isAccountingViewer } from '@/lib/auth-helpers';
import { parseAmount } from '@/lib/format';
import {
  badgeBase, badgeTone, btn, cardTableWrap, tableClean, tdClean, thClean, trHoverClean,
} from '@/lib/ui';
import { sendPhotoMissingNotificationAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayKst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayKst()}T00:00:00`);
  return Math.max(0, Math.floor((today.getTime() - d.getTime()) / 86400000));
}

export default async function ExpensesManagePage() {
  const canManage = await isAccountingViewer();
  const [allLedger, photos] = await Promise.all([getCardLedgerList(), getItemCheckPhotoList()]);

  const photoLedgerIds = new Set(photos.map((p) => p.카드사용대장ID));
  const missing = allLedger
    .filter((r) => r.검수불요여부 !== 'Y' && r.상태 !== '검수불요' && !photoLedgerIds.has(r.id))
    .sort((a, b) => (a.사용일자 || '').localeCompare(b.사용일자 || ''));

  return (
    <>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        {missing.length > 0 ? `${missing.length}건이 아직 물품검수사진을 등록하지 않았습니다.` : '미등록 건이 없습니다.'}
      </p>
      {!canManage && (
        <p className="text-xs text-zinc-400 mb-3">읽기 전용으로 조회 중입니다. 알림 보내기는 회계담당자만 할 수 있습니다.</p>
      )}

      <form action={sendPhotoMissingNotificationAction}>
        {canManage && missing.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button type="submit" className={btn}>선택 건 잔디 알림 보내기</button>
          </div>
        )}
        <div className={cardTableWrap}><table className={tableClean}>
          <thead>
            <tr>
              {canManage && <th className={thClean}></th>}
              <th className={thClean}>담당자</th><th className={thClean}>사업명/사용내역</th>
              <th className={thClean}>사용금액</th><th className={thClean}>경과</th><th className={thClean}>최근 알림</th>
            </tr>
          </thead>
          <tbody>
            {missing.map((r) => {
              const days = daysSince(r.사용일자);
              const tone = days >= 10 ? badgeTone.red : days >= 5 ? badgeTone.amber : badgeTone.gray;
              return (
                <tr key={r.id} className={trHoverClean}>
                  {canManage && (
                    <td className={tdClean}>
                      <input type="checkbox" name="ids" value={r.id} defaultChecked />
                    </td>
                  )}
                  <td className={tdClean}>{r.담당자명}</td>
                  <td className={tdClean}>
                    <div className="font-medium">{r.예산과목}</div>
                    <div className="text-xs text-zinc-500">{r.사용내역}</div>
                  </td>
                  <td className={tdClean}>{parseAmount(r.사용금액).toLocaleString()}원</td>
                  <td className={tdClean}><span className={`${badgeBase} ${tone}`}>{days}일</span></td>
                  <td className={tdClean}>
                    {r.마지막알림일시 ? <span className="text-xs text-zinc-500">{r.마지막알림일시}</span> : <span className="text-xs text-zinc-400">보낸 적 없음</span>}
                  </td>
                </tr>
              );
            })}
            {missing.length === 0 && (
              <tr><td colSpan={canManage ? 6 : 5} className={`${tdClean} text-center text-zinc-400`}>미등록 건이 없습니다.</td></tr>
            )}
          </tbody>
        </table></div>
      </form>
    </>
  );
}
