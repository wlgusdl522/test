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

      <h2 className={h2}>화면 레이아웃</h2>
      <div className={`${card} flex flex-wrap items-center gap-3`}>
        <form action={setNavLayoutAction}>
          <input type="hidden" name="layout" value="top" />
          <button type="submit" className={navLayout === 'top' ? btn : btnSecondary}>상단 배치</button>
        </form>
        <form action={setNavLayoutAction}>
          <input type="hidden" name="layout" value="left" />
          <button type="submit" className={navLayout === 'left' ? btn : btnSecondary}>좌측 배치</button>
        </form>
        <p className="text-xs text-zinc-400">메뉴를 화면 상단 또는 좌측 중 원하는 위치에 배치할 수 있어요.</p>
      </div>

      <h2 className={h2}>내 정보</h2>
      <div className={`${card} grid grid-cols-2 gap-2 text-sm`}>
        <div><span className="text-zinc-500">이메일</span> {me?.['이메일(아이디)'] ?? ''}</div>
        <div><span className="text-zinc-500">성명</span> {me?.성명 ?? ''}</div>
        <div><span className="text-zinc-500">소속팀</span> {me?.소속팀 ?? ''}</div>
        <div><span className="text-zinc-500">직급/직책</span> {me?.['직급/직책'] ?? ''}</div>
        <div><span className="text-zinc-500">담당사업</span> {me?.담당사업 ?? ''}</div>
        <div><span className="text-zinc-500">내선번호</span> {me?.내선번호 ?? ''}</div>
        <div><span className="text-zinc-500">휴대폰번호</span> {me?.휴대폰번호 ?? ''}</div>
        <div><span className="text-zinc-500">입사일</span> {me?.입사일 ?? ''}</div>
      </div>

      <h2 className={h2}>내 도장 / 알림 설정</h2>
      <div className={`${card} grid grid-cols-2 gap-4`}>
        <form action={saveMyStampAction} encType="multipart/form-data" className="flex flex-col gap-2">
          <label className={label}>
            내 도장 이미지 {me?.도장 && <a href={me.도장} target="_blank" rel="noreferrer" className="text-brand hover:underline">(현재 도장 보기)</a>}
            <input type="file" name="stamp" accept="image/*" className={input} />
          </label>
          <p className="text-xs text-zinc-400">결재라인이 없는 게시판(물품검수조서 등) 인쇄물에 이름 대신 이 도장 이미지가 찍힙니다.</p>
          <div><button type="submit" className={btn}>도장 등록</button></div>
        </form>
        <form action={saveMyJandiWebhookAction} className="flex flex-col gap-2">
          <label className={label}>
            내 잔디(JANDI) 개인 웹훅 URL
            <input name="webhookUrl" defaultValue={me?.잔디웹훅 ?? ''} placeholder="https://wh.jandi.com/..." className={input} />
          </label>
          <p className="text-xs text-zinc-400">잔디에서 "나와의 채팅" 토픽에 인커밍 웹훅을 연결해 등록해두면, 결재요청/승인/반려 알림이 나에게만 옵니다. 비워두면 공용 웹훅으로 대신 갑니다.</p>
          <div><button type="submit" className={btn}>저장</button></div>
        </form>
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
          <div className={cardTableWrap}><table className={tableClean}>
            <thead>
              <tr><th className={thClean}>구분</th><th className={thClean}>내용</th><th className={thClean}>단계</th><th className={thClean}></th></tr>
            </thead>
            <tbody>
              {pendingReports.map((r) => (
                <tr key={`report-${r.id}`} className={trHoverClean}>
                  <td className={tdClean}>물품검수조서</td>
                  <td className={tdClean}>{r.품명} · {Number(r.금액 || 0).toLocaleString()}원</td>
                  <td className={tdClean}>{r.현재결재단계}</td>
                  <td className={`${tdClean} flex items-center gap-1.5`}>
                    <form action={actOnItemCheckReportAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnItemCheckReportAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <input name="comment" placeholder="반려 사유" className={`${inputBase} w-24 text-xs`} />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
              {pendingLogs.map((r) => (
                <tr key={`log-${r.id}`} className={trHoverClean}>
                  <td className={tdClean}>차량운행일지</td>
                  <td className={tdClean}>{r.차량번호} · {r.목적}</td>
                  <td className={tdClean}>{r.현재결재단계}</td>
                  <td className={`${tdClean} flex items-center gap-1.5`}>
                    <form action={actOnVehicleLogAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnVehicleLogAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <input name="comment" placeholder="반려 사유" className={`${inputBase} w-24 text-xs`} />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
              {pendingCertificates.map((r) => (
                <tr key={`cert-${r.id}`} className={trHoverClean}>
                  <td className={tdClean}>증명서 발급</td>
                  <td className={tdClean}>{r.종류} · {r.대상자성명}</td>
                  <td className={tdClean}>{r.현재결재단계}</td>
                  <td className={`${tdClean} flex items-center gap-1.5`}>
                    <form action={actOnCertificateAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="승인" />
                      <button type="submit" className={btn}>승인</button>
                    </form>
                    <form action={actOnCertificateAction} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="action" value="반려" />
                      <input name="comment" placeholder="반려 사유" className={`${inputBase} w-24 text-xs`} />
                      <button type="submit" className={btnDanger}>반려</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
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
