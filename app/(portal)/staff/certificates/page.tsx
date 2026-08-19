import Link from 'next/link';
import { canViewCertificateLog, requireViewerEmail } from '@/lib/auth-helpers';
import { getCertificateList } from '@/lib/supabase/certificate';
import { getStaffList } from '@/lib/mutate/staff';
import CertificateApplyWizard from '@/components/certificates/CertificateApplyWizard';
import ProcessForm from '@/components/certificates/ProcessForm';
import AwardApprovalPanel from '@/components/certificates/AwardApprovalPanel';
import FormToggle from '@/components/FormToggle';
import {
  badgeBase,
  badgeTone,
  btn,
  btnDanger,
  btnOutline,
  cardTableWrap,
  h1,
  pageFluid,
  pageSubtitle,
  tableClean,
  tdClean,
  thClean,
  trHoverClean,
} from '@/lib/ui';
import {
  actOnCertificateAction, addAwardAction, addCertificateAction, issueCertificateAction, processCertificateAction,
  resendCertificateEmailAction,
} from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  결재중: 'amber',
  승인: 'green',
  반려: 'red',
};

function tabClass(active: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-brand-tint text-brand' : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
  }`;
}

function StatusCell({ r }: { r: Record<string, string> }) {
  return (
    <>
      <span className={`${badgeBase} ${badgeTone[STATUS_TONE[r.결재상태] ?? 'gray']}`}>{r.결재상태}</span>
      {r.결재상태 === '결재중' && r.현재결재단계 && (
        <span className="ml-1.5 text-xs text-zinc-400">{r.현재결재단계} 대기</span>
      )}
      {r.결재상태 === '승인' && r.발행일시 && <span className="ml-1.5 text-xs text-emerald-600">발행완료</span>}
    </>
  );
}

function ManageActions({ r }: { r: Record<string, string> }) {
  return (
    <>
      {r.문서URL ? (
        <a href={`/api/certificate/${r.id}/pdf`} target="_blank" rel="noreferrer" className="text-brand hover:underline">인쇄</a>
      ) : (
        r.결재상태 === '승인' && r.구분 === '증명서' && r.발행일시 && (
          <Link href={`/print/certificate?id=${r.id}`} className="text-brand hover:underline">인쇄(임시)</Link>
        )
      )}
      {r.결재상태 === '승인' && r.구분 === '증명서' && !r.발행일시 && (
        <form action={issueCertificateAction}>
          <input type="hidden" name="id" value={r.id} />
          <button type="submit" className={btn}>발행</button>
        </form>
      )}
      {r.문서URL && (
        <form action={resendCertificateEmailAction}>
          <input type="hidden" name="id" value={r.id} />
          <button type="submit" className={btnOutline}>메일발송</button>
        </form>
      )}
    </>
  );
}

function ProcessAction({ r, staff }: { r: Record<string, string>; staff: Record<string, string>[] }) {
  return r.구분 === '상장' ? (
    <FormToggle label={`${r.종류} 발급 처리 · ${r.대상자성명}`} buttonLabel="미리보기·발급승인" buttonClassName={btn} wrapperClassName="">
      <AwardApprovalPanel r={r} action={actOnCertificateAction} staff={staff} />
    </FormToggle>
  ) : (
    <FormToggle label={`${r.신청유형} 발급 처리 · ${r.대상자성명}`} buttonLabel="처리하기" buttonClassName={btn} wrapperClassName="">
      <ProcessForm r={r} action={processCertificateAction} />
    </FormToggle>
  );
}

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; resend?: string; reason?: string }>;
}) {
  const canManage = await canViewCertificateLog();
  const viewerEmail = await requireViewerEmail();
  const { tab, resend, reason } = await searchParams;
  const activeTab = tab === 'manage' || tab === 'process'
    ? (canManage ? tab : 'apply')
    : tab === 'award-output' ? tab : 'apply';

  const needsFullList = canManage || activeTab === 'award-output';
  const [allRecords, staff] = await Promise.all([
    needsFullList ? getCertificateList() : Promise.resolve([]),
    getStaffList(),
  ]);
  const records = canManage ? allRecords : [];
  const myAwards = allRecords.filter((r) => r.구분 === '상장' && (r.등록자이메일 || '').toLowerCase() === viewerEmail);
  const pendingClerkReview = records.filter(
    (r) => r.결재상태 === '결재중' && r.현재결재단계 === '서무/회계' && (r.구분 === '증명서' || r.구분 === '상장')
  );

  return (
    <main className={pageFluid}>
      <h1 className={h1}>인사관리 &gt; 증명서 발급</h1>
      {canManage && <p className={pageSubtitle}>총 {records.length}건</p>}

      <div className="mb-5 flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="?tab=apply" className={tabClass(activeTab === 'apply')}>신청</Link>
        <Link href="?tab=award-output" className={tabClass(activeTab === 'award-output')}>상장 출력관리</Link>
        {canManage && (
          <>
            <Link href="?tab=process" className={tabClass(activeTab === 'process')}>
              발급 처리{pendingClerkReview.length > 0 && ` (${pendingClerkReview.length})`}
            </Link>
            <Link href="?tab=manage" className={tabClass(activeTab === 'manage')}>신청 내역 관리</Link>
          </>
        )}
      </div>

      {resend === 'ok' && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          메일을 다시 보냈습니다.
        </p>
      )}
      {resend === 'fail' && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          메일 발송 실패: {reason || '알 수 없는 오류'}
        </p>
      )}

      {activeTab === 'apply' && (
        <CertificateApplyWizard
          certificateAction={addCertificateAction}
          awardAction={addAwardAction}
          staff={staff}
        />
      )}

      {activeTab === 'award-output' && (
        <>
          <form id="my-award-print-form" method="get" action="/api/certificate/award-print" className="mb-3 flex justify-end">
            <button type="submit" className={btnOutline}>선택한 상장 인쇄</button>
          </form>
          <div className={cardTableWrap}>
            <table className={tableClean}>
              <thead>
                <tr>
                  <th className={thClean}></th>
                  <th className={thClean}>문서번호</th>
                  <th className={thClean}>종류</th>
                  <th className={thClean}>대상자</th>
                  <th className={thClean}>수여사유</th>
                  <th className={thClean}>상태</th>
                  <th className={thClean}>발급일</th>
                  <th className={thClean}></th>
                </tr>
              </thead>
              <tbody>
                {myAwards.map((r) => (
                  <tr key={r.id} className={trHoverClean}>
                    <td className={tdClean}>
                      {r.문서URL && <input type="checkbox" name="id" value={r.id} form="my-award-print-form" />}
                    </td>
                    <td className={tdClean}>{r.문서번호 ? `제 ${r.문서번호}호` : '(미채번)'}</td>
                    <td className={tdClean}>{r.종류}</td>
                    <td className={tdClean}>{r.대상자성명}</td>
                    <td className={tdClean}>{r.용도}</td>
                    <td className={tdClean}>
                      <span className={`${badgeBase} ${badgeTone[STATUS_TONE[r.결재상태] ?? 'gray']}`}>{r.결재상태}</span>
                      {r.결재상태 === '결재중' && r.현재결재단계 && (
                        <span className="ml-1.5 text-xs text-zinc-400">{r.현재결재단계} 대기</span>
                      )}
                    </td>
                    <td className={tdClean}>{r.발급일}</td>
                    <td className={tdClean}>
                      {r.문서URL && (
                        <a href={`/api/certificate/${r.id}/pdf`} target="_blank" rel="noreferrer" className="text-brand hover:underline">인쇄</a>
                      )}
                    </td>
                  </tr>
                ))}
                {myAwards.length === 0 && (
                  <tr>
                    <td colSpan={8} className={`${tdClean} text-center text-zinc-400`}>내가 등록한 상장이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'process' && (
        pendingClerkReview.length === 0 ? (
          <p className="text-sm text-zinc-400">처리할 신청이 없습니다.</p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:hidden">
              {pendingClerkReview.map((r) => (
                <div key={r.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.대상자성명}</span>
                    <span className="text-xs text-zinc-400">{r.신청일}</span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{r.신청유형} · {r.용도}</p>
                  <div className="mt-2">
                    <ProcessAction r={r} staff={staff} />
                  </div>
                </div>
              ))}
            </div>

            <div className={`hidden sm:block ${cardTableWrap}`}>
              <table className={tableClean}>
                <thead>
                  <tr>
                    <th className={thClean}>신청유형</th>
                    <th className={thClean}>대상자</th>
                    <th className={thClean}>용도</th>
                    <th className={thClean}>신청일</th>
                    <th className={thClean}></th>
                  </tr>
                </thead>
                <tbody>
                  {pendingClerkReview.map((r) => (
                    <tr key={r.id} className={trHoverClean}>
                      <td className={tdClean}>{r.신청유형}</td>
                      <td className={tdClean}>{r.대상자성명}</td>
                      <td className={tdClean}>{r.용도}</td>
                      <td className={tdClean}>{r.신청일}</td>
                      <td className={tdClean}>
                        <ProcessAction r={r} staff={staff} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {activeTab === 'manage' && (
        <>
          <form id="award-print-form" method="get" action="/api/certificate/award-print" className="mb-3 flex justify-end">
            <button type="submit" className={btnOutline}>선택한 상장 인쇄</button>
          </form>
          {records.length === 0 ? (
            <p className="text-sm text-zinc-400">등록된 발급 내역이 없습니다.</p>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:hidden">
                {records.map((r) => (
                  <div key={r.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {r.구분 === '상장' && r.문서URL && (
                          <input type="checkbox" name="id" value={r.id} form="award-print-form" className="mr-1.5 align-middle" />
                        )}
                        {r.대상자성명}
                      </span>
                      <StatusCell r={r} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                      {r.구분}{r.종류 ? ` · ${r.종류}` : ''} · {r.문서번호 ? `제 ${r.문서번호}호` : '(미채번)'}
                    </p>
                    {(r.대상자소속 || r.대상자직위) && (
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {[r.대상자소속, r.대상자직위].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{r.용도}</p>
                    <p className="mt-1 text-xs text-zinc-400">발급 {r.발급일 || '-'} · 등록 {r.등록일시}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ManageActions r={r} />
                    </div>
                  </div>
                ))}
              </div>

              <div className={`hidden sm:block ${cardTableWrap}`}>
                <table className={tableClean}>
                  <thead>
                    <tr>
                      <th className={thClean}></th>
                      <th className={thClean}>문서번호</th>
                      <th className={thClean}>구분/종류</th>
                      <th className={thClean}>대상자</th>
                      <th className={thClean}>소속/직위</th>
                      <th className={thClean}>용도</th>
                      <th className={thClean}>상태</th>
                      <th className={thClean}>발급일</th>
                      <th className={thClean}>등록일시</th>
                      <th className={thClean}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className={trHoverClean}>
                        <td className={tdClean}>
                          {r.구분 === '상장' && r.문서URL && (
                            <input type="checkbox" name="id" value={r.id} form="award-print-form" />
                          )}
                        </td>
                        <td className={tdClean}>{r.문서번호 ? `제 ${r.문서번호}호` : '(미채번)'}</td>
                        <td className={tdClean}>{r.구분}{r.종류 ? ` · ${r.종류}` : ''}</td>
                        <td className={tdClean}>{r.대상자성명}</td>
                        <td className={tdClean}>{[r.대상자소속, r.대상자직위].filter(Boolean).join(' · ')}</td>
                        <td className={tdClean}>{r.용도}</td>
                        <td className={tdClean}>
                          <StatusCell r={r} />
                        </td>
                        <td className={tdClean}>{r.발급일}</td>
                        <td className={tdClean}>{r.등록일시}</td>
                        <td className={`${tdClean} flex items-center gap-2`}>
                          <ManageActions r={r} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
