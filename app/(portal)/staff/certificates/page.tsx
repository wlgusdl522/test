import Link from 'next/link';
import { requireCanViewCertificateLog } from '@/lib/auth-helpers';
import { getCertificateList, CERTIFICATE_TYPES } from '@/lib/supabase/certificate';
import { getStaffList } from '@/lib/mutate/staff';
import PageAccessDenied from '@/components/PageAccessDenied';
import FormToggle from '@/components/FormToggle';
import StaffPicker from '@/components/duty/StaffPicker';
import {
  badgeBase,
  badgeTone,
  btn,
  cardTableWrap,
  h1,
  input,
  label,
  pageFluid,
  pageSubtitle,
  tableClean,
  tdClean,
  thClean,
  trHoverClean,
} from '@/lib/ui';
import { addAwardAction, addCertificateAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  결재중: 'amber',
  승인: 'green',
  반려: 'red',
};

export default async function CertificatesPage() {
  try {
    await requireCanViewCertificateLog();
  } catch {
    return (
      <main className={pageFluid}>
        <h1 className={`${h1} mb-5`}>인사관리 &gt; 증명서 발급</h1>
        <PageAccessDenied />
      </main>
    );
  }

  const [records, staff] = await Promise.all([getCertificateList(), getStaffList()]);

  return (
    <main className={pageFluid}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={h1}>인사관리 &gt; 증명서 발급</h1>
          <p className={pageSubtitle}>총 {records.length}건</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FormToggle label="증명서 신청 등록" buttonLabel="+ 증명서 신청 등록">
            <form action={addCertificateAction} className="flex flex-col gap-3">
              <div>
                <p className={label}>희망이음 미등록자(옛 퇴사자·강사)면 직원 선택, 아니면 아래 칸에 직접 입력</p>
                <StaffPicker staff={staff} name="staff" />
              </div>
              <label className={label}>
                대상자성명 (직접입력, 미선택 시 필수)
                <input name="대상자성명" className={input} />
              </label>
              <label className={label}>
                대상자소속 (직접입력)
                <input name="대상자소속" className={input} />
              </label>
              <label className={label}>
                대상자직위
                <input name="대상자직위" className={input} />
              </label>
              <label className={label}>
                종류
                <select name="종류" className={input} required defaultValue="">
                  <option value="" disabled>선택</option>
                  {CERTIFICATE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className={label}>
                근무기간 (재직/경력증명서용)
                <input name="근무기간" placeholder="예: 2021-07-06 ~ 현재" className={input} />
              </label>
              <label className={label}>
                용도
                <input name="용도" placeholder="예: 기관제출용" className={input} />
              </label>
              <label className={label}>
                비고
                <input name="비고" className={input} />
              </label>
              <button type="submit" className={`${btn} w-fit`}>신청 등록</button>
            </form>
          </FormToggle>

          <FormToggle label="상장 등록" buttonLabel="+ 상장 등록">
            <form action={addAwardAction} className="flex flex-col gap-3">
              <label className={label}>
                대상자성명
                <input name="대상자성명" required className={input} />
              </label>
              <label className={label}>
                대상자소속
                <input name="대상자소속" className={input} />
              </label>
              <label className={label}>
                사업명 / 수여사유
                <input name="용도" required className={input} />
              </label>
              <label className={label}>
                발급일 (미입력 시 오늘)
                <input type="date" name="발급일" className={input} />
              </label>
              <label className={label}>
                비고
                <input name="비고" className={input} />
              </label>
              <button type="submit" className={`${btn} w-fit`}>상장 등록</button>
            </form>
          </FormToggle>
        </div>
      </div>

      <div className={cardTableWrap}>
        <table className={tableClean}>
          <thead>
            <tr>
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
                <td className={tdClean}>{r.문서번호 ? `제 ${r.문서번호}호` : '(미채번)'}</td>
                <td className={tdClean}>{r.구분}{r.종류 ? ` · ${r.종류}` : ''}</td>
                <td className={tdClean}>{r.대상자성명}</td>
                <td className={tdClean}>{[r.대상자소속, r.대상자직위].filter(Boolean).join(' · ')}</td>
                <td className={tdClean}>{r.용도}</td>
                <td className={tdClean}>
                  <span className={`${badgeBase} ${badgeTone[STATUS_TONE[r.결재상태] ?? 'gray']}`}>{r.결재상태}</span>
                </td>
                <td className={tdClean}>{r.발급일}</td>
                <td className={tdClean}>{r.등록일시}</td>
                <td className={tdClean}>
                  {r.결재상태 === '승인' && r.구분 === '증명서' && (
                    <Link href={`/print/certificate?id=${r.id}`} className="text-brand hover:underline">인쇄</Link>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={9} className={`${tdClean} text-center text-zinc-400`}>등록된 발급 내역이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
