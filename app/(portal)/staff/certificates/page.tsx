import Link from 'next/link';
import { canViewCertificateLog } from '@/lib/auth-helpers';
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

export default async function CertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const canManage = await canViewCertificateLog();
  const { tab } = await searchParams;
  const activeTab = tab === 'manage' || tab === 'process' ? (canManage ? tab : 'apply') : 'apply';

  const [records, staff] = await Promise.all([
    canManage ? getCertificateList() : Promise.resolve([]),
    getStaffList(),
  ]);
  const pendingClerkReview = records.filter(
    (r) => r.결재상태 === '결재중' && r.현재결재단계 === '서무/회계' && (r.구분 === '증명서' || r.구분 === '상장')
  );

  return (
    <main className={pageFluid}>
      <h1 className={h1}>인사관리 &gt; 증명서 발급</h1>
      {canManage && <p className={pageSubtitle}>총 {records.length}건</p>}

      <div className="mb-5 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="?tab=apply" className={tabClass(activeTab === 'apply')}>신청</Link>
        {canManage && (
          <>
            <Link href="?tab=process" className={tabClass(activeTab === 'process')}>
              발급 처리{pendingClerkReview.length > 0 && ` (${pendingClerkReview.length})`}
            </Link>
            <Link href="?tab=manage" className={tabClass(activeTab === 'manage')}>신청 내역 관리</Link>
          </>
        )}
      </div>

      {activeTab === 'apply' && (
        <CertificateApplyWizard
          certificateAction={addCertificateAction}
          awardAction={addAwardAction}
          staff={staff}
        />
      )}

      {activeTab === 'process' && (
        <div className={cardTableWrap}>
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
                    {r.구분 === '상장' ? (
                      <FormToggle label={`${r.종류} 발급 처리 · ${r.대상자성명}`} buttonLabel="미리보기·발급승인" buttonClassName={btn} wrapperClassName="">
                        <AwardApprovalPanel r={r} action={actOnCertificateAction} staff={staff} />
                      </FormToggle>
                    ) : (
                      <FormToggle label={`${r.신청유형} 발급 처리 · ${r.대상자성명}`} buttonLabel="처리하기" buttonClassName={btn} wrapperClassName="">
                        <ProcessForm r={r} action={processCertificateAction} />
                      </FormToggle>
                    )}
                  </td>
                </tr>
              ))}
              {pendingClerkReview.length === 0 && (
                <tr>
                  <td colSpan={5} className={`${tdClean} text-center text-zinc-400`}>처리할 신청이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'manage' && (
        <>
          <form id="award-print-form" method="get" action="/print/award" className="mb-3 flex justify-end">
            <button type="submit" className={btnOutline}>선택한 상장 인쇄</button>
          </form>
          <div className={cardTableWrap}>
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
                      <span className={`${badgeBase} ${badgeTone[STATUS_TONE[r.결재상태] ?? 'gray']}`}>{r.결재상태}</span>
                      {r.결재상태 === '결재중' && r.현재결재단계 && (
                        <span className="ml-1.5 text-xs text-zinc-400">{r.현재결재단계} 대기</span>
                      )}
                      {r.결재상태 === '승인' && r.발행일시 && <span className="ml-1.5 text-xs text-emerald-600">발행완료</span>}
                    </td>
                    <td className={tdClean}>{r.발급일}</td>
                    <td className={tdClean}>{r.등록일시}</td>
                    <td className={`${tdClean} flex items-center gap-2`}>
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
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={10} className={`${tdClean} text-center text-zinc-400`}>등록된 발급 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
