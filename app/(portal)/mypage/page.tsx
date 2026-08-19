import { getMyRecordsSummary } from '@/lib/mutate/dashboard';
import { getMyPendingItemCheckReportApprovals } from '@/lib/mutate/itemCheckReport';
import { getMyPendingVehicleLogApprovals } from '@/lib/mutate/vehicleLog';
import { getMyPendingCertificateApprovals } from '@/lib/supabase/certificate';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import { getNavLayout, setNavLayoutAction } from '@/lib/prefs-actions';
import { btn, btnDanger, btnSecondary, card, cardTableWrap, h1, h2, input, inputBase, label, pageFluid, tableClean, tdClean, thClean, trHoverClean } from '@/lib/ui';
import { actOnItemCheckReportAction } from '@/app/(portal)/expenses/reports/actions';
import { parseAmount } from '@/lib/format';
import { actOnVehicleLogAction } from '@/app/(portal)/vehicles/logs/actions';
import { actOnCertificateAction } from '@/app/(portal)/staff/certificates/actions';
import { saveMyJandiWebhookAction, saveMyStampAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function ApprovalActions({ actionFn, id }: { actionFn: (formData: FormData) => Promise<void>; id: string }) {
  return (
    <>
      <form action={actionFn}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="action" value="승인" />
        <button type="submit" className={btn}>승인</button>
      </form>
      <form action={actionFn} className="flex items-center gap-1">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="action" value="반려" />
        <input name="comment" placeholder="반려 사유" className={`${inputBase} w-24 text-xs`} />
        <button type="submit" className={btnDanger}>반려</button>
      </form>
    </>
  );
}

export default async function MyPage() {
  const [summary, pendingReports, pendingLogs, pendingCertificates, me, navLayout] = await Promise.all([
    getMyRecordsSummary(),
    getMyPendingItemCheckReportApprovals(),
    getMyPendingVehicleLogApprovals(),
    getMyPendingCertificateApprovals(),
    getViewerStaffRecord(),
    getNavLayout(),
  ]);

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>마이페이지</h1>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className={`${card} flex flex-col items-center text-center`}>
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-2xl font-bold text-brand-dark dark:text-brand">
            {(me?.성명 ?? '?').slice(0, 1)}
          </div>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {me?.성명 ?? ''} <span className="font-normal text-zinc-500 dark:text-zinc-400">{me?.['직급/직책'] ?? ''}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{me?.담당사업 ?? ''}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{me?.소속팀 ?? ''}</p>
        </div>

        <div className={card}>
          <h2 className={`${h2} mt-0`}>내 정보</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div><span className="text-zinc-500">이메일</span> {me?.['이메일(아이디)'] ?? ''}</div>
            <div><span className="text-zinc-500">내선번호</span> {me?.내선번호 ?? ''}</div>
            <div><span className="text-zinc-500">휴대폰번호</span> {me?.휴대폰번호 ?? ''}</div>
            <div><span className="text-zinc-500">입사일</span> {me?.입사일 ?? ''}</div>
          </div>
        </div>

        <div className={card}>
          <h2 className={`${h2} mt-0`}>화면·개인 설정</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">메뉴 위치</span>
              <form action={setNavLayoutAction}>
                <input type="hidden" name="layout" value="top" />
                <button type="submit" className={navLayout === 'top' ? btn : btnSecondary}>상단</button>
              </form>
              <form action={setNavLayoutAction}>
                <input type="hidden" name="layout" value="left" />
                <button type="submit" className={navLayout === 'left' ? btn : btnSecondary}>좌측</button>
              </form>
            </div>
            <form action={saveMyStampAction} encType="multipart/form-data" className="flex flex-col gap-1.5">
              <label className={label}>
                내 도장 이미지 {me?.도장 && <a href={me.도장} target="_blank" rel="noreferrer" className="text-brand hover:underline">(보기)</a>}
                <input type="file" name="stamp" accept="image/*" className={input} />
              </label>
              <div><button type="submit" className={btnSecondary}>도장 등록</button></div>
            </form>
            <form action={saveMyJandiWebhookAction} className="flex flex-col gap-1.5">
              <label className={label}>
                내 잔디(JANDI) 개인 웹훅
                <input name="webhookUrl" defaultValue={me?.잔디웹훅 ?? ''} placeholder="https://wh.jandi.com/..." className={input} />
              </label>
              <div><button type="submit" className={btnSecondary}>저장</button></div>
            </form>
          </div>
        </div>
      </div>

      <h2 className={h2}>처리할 일</h2>
      <ul className="mb-6 flex flex-col gap-1">
        {summary.pendingTasks.map((t) => (
          <li key={`${t.section}-${t.id}`} className="text-sm text-zinc-700 dark:text-zinc-300">
            [{t.status}] {t.date} · {t.title}
          </li>
        ))}
        {summary.pendingTasks.length === 0 && <li className="text-sm text-zinc-400">처리할 일이 없습니다.</li>}
      </ul>

      {(pendingReports.length > 0 || pendingLogs.length > 0 || pendingCertificates.length > 0) && (
        <>
          <h2 className={h2}>내 결재함</h2>
          {(() => {
            const approvalRows = [
              ...pendingReports.map((r) => ({
                key: `report-${r.id}`, label: '물품검수조서',
                content: `${r.품명} · ${Number(r.금액 || 0).toLocaleString()}원`,
                step: r.현재결재단계, actionFn: actOnItemCheckReportAction, id: r.id,
              })),
              ...pendingLogs.map((r) => ({
                key: `log-${r.id}`, label: '차량운행일지',
                content: `${r.차량번호} · ${r.목적}`,
                step: r.현재결재단계, actionFn: actOnVehicleLogAction, id: r.id,
              })),
              ...pendingCertificates.map((r) => ({
                key: `cert-${r.id}`, label: '증명서 발급',
                content: `${r.종류} · ${r.대상자성명}`,
                step: r.현재결재단계, actionFn: actOnCertificateAction, id: r.id,
              })),
            ];
            return (
              <>
                {/* 모바일: 표는 칸이 너무 좁아져서 대신 카드 목록으로 보여준다 */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {approvalRows.map((row) => (
                    <div key={row.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.label}</span>
                        <span className="text-xs text-zinc-400">{row.step}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{row.content}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <ApprovalActions actionFn={row.actionFn} id={row.id} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 데스크톱: 기존 표 레이아웃 유지 */}
                <div className={`hidden sm:block ${cardTableWrap}`}><table className={tableClean}>
                  <thead>
                    <tr><th className={thClean}>구분</th><th className={thClean}>내용</th><th className={thClean}>단계</th><th className={thClean}></th></tr>
                  </thead>
                  <tbody>
                    {approvalRows.map((row) => (
                      <tr key={row.key} className={trHoverClean}>
                        <td className={tdClean}>{row.label}</td>
                        <td className={tdClean}>{row.content}</td>
                        <td className={tdClean}>{row.step}</td>
                        <td className={`${tdClean} flex items-center gap-1.5`}>
                          <ApprovalActions actionFn={row.actionFn} id={row.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>
            );
          })()}
        </>
      )}

      <h2 className={h2}>최근 카드사용대장</h2>
      <ul className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.cardLedger.map((r) => <li key={r.id}>{r.사용일자} · {r.사용내역} · {parseAmount(r.사용금액).toLocaleString()}원</li>)}
        {summary.cardLedger.length === 0 && <li className="text-zinc-400">없음</li>}
      </ul>

      <h2 className={h2}>최근 물품검수사진</h2>
      <ul className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.itemCheckPhoto.map((r) => <li key={r.id}>{r.지출일자} · {r.품명}</li>)}
        {summary.itemCheckPhoto.length === 0 && <li className="text-zinc-400">없음</li>}
      </ul>

      <h2 className={h2}>최근 작성한 물품검수조서</h2>
      <ul className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.itemCheckReport.map((r) => <li key={r.id}>{r.검수년월일} · {r.품명} · {r.결재상태}</li>)}
        {summary.itemCheckReport.length === 0 && <li className="text-zinc-400">없음</li>}
      </ul>

      <h2 className={h2}>최근 차량사용신청</h2>
      <ul className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.vehicleRequest.map((r) => <li key={r.id}>{r.사용일자} · {r.차량번호} · {r.목적}</li>)}
        {summary.vehicleRequest.length === 0 && <li className="text-zinc-400">없음</li>}
      </ul>

      <h2 className={h2}>최근 차량운행일지</h2>
      <ul className="mb-4 text-sm text-zinc-700 dark:text-zinc-300">
        {summary.vehicleLog.map((r) => <li key={r.id}>{r.운행일자} · {r.차량번호} · {r.목적} · {r.결재상태}</li>)}
        {summary.vehicleLog.length === 0 && <li className="text-zinc-400">없음</li>}
      </ul>
    </main>
  );
}
