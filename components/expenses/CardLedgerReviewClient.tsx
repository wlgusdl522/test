'use client';

import { Fragment, useState } from 'react';
import DetailPanel from '@/components/DetailPanel';
import { parseAmount, resolveBusinessName } from '@/lib/format';
import {
  badgeBase, badgeTone, btn, btnSecondary, cardTableWrap, listRow, listRowActive, metaLabel, metaValue,
  tableClean, tdClean, thClean,
} from '@/lib/ui';
import {
  printCardLedgerAction, printCardLedgerBatchAction, setPhotoAccountingCheckAction,
  setReportAccountingCheckAction, unlockCardLedgerAction,
} from '@/app/(portal)/expenses/review/actions';

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

function boolBadge(yes: boolean) {
  return <span className={`${badgeBase} ${yes ? badgeTone.green : badgeTone.gray}`}>{yes ? '있음' : '없음'}</span>;
}

function formatTimelineTs(ts: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(ts || '');
  if (!m) return ts || '';
  return `${m[2]}.${m[3]} ${m[4]}:${m[5]}`;
}

type Step = { key: string; label: string; done: boolean };

function buildSteps(hasPhoto: boolean, reportRequired: boolean, hasReport: boolean, accountingDone: boolean, printed: boolean): Step[] {
  return [
    { key: 'register', label: '등록', done: true },
    { key: 'inspect', label: '검수자료', done: hasPhoto && (!reportRequired || hasReport) },
    { key: 'confirm', label: '회계확인', done: accountingDone },
    { key: 'print', label: '인쇄완료', done: printed },
  ];
}

function stepCircleClass(done: boolean, current: boolean): string {
  const base = 'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0';
  if (done) return `${base} bg-emerald-500 text-white`;
  if (current) return `${base} bg-brand text-white`;
  return `${base} bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400`;
}

function Stepper({ steps }: { steps: Step[] }) {
  const currentIndex = steps.findIndex((s) => !s.done);
  const active = currentIndex === -1 ? steps.length - 1 : currentIndex;
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <Fragment key={s.key}>
          {i > 0 && <div className={`h-[2px] flex-1 ${i <= active ? 'bg-brand' : 'bg-zinc-200 dark:bg-zinc-700'}`} />}
          <div className="flex flex-col items-center gap-1 px-1">
            <div className={stepCircleClass(s.done, i === active && !s.done)}>{s.done ? '✓' : i + 1}</div>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{s.label}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

// 인쇄 문서(물품검수사진/물품검수조서)를 실제 크기 그대로 렌더링한 뒤 축소해서
// 보여주는 썸네일 — 별도 인쇄 미리보기 렌더러를 새로 만들지 않고 기존 /print 페이지를 그대로 재사용한다.
function PrintPreview({ href, height = 460, scale = 0.48 }: { href: string; height?: number; scale?: number }) {
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

function AccountingCheckToggle({
  action, id, checked, canManage,
}: {
  action: (formData: FormData) => void;
  id: string;
  checked: boolean;
  canManage: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${badgeBase} ${checked ? badgeTone.green : badgeTone.gray}`}>
        회계확인 {checked ? '완료' : '전'}
      </span>
      {canManage && (
        <form action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="checked" value={checked ? '0' : '1'} />
          <button type="submit" className={btnSecondary}>{checked ? '취소' : '확인 처리'}</button>
        </form>
      )}
    </div>
  );
}

// 체크박스로 여러 건을 고르면 개별 상세 대신 이 패널이 뜬다 — 합계와 문서 미리보기를 넘겨보며
// 확인한 뒤 실제 인쇄(새 탭)로 넘어가는, 인쇄 전 마지막 확인 화면.
function PrintSelectionPanel({
  selectedRows, photoByLedgerId, reportByLedgerId, onClose,
}: {
  selectedRows: Record<string, string>[];
  photoByLedgerId: Record<string, Record<string, string>>;
  reportByLedgerId: Record<string, Record<string, string>>;
  onClose: () => void;
}) {
  const [previewIndex, setPreviewIndex] = useState(0);
  const clampedIndex = Math.min(previewIndex, selectedRows.length - 1);
  const current = selectedRows[clampedIndex];
  const currentPhoto = photoByLedgerId[current.id];
  const currentReport = reportByLedgerId[current.id];
  const previewHref = currentReport
    ? `/print/item-check-report?id=${currentReport.id}`
    : currentPhoto
      ? `/print/item-check-photo?id=${currentPhoto.id}`
      : null;

  const totalAmount = selectedRows.reduce((sum, r) => sum + parseAmount(r.사용금액), 0);
  const reportIds = selectedRows.map((r) => reportByLedgerId[r.id]?.id).filter((v): v is string => Boolean(v));
  const photoIds = selectedRows.map((r) => photoByLedgerId[r.id]?.id).filter((v): v is string => Boolean(v));

  return (
    <DetailPanel title={`선택한 인쇄 정보 (${selectedRows.length}건)`} onClose={onClose}>
      <div className="p-5 flex flex-col gap-5 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
            <div className={metaLabel}>총 금액</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{totalAmount.toLocaleString()}원</div>
          </div>
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
            <div className={metaLabel}>총 건수</div>
            <div className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{selectedRows.length}건</div>
          </div>
        </div>

        <div>
          <div className={`${metaLabel} mb-1`}>인쇄 미리보기</div>
          {previewHref ? (
            <>
              <PrintPreview key={previewHref} href={previewHref} />
              <div className="mt-2 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={clampedIndex === 0}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="이전 문서"
                >
                  ‹
                </button>
                <span className="text-xs text-zinc-500 tabular-nums">{clampedIndex + 1} / {selectedRows.length}</span>
                <button
                  type="button"
                  onClick={() => setPreviewIndex((i) => Math.min(selectedRows.length - 1, i + 1))}
                  disabled={clampedIndex === selectedRows.length - 1}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="다음 문서"
                >
                  ›
                </button>
              </div>
            </>
          ) : (
            <div className={metaValue}>미리볼 문서가 없습니다.</div>
          )}
        </div>

        <p className="rounded-md bg-brand-tint px-3 py-2.5 text-xs leading-relaxed text-brand-dark dark:text-brand">
          선택한 {selectedRows.length}건의 인쇄가 진행됩니다. 물품검수조서에는 검수사진과 기본 정보가 함께 출력됩니다.
        </p>

        <div className="flex flex-col gap-2">
          {reportIds.length > 0 && (
            <a href={`/print/item-check-report?ids=${reportIds.join(',')}`} target="_blank" className={`${btn} justify-center`}>
              물품검수조서 출력 ({reportIds.length}건)
            </a>
          )}
          {photoIds.length > 0 && (
            <a href={`/print/item-check-photo?ids=${photoIds.join(',')}`} target="_blank" className={`${btnSecondary} justify-center`}>
              물품검수사진 출력 ({photoIds.length}건)
            </a>
          )}
        </div>
      </div>
    </DetailPanel>
  );
}

export default function CardLedgerReviewClient({
  rows,
  photoByLedgerId,
  reportByLedgerId,
  canManage,
  budgetItems,
  reportThreshold,
}: {
  rows: Record<string, string>[];
  photoByLedgerId: Record<string, Record<string, string>>;
  reportByLedgerId: Record<string, Record<string, string>>;
  canManage: boolean;
  budgetItems: Record<string, string>[];
  reportThreshold: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const selectedRows = rows.filter((r) => selectedIds.has(r.id));
  const photo = selected ? photoByLedgerId[selected.id] : undefined;
  const report = selected ? reportByLedgerId[selected.id] : undefined;
  const colCount = canManage ? 9 : 8;

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  const exempt = selected?.검수불요여부 === 'Y';
  const reportRequired = !exempt && reportThreshold > 0 && parseAmount(selected?.사용금액) >= reportThreshold;
  const hasPhoto = !!photo;
  const hasReport = !!report;
  const photoChecked = !!photo?.인쇄일시;
  const reportChecked = !!report?.인쇄일시;
  const accountingDone = hasPhoto && photoChecked && (!reportRequired || reportChecked);
  const steps = selected && !exempt
    ? buildSteps(hasPhoto, reportRequired, hasReport, accountingDone, selected.상태 === '인쇄완료')
    : [];

  const timeline = selected
    ? [
        selected.등록일시 && { ts: selected.등록일시, label: '카드사용 등록' },
        photo?.등록일시 && { ts: photo.등록일시, label: '검수사진 등록' },
        report?.등록일시 && { ts: report.등록일시, label: '물품검수조서 등록' },
        photo?.인쇄일시 && { ts: photo.인쇄일시, label: '회계 확인 (사진)' },
        reportRequired && report?.인쇄일시 && { ts: report.인쇄일시, label: '회계 확인 (조서)' },
      ]
        .filter((x): x is { ts: string; label: string } => Boolean(x))
        .sort((a, b) => a.ts.localeCompare(b.ts))
    : [];

  return (
    <div className="flex items-start gap-4">
      <form action={printCardLedgerBatchAction} className="min-w-0 flex-1">
        {canManage && (
          <div className="mb-3 flex justify-end">
            <button
              type="submit"
              className={`${btn} ${selectedRows.length === 0 ? 'opacity-40 cursor-not-allowed hover:bg-brand' : ''}`}
              disabled={selectedRows.length === 0}
            >
              선택 건 인쇄완료 처리{selectedRows.length > 0 ? ` (${selectedRows.length}건)` : ''}
            </button>
          </div>
        )}
        <div className={cardTableWrap}><table className={tableClean}>
          <thead>
            <tr>
              {canManage && <th className={thClean}></th>}
              <th className={thClean}>사용일자</th><th className={thClean}>담당자</th><th className={thClean}>사업명</th>
              <th className={thClean}>사용내역</th><th className={thClean}>사용금액</th><th className={thClean}>상태</th>
              <th className={thClean}>검수사진</th><th className={thClean}>검수조서</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const active = r.id === selectedId;
              const year = (r.사용일자 || '').slice(0, 4);
              const prevYear = i > 0 ? (rows[i - 1].사용일자 || '').slice(0, 4) : '';
              const showYearHeader = !!year && year !== prevYear;
              const rExempt = r.검수불요여부 === 'Y';
              const rReportRequired = !rExempt && reportThreshold > 0 && parseAmount(r.사용금액) >= reportThreshold;
              return (
                <Fragment key={r.id}>
                  {showYearHeader && (
                    <tr>
                      <td colSpan={colCount} className="bg-zinc-50 px-4 py-1.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
                        {year}년
                      </td>
                    </tr>
                  )}
                  <tr
                    onClick={() => setSelectedId(r.id)}
                    className={active ? listRowActive : listRow}
                  >
                    {canManage && (
                      <td className={tdClean} onClick={(e) => e.stopPropagation()}>
                        {r.상태 === '검수완료' && (
                          <input
                            type="checkbox"
                            name="ids"
                            value={r.id}
                            checked={selectedIds.has(r.id)}
                            onChange={(e) => toggleSelected(r.id, e.target.checked)}
                          />
                        )}
                      </td>
                    )}
                    <td className={tdClean}>{r.사용일자}</td>
                    <td className={tdClean}>{r.담당자명}</td>
                    <td className={tdClean}>{resolveBusinessName(r.예산과목, budgetItems)}</td>
                    <td className={tdClean}>{r.사용내역}</td>
                    <td className={tdClean}>{parseAmount(r.사용금액).toLocaleString()}원</td>
                    <td className={tdClean}>{statusBadge(r.상태)}</td>
                    <td className={tdClean}>{rExempt ? <span className="text-xs text-zinc-400">해당없음</span> : boolBadge(!!photoByLedgerId[r.id])}</td>
                    <td className={tdClean}>{!rReportRequired ? <span className="text-xs text-zinc-400">해당없음</span> : boolBadge(!!reportByLedgerId[r.id])}</td>
                  </tr>
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={colCount} className={`${tdClean} text-center text-zinc-400`}>내역이 없습니다.</td></tr>
            )}
          </tbody>
        </table></div>
      </form>

      {selectedRows.length > 0 ? (
        <PrintSelectionPanel
          selectedRows={selectedRows}
          photoByLedgerId={photoByLedgerId}
          reportByLedgerId={reportByLedgerId}
          onClose={() => setSelectedIds(new Set())}
        />
      ) : selected && (
        <DetailPanel
          title={selected.사용내역}
          subtitle={`${selected.담당자명} · ${selected.사용일자} · ${parseAmount(selected.사용금액).toLocaleString()}원`}
          tag={statusBadge(selected.상태)}
          onClose={() => setSelectedId(null)}
        >
          <div className="p-5 flex flex-col gap-5 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><div className={metaLabel}>사업명</div><div className={metaValue}>{resolveBusinessName(selected.예산과목, budgetItems)}</div></div>
              <div><div className={metaLabel}>예산과목</div><div className={metaValue}>{selected.예산과목}</div></div>
            </div>

            {exempt ? (
              <div>
                <div className={metaLabel}>검수 불요 사유</div>
                <div className={metaValue}>{selected.검수불요사유}</div>
              </div>
            ) : (
              <Stepper steps={steps} />
            )}

            {!exempt && (
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold">물품검수사진</span>
                    {photo && <AccountingCheckToggle action={setPhotoAccountingCheckAction} id={photo.id} checked={photoChecked} canManage={canManage} />}
                  </div>
                  {photo ? (
                    <PrintPreview key={`photo-${photo.id}`} href={`/print/item-check-photo?id=${photo.id}`} />
                  ) : <div className={metaValue}>미등록</div>}
                </div>

                {reportRequired && (
                  <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold">물품검수조서</span>
                      {report && <AccountingCheckToggle action={setReportAccountingCheckAction} id={report.id} checked={reportChecked} canManage={canManage} />}
                    </div>
                    {report ? (
                      <PrintPreview key={`report-${report.id}`} href={`/print/item-check-report?id=${report.id}`} height={560} />
                    ) : <div className={metaValue}>미등록</div>}
                  </div>
                )}
              </div>
            )}

            {timeline.length > 0 && (
              <div>
                <div className={metaLabel}>최근 진행 내역</div>
                <ul className="flex flex-col gap-1.5 mt-1">
                  {timeline.map((t, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                      <span className="text-zinc-400 dark:text-zinc-500 tabular-nums">{formatTimelineTs(t.ts)}</span>
                      <span>{t.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canManage && selected.상태 === '검수완료' && (
              <form action={printCardLedgerAction}>
                <input type="hidden" name="id" value={selected.id} />
                <button type="submit" className={btn}>인쇄완료 처리 (수정 잠금)</button>
              </form>
            )}
            {canManage && selected.상태 === '인쇄완료' && (
              <form action={unlockCardLedgerAction}>
                <input type="hidden" name="id" value={selected.id} />
                <button type="submit" className={btnSecondary}>수정 가능하게 하기</button>
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
