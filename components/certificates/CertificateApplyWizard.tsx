'use client';

import { useMemo, useState } from 'react';
import { btn, input, label } from '@/lib/ui';
import StaffPicker from '@/components/duty/StaffPicker';

const ORG_NAME = '서대문노인종합복지관';
const EXCLUDED_TEAMS = ['요양센터', '데이케어센터'];

type DocType = '재직증명서' | '경력증명서' | '상장';
type WhoType = 'staff' | 'instructor';
type RegisteredType = 'registered' | 'unregistered';
type ReceiveMethod = 'email' | 'inperson';

type Fields = {
  성명: string;
  소속: string;
  직위: string;
  담당업무: string;
  기간: string;
  생년월일: string;
  성별: string;
  주소: string;
  퇴직사유: string;
  용도: string;
};

const EMPTY_FIELDS: Fields = {
  성명: '', 소속: ORG_NAME, 직위: '', 담당업무: '', 기간: '',
  생년월일: '', 성별: '남', 주소: '', 퇴직사유: '', 용도: '',
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// 실제 주민등록번호는 저장하지 않고, 생년월일+성별로 문서에 찍히는 마스킹된 형태만 재현한다.
function maskedResidentNumber(birth: string, gender: string): string {
  if (!birth) return '';
  const [y, m, d] = birth.split('-');
  if (!y || !m || !d) return '';
  const yy = y.slice(2);
  const isBefore2000 = Number(y) < 2000;
  const genderDigit = gender === '여' ? (isBefore2000 ? '2' : '4') : (isBefore2000 ? '1' : '3');
  return `${yy}${m}${d}-${genderDigit}******`;
}

const DOC_TYPES: { value: DocType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: '재직증명서',
    label: '재직증명서',
    desc: '현재 재직 중인 직원·강사',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
        <circle cx="12" cy="8" r="3.4" />
        <path strokeLinecap="round" d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </svg>
    ),
  },
  {
    value: '경력증명서',
    label: '경력증명서',
    desc: '퇴사한 직원·강사',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
        <rect x="3.5" y="7" width="17" height="12" rx="2" />
        <path strokeLinecap="round" d="M8 7V5.5A1.5 1.5 0 019.5 4h5A1.5 1.5 0 0116 5.5V7" />
        <path strokeLinecap="round" d="M3.5 12h17" />
      </svg>
    ),
  },
  {
    value: '상장',
    label: '상장 발급',
    desc: '어르신·자원봉사자·기타',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
        <circle cx="12" cy="8.5" r="5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.8L7 21l5-2.6L17 21l-2-8.2" />
      </svg>
    ),
  },
];

function DocTypeCard({
  active, onClick, docType,
}: { active: boolean; onClick: () => void; docType: (typeof DOC_TYPES)[number] }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-1 items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all ${
        active
          ? 'border-brand bg-brand-tint shadow-[0_2px_12px_rgba(20,121,186,0.15)]'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active ? 'bg-brand text-white' : 'bg-zinc-100 text-zinc-400 group-hover:text-zinc-500 dark:bg-zinc-800'
        }`}
      >
        {docType.icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-[15px] font-semibold ${active ? 'text-brand-dark dark:text-brand' : 'text-zinc-800 dark:text-zinc-100'}`}>
          {docType.label}
        </span>
        <span className="block truncate text-xs text-zinc-400 dark:text-zinc-500">{docType.desc}</span>
      </span>
    </button>
  );
}

function ButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
      {children}
    </div>
  );
}

function PillButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
        active
          ? 'bg-white text-brand shadow-sm dark:bg-zinc-800'
          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">{title}</p>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function PreviewRow({ label: rowLabel, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-zinc-100 py-2.5 last:border-b-0 dark:border-zinc-800">
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-400">{rowLabel}</span>
      <span className="flex-1 text-[14px] font-medium text-zinc-800 dark:text-zinc-100">{value || <span className="text-zinc-300 dark:text-zinc-700">-</span>}</span>
    </div>
  );
}

// 사용자가 작성한 재직/경력증명서 양식(인적사항 · 재직사항 그룹)을 그대로 재현한 읽기전용 미리보기.
function DocPreview({ title, kind, fields }: { title: string; kind: '재직증명서' | '경력증명서'; fields: Fields }) {
  return (
    <div>
      <p className="text-center text-[11px] tracking-[0.3em] text-zinc-300">CERTIFICATE</p>
      <h2 className="mt-2 text-center text-[26px] font-bold tracking-[0.5em] text-zinc-900 dark:text-zinc-50" style={{ textIndent: '0.5em' }}>
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-14 bg-zinc-300 dark:bg-zinc-700" />

      <div className="mt-8">
        <PreviewRow label="성명" value={fields.성명} />
        <PreviewRow label="주민번호" value={maskedResidentNumber(fields.생년월일, fields.성별)} />
        <PreviewRow label="주소" value={fields.주소} />
      </div>

      <div className="mt-6">
        <PreviewRow label="소속" value={fields.소속} />
        <PreviewRow label="직위" value={fields.직위} />
        <PreviewRow label="기간" value={fields.기간} />
        <PreviewRow label="담당업무" value={fields.담당업무} />
        {kind === '경력증명서' && <PreviewRow label="퇴직사유" value={fields.퇴직사유} />}
      </div>

      <div className="mt-6">
        <PreviewRow label="용도" value={fields.용도} />
      </div>

      <p className="mt-10 text-center text-[14.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        위 사실을 증명합니다.
      </p>

      <div className="mt-14 rounded-lg bg-zinc-50 py-5 text-center text-[11px] text-zinc-400 dark:bg-zinc-800/60">
        발급일 · 직인 · QR코드는 관장 최종승인 후 발행 시 자동으로 채워집니다.
      </div>
    </div>
  );
}

export default function CertificateApplyWizard({
  certificateAction,
  awardAction,
  staff,
}: {
  certificateAction: (formData: FormData) => void;
  awardAction: (formData: FormData) => void;
  staff: Record<string, string>[];
}) {
  const pickableStaff = useMemo(
    () => staff.filter((s) => !EXCLUDED_TEAMS.includes(s.소속팀)),
    [staff]
  );

  const [docType, setDocType] = useState<DocType | null>(null);
  const [who, setWho] = useState<WhoType | null>(null);
  const [registered, setRegistered] = useState<RegisteredType | null>(null);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>('email');

  const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
  const [신청일, set신청일] = useState(todayISO());
  const [이메일, set이메일] = useState('');
  const [비고, set비고] = useState('');

  function setField<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function selectDocType(next: DocType) {
    setDocType(next);
    setWho(null);
    setRegistered(null);
    setFields(EMPTY_FIELDS);
  }

  function selectWho(next: WhoType) {
    setWho(next);
    setRegistered(null);
    setFields(EMPTY_FIELDS);
  }

  function pickStaffMember(s: Record<string, string>) {
    setFields((f) => ({
      ...f,
      성명: s.성명 ?? '',
      소속: ORG_NAME,
      직위: s['직급/직책'] ?? '',
      담당업무: s.담당사업 ?? '',
      기간: s.입사일 ? `${s.입사일} ~ ${docType === '경력증명서' ? (s.퇴사일 || '퇴사일') : '현재'}` : f.기간,
    }));
  }

  // 어떤 화면이 확정됐는지에 따라 문서 제목/신청유형/필드 노출 범위/제출버튼 문구를 정한다.
  const resolved = useMemo(() => {
    if (docType === '재직증명서' && who === 'staff') {
      return { kind: '재직증명서' as const, 신청유형: '재직증명서(직원)', minimal: false, needStaffPicker: true, submitLabel: '재직증명서 신청하기' };
    }
    if (docType === '재직증명서' && who === 'instructor') {
      return { kind: '재직증명서' as const, 신청유형: '재직증명서(강사)', minimal: false, needStaffPicker: false, submitLabel: '재직증명서 신청하기' };
    }
    if (docType === '경력증명서' && who === 'staff' && registered === 'registered') {
      return { kind: '경력증명서' as const, 신청유형: '경력증명서(직원-희망이음등록)', minimal: true, needStaffPicker: true, submitLabel: '경력증명서 신청하기' };
    }
    if (docType === '경력증명서' && who === 'staff' && registered === 'unregistered') {
      return { kind: '경력증명서' as const, 신청유형: '경력증명서(직원-희망이음미등록)', minimal: false, needStaffPicker: false, submitLabel: '경력증명서 신청' };
    }
    if (docType === '경력증명서' && who === 'instructor') {
      return { kind: '경력증명서' as const, 신청유형: '경력증명서(강사)', minimal: false, needStaffPicker: false, submitLabel: '경력증명서 신청' };
    }
    return null;
  }, [docType, who, registered]);

  return (
    <div className="mb-6">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        {DOC_TYPES.map((dt) => (
          <DocTypeCard key={dt.value} docType={dt} active={docType === dt.value} onClick={() => selectDocType(dt.value)} />
        ))}
      </div>

      {(docType === '재직증명서' || docType === '경력증명서') && (
        <div className="mb-3">
          <ButtonGroup>
            <PillButton active={who === 'staff'} onClick={() => selectWho('staff')}>복지관·생활지원사 직원</PillButton>
            <PillButton active={who === 'instructor'} onClick={() => selectWho('instructor')}>강사</PillButton>
          </ButtonGroup>
        </div>
      )}
      {docType === '경력증명서' && who === 'staff' && (
        <div className="mb-3">
          <ButtonGroup>
            <PillButton active={registered === 'registered'} onClick={() => setRegistered('registered')}>희망이음 등록</PillButton>
            <PillButton active={registered === 'unregistered'} onClick={() => setRegistered('unregistered')}>희망이음 미등록</PillButton>
          </ButtonGroup>
        </div>
      )}

      {docType === '상장' && <AwardForm action={awardAction} />}

      {docType !== '상장' && resolved && (
        <form action={certificateAction} className="flex items-start gap-6">
          <input type="hidden" name="종류" value={resolved.kind} />
          <input type="hidden" name="신청유형" value={resolved.신청유형} />
          <input type="hidden" name="대상자성명" value={fields.성명} />
          <input type="hidden" name="대상자소속" value={fields.소속} />
          <input type="hidden" name="대상자직위" value={fields.직위} />
          <input type="hidden" name="담당업무" value={fields.담당업무} />
          <input type="hidden" name="근무기간" value={fields.기간} />
          <input type="hidden" name="생년월일" value={fields.생년월일} />
          <input type="hidden" name="성별" value={fields.성별} />
          <input type="hidden" name="대상자주소" value={fields.주소} />
          {resolved.kind === '경력증명서' && <input type="hidden" name="퇴직사유" value={fields.퇴직사유} />}
          <input type="hidden" name="용도" value={fields.용도} />
          {who === 'instructor' && (
            <input type="hidden" name="수령방법" value={receiveMethod === 'email' ? '이메일' : '직접수령'} />
          )}

          <div className="w-[340px] shrink-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Section title="신청 정보">
              <label className={`${label} mb-3`}>
                신청일
                <input type="date" className={input} value={신청일} onChange={(e) => set신청일(e.target.value)} />
                <input type="hidden" name="신청일" value={신청일} />
              </label>

              {resolved.needStaffPicker ? (
                <div className="mb-1">
                  <p className={label}>직원 선택 (선택 시 자동 입력, 요양센터·데이케어센터 제외)</p>
                  <StaffPicker staff={pickableStaff} name="staffPick" onSelect={pickStaffMember} />
                </div>
              ) : (
                <label className={label}>
                  대상자 성명
                  <input className={input} value={fields.성명} onChange={(e) => setField('성명', e.target.value)} />
                </label>
              )}
            </Section>

            {!resolved.minimal && (
              <Section title="인적사항 · 재직사항">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <label className={`${label} flex-1`}>
                      생년월일
                      <input type="date" className={input} value={fields.생년월일} onChange={(e) => setField('생년월일', e.target.value)} />
                    </label>
                    <label className={`${label} w-24 shrink-0`}>
                      성별
                      <select className={input} value={fields.성별} onChange={(e) => setField('성별', e.target.value)}>
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </label>
                  </div>
                  <label className={label}>
                    주소
                    <input className={input} value={fields.주소} onChange={(e) => setField('주소', e.target.value)} />
                  </label>
                  {!resolved.needStaffPicker && (
                    <>
                      <label className={label}>
                        소속
                        <input className={input} value={fields.소속} onChange={(e) => setField('소속', e.target.value)} />
                      </label>
                      <label className={label}>
                        직위
                        <input className={input} value={fields.직위} onChange={(e) => setField('직위', e.target.value)} />
                      </label>
                    </>
                  )}
                  <label className={label}>
                    기간
                    <input className={input} placeholder="예: 2020년 03월 01일 ~ 현재" value={fields.기간} onChange={(e) => setField('기간', e.target.value)} />
                  </label>
                  <label className={label}>
                    담당업무
                    <input className={input} value={fields.담당업무} onChange={(e) => setField('담당업무', e.target.value)} />
                  </label>
                  {resolved.kind === '경력증명서' && (
                    <label className={label}>
                      퇴직사유
                      <input className={input} value={fields.퇴직사유} onChange={(e) => setField('퇴직사유', e.target.value)} />
                    </label>
                  )}
                </div>
              </Section>
            )}

            <Section title="발급 정보">
              <div className="space-y-3">
                <label className={label}>
                  용도
                  <input className={input} placeholder="예: 기관제출용" value={fields.용도} onChange={(e) => setField('용도', e.target.value)} />
                </label>
                {who === 'instructor' && (
                  <label className={label}>
                    수령방법
                    <select className={input} value={receiveMethod} onChange={(e) => setReceiveMethod(e.target.value as ReceiveMethod)}>
                      <option value="email">이메일로 수령</option>
                      <option value="inperson">직접 수령</option>
                    </select>
                  </label>
                )}
                {(who !== 'instructor' || receiveMethod === 'email') && (
                  <label className={label}>
                    발급받을 이메일
                    <input type="email" name="대상자이메일" className={input} value={이메일} onChange={(e) => set이메일(e.target.value)} />
                  </label>
                )}
                <label className={label}>
                  비고사항
                  <input name="비고" className={input} value={비고} onChange={(e) => set비고(e.target.value)} />
                </label>
              </div>
            </Section>

            <button type="submit" className={`${btn} mt-5 w-full`}>{resolved.submitLabel}</button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-[560px] rounded-2xl bg-zinc-100 p-6 dark:bg-black/20 sm:p-10">
              <div className="rounded-sm border border-zinc-200 bg-white p-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
                <div className="border border-zinc-100 p-8 dark:border-zinc-800">
                  <DocPreview title={resolved.kind} kind={resolved.kind} fields={fields} />
                </div>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

function AwardForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="flex max-w-md flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <label className={label}>
        대상자
        <input name="대상자성명" required className={input} />
      </label>
      <label className={label}>
        구분
        <select name="종류" className={input} defaultValue="어르신">
          <option value="어르신">어르신</option>
          <option value="자원봉사자">자원봉사자</option>
          <option value="기타">기타</option>
        </select>
      </label>
      <label className={label}>
        발급일 (미입력 시 오늘)
        <input type="date" name="발급일" className={input} />
      </label>
      <label className={label}>
        발급목적
        <input name="용도" required className={input} />
      </label>
      <label className={label}>
        비고
        <input name="비고" className={input} />
      </label>
      <button type="submit" className={`${btn} w-fit`}>상장 등록</button>
    </form>
  );
}
