'use client';

import { useState } from 'react';
import DetailPanel from '@/components/DetailPanel';
import { parseAmount } from '@/lib/format';
import {
  badgeBase, badgeTone, btn, btnDanger, cardTableWrap, inputBase, listRow, listRowActive, metaLabel, metaValue,
  tableClean, tdClean, thClean,
} from '@/lib/ui';
import { printCardLedgerAction, printCardLedgerBatchAction, rejectCardLedgerAction } from '@/app/(portal)/expenses/review/actions';

const STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  검수대기: 'gray',
  검수완료: 'amber',
  인쇄완료: 'green',
  반려: 'red',
  검수불요: 'gray',
};

function statusBadge(status: string) {
  return <span className={`${badgeBase} ${badgeTone[STATUS_TONE[status] ?? 'gray']}`}>{status}</span>;
}

// 인쇄 문서(물품검수사진/물품검수조서)를 실제 크기 그대로 렌더링한 뒤 축소해서
// 보여주는 썸네일 — 별도 인쇄 미리보기 렌더러를 새로 만들지 않고 기존 /print 페이지를 그대로 재사용한다.
function PrintPreview({ href, height = 380, scale = 0.4 }: { href: string; height?: number; scale?: number }) {
  return (
    <div>
      <div
        className="relative w-full overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800"
        style={{ height }}
      >
        <iframe
          src={href}
          className="absolute left-0 top-0 origin-top-left border-0"
          style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})` }}
        />
      </div>
      <a href={href} target="_blank" className="mt-1 inline-block text-xs text-brand hover:underline">
        전체 화면으로 열기 ↗
      </a>
    </div>
  );
}

export default function CardLedgerReviewClient({
  rows,
  photoByLedgerId,
  reportByLedgerId,
  canManage,
}: {
  rows: Record<string, string>[];
  photoByLedgerId: Record<string, Record<string, string>>;
  reportByLedgerId: Record<string, Record<string, string>>;
  canManage: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const photo = selected ? photoByLedgerId[selected.id] : undefined;
  const report = selected ? reportByLedgerId[selected.id] : undefined;
  const colCount = canManage ? 6 : 5;

  return (
    <div className="flex items-start gap-4">
      <form action={printCardLedgerBatchAction} className="min-w-0 flex-1">
        {canManage && (
          <div className="mb-3 flex justify-end">
            <button type="submit" className={btn}>선택 건 인쇄완료 처리</button>
          </div>
        )}
        <div className={cardTableWrap}><table className={tableClean}>
          <thead>
            <tr>
              {canManage && <th className={thClean}></th>}
              <th className={thClean}>사용일자</th><th className={thClean}>담당자</th><th className={thClean}>사업명/사용내역</th>
              <th className={thClean}>사용금액</th><th className={thClean}>상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = r.id === selectedId;
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={active ? listRowActive : listRow}
                >
                  {canManage && (
                    <td className={tdClean} onClick={(e) => e.stopPropagation()}>
                      {r.상태 === '검수완료' && <input type="checkbox" name="ids" value={r.id} />}
                    </td>
                  )}
                  <td className={tdClean}>{r.사용일자}</td>
                  <td className={tdClean}>{r.담당자명}</td>
                  <td className={tdClean}>
                    <div className="font-medium">{r.예산과목}</div>
                    <div className="text-xs text-zinc-500">{r.사용내역}</div>
                  </td>
                  <td className={tdClean}>{parseAmount(r.사용금액).toLocaleString()}원</td>
                  <td className={tdClean}>{statusBadge(r.상태)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={colCount} className={`${tdClean} text-center text-zinc-400`}>내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table></div>
      </form>

      {selected && (
        <DetailPanel
          title={`${selected.담당자명} · ${selected.사용내역}`}
          subtitle={`${selected.사용일자} · ${parseAmount(selected.사용금액).toLocaleString()}원`}
          tag={statusBadge(selected.상태)}
          onClose={() => setSelectedId(null)}
        >
          <div className="p-5 flex flex-col gap-4 text-sm">
            <div>
              <div className={metaLabel}>물품검수사진</div>
              {photo ? (
                <PrintPreview key={`photo-${photo.id}`} href={`/print/item-check-photo?id=${photo.id}`} height={340} />
              ) : <div className={metaValue}>미등록</div>}
            </div>

            {report && (
              <div>
                <div className={metaLabel}>물품검수조서</div>
                <PrintPreview key={`report-${report.id}`} href={`/print/item-check-report?id=${report.id}`} height={420} />
              </div>
            )}

            {selected.상태 === '반려' && selected.반려사유 && (
              <div>
                <div className={metaLabel}>반려 사유</div>
                <div className="text-[#b51c31]">{selected.반려사유}</div>
              </div>
            )}

            {selected.상태 === '검수불요' && (
              <div>
                <div className={metaLabel}>검수 불요 사유</div>
                <div className={metaValue}>{selected.검수불요사유}</div>
              </div>
            )}

            {canManage && selected.상태 === '검수완료' && (
              <form action={printCardLedgerAction}>
                <input type="hidden" name="id" value={selected.id} />
                <button type="submit" className={btn}>인쇄완료 처리 (수정 잠금)</button>
              </form>
            )}
            {canManage && selected.상태 === '인쇄완료' && (
              <form action={rejectCardLedgerAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={selected.id} />
                <input name="reason" placeholder="반려 사유" required className={`${inputBase} flex-1 text-xs`} />
                <button type="submit" className={btnDanger}>반려</button>
              </form>
            )}
            {canManage && selected.상태 === '검수대기' && (
              <p className="text-xs text-zinc-400">아직 검수(사진/조서) 등록이 끝나지 않아 인쇄할 수 없습니다.</p>
            )}
          </div>
        </DetailPanel>
      )}
    </div>
  );
}
