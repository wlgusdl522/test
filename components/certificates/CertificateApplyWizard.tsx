'use client';

import { useMemo, useState } from 'react';
import { btn, input, label } from '@/lib/ui';
import StaffPicker from '@/components/duty/StaffPicker';

const ORG_NAME = '서대문노인종합복지관';
const EXCLUDED_TEAMS = ['요양센터', '데이케어센터'];

type TopCategory = 'staff' | 'instructor' | 'award';
type StaffStatus = 'active' | 'resigned';
type ResignedType = 'registered' | 'unregistered';
type ReceiveMethod = 'email' | 'inperson';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function ButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
      {children}
    </div>
  );
}

function CategoryButton({
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

// 증명서 얼굴에 실제로 찍히는 값들 — 미리보기 안에서 바로 입력하도록 인풋으로 렌더링한다.
function DocPreview({
  title, fields, onChange, showSoso,
}: {
  title: string;
  fields: { 성명: string; 소속: string; 직위: string; 생년월일: string; 용도: string };
  onChange: (key: keyof typeof fields, value: string) => void;
  showSoso: 'fixed' | 'editable';
}) {
  const row = 'flex items-center gap-4 border-b border-zinc-100 py-3.5 last:border-b-0 dark:border-zinc-800';
  const rowLabel = 'w-20 shrink-0 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400';
  const rowValue =
    'flex-1 bg-transparent text-[15px] font-medium text-zinc-800 outline-none placeholder:font-normal placeholder:text-zinc-300 focus:text-brand dark:text-zinc-100';

  return (
    <div>
      <p className="text-center text-[11px] tracking-[0.3em] text-zinc-300">CERTIFICATE</p>
      <h2 className="mt-2 text-center text-[26px] font-bold tracking-[0.5em] text-zinc-900 dark:text-zinc-50" style={{ textIndent: '0.5em' }}>
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-14 bg-zinc-300 dark:bg-zinc-700" />

      <div className="mt-10">
        <div className={row}>
          <span className={rowLabel}>성명</span>
          <input className={rowValue} placeholder="이름을 입력하세요" value={fields.성명} onChange={(e) => onChange('성명', e.target.value)} />
        </div>
        <div className={row}>
          <span className={rowLabel}>소속</span>
          {showSoso === 'fixed' ? (
            <span className="flex-1 text-[15px] font-medium text-zinc-600 dark:text-zinc-300">{fields.소속}</span>
          ) : (
            <input className={rowValue} value={fields.소속} onChange={(e) => onChange('소속', e.target.value)} />
          )}
        </div>
        {showSoso === 'editable' && (
          <div className={row}>
            <span className={rowLabel}>직위</span>
            <input className={rowValue} value={fields.직위} onChange={(e) => onChange('직위', e.target.value)} />
          </div>
        )}
        {showSoso === 'editable' && (
          <div className={row}>
            <span className={rowLabel}>생년월일</span>
            <input type="date" className={rowValue} value={fields.생년월일} onChange={(e) => onChange('생년월일', e.target.value)} />
          </div>
        )}
        <div className={row}>
          <span className={rowLabel}>용도</span>
          <input className={rowValue} placeholder="제출처 등" value={fields.용도} onChange={(e) => onChange('용도', e.target.value)} />
        </div>
      </div>

      <p className="mt-12 text-center text-[14.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        위 내용을 증명합니다.
      </p>

      {/* 결재란 없음 — 결재는 신청 후 별도 결재함에서 진행되고, 실제 발급 PDF에도 결재란은 나오지 않는다. */}
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
  const [top, setTop] = useState<TopCategory | null>(null);
  const [staffStatus, setStaffStatus] = useState<StaffStatus | null>(null);
  const [resignedType, setResignedType] = useState<ResignedType | null>(null);
  const [instructorStatus, setInstructorStatus] = useState<StaffStatus>('active');
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>('email');

  const [fields, setFields] = useState({ 성명: '', 소속: ORG_NAME, 직위: '', 생년월일: '', 용도: '' });
  const [신청일, set신청일] = useState(todayISO());
  const [이메일, set이메일] = useState('');
  const [비고, set비고] = useState('');

  function setField(key: keyof typeof fields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function selectTop(next: TopCategory) {
    setTop(next);
    setStaffStatus(null);
    setResignedType(null);
    setFields({ 성명: '', 소속: ORG_NAME, 직위: '', 생년월일: '', 용도: '' });
  }

  // 어떤 화면이 확정됐는지에 따라 문서 제목/종류/신청유형/소속 표시방식을 결정한다.
  const resolved = useMemo(() => {
    if (top === 'staff' && staffStatus === 'active') {
      return { title: '재직증명서', kind: '재직증명서', 신청유형: '재직증명서(재직중)', showSoso: 'fixed' as const, submitLabel: '재직증명서 신청하기', ready: true };
    }
    if (top === 'staff' && staffStatus === 'resigned' && resignedType === 'registered') {
      return { title: '경력증명서', kind: '경력증명서', 신청유형: '경력증명서(희망이음 등록)', showSoso: 'fixed' as const, submitLabel: '경력증명서 신청하기', ready: true };
    }
    if (top === 'staff' && staffStatus === 'resigned' && resignedType === 'unregistered') {
      return { title: '경력증명서', kind: '경력증명서', 신청유형: '경력증명서(희망이음 미등록)', showSoso: 'editable' as const, submitLabel: '경력증명서 신청', ready: true };
    }
    if (top === 'instructor') {
      const kind = instructorStatus === 'active' ? '재직증명서' : '경력증명서';
      return { title: kind, kind, 신청유형: `${kind}(강사-${instructorStatus === 'active' ? '재직' : '퇴사'})`, showSoso: 'editable' as const, submitLabel: '신청하기', ready: true };
    }
    return null;
  }, [top, staffStatus, resignedType, instructorStatus]);

  return (
    <div className="mb-6">
      <div className="mb-3">
        <ButtonGroup>
          <CategoryButton active={top === 'staff'} onClick={() => selectTop('staff')}>복지관·생활지원사 직원</CategoryButton>
          <CategoryButton active={top === 'instructor'} onClick={() => selectTop('instructor')}>강사</CategoryButton>
          <CategoryButton active={top === 'award'} onClick={() => selectTop('award')}>상장</CategoryButton>
        </ButtonGroup>
      </div>

      {top === 'staff' && (
        <div className="mb-3">
          <ButtonGroup>
            <CategoryButton active={staffStatus === 'active'} onClick={() => { setStaffStatus('active'); setResignedType(null); }}>현재 재직중</CategoryButton>
            <CategoryButton active={staffStatus === 'resigned'} onClick={() => setStaffStatus('resigned')}>퇴사</CategoryButton>
          </ButtonGroup>
        </div>
      )}
      {top === 'staff' && staffStatus === 'resigned' && (
        <div className="mb-3">
          <ButtonGroup>
            <CategoryButton active={resignedType === 'registered'} onClick={() => setResignedType('registered')}>희망이음 등록</CategoryButton>
            <CategoryButton active={resignedType === 'unregistered'} onClick={() => setResignedType('unregistered')}>희망이음 미등록</CategoryButton>
          </ButtonGroup>
        </div>
      )}

      {top === 'award' && (
        <AwardForm action={awardAction} />
      )}

      {top !== 'award' && resolved && (
        <form action={certificateAction} className="flex items-start gap-6">
          <input type="hidden" name="종류" value={resolved.kind} />
          <input type="hidden" name="신청유형" value={resolved.신청유형} />
          <input type="hidden" name="대상자성명" value={fields.성명} />
          <input type="hidden" name="대상자소속" value={fields.소속} />
          <input type="hidden" name="대상자직위" value={fields.직위} />
          <input type="hidden" name="생년월일" value={fields.생년월일} />
          <input type="hidden" name="용도" value={fields.용도} />
          {top === 'instructor' && (
            <input type="hidden" name="수령방법" value={receiveMethod === 'email' ? '이메일' : '직접수령'} />
          )}

          <div className="w-[320px] shrink-0 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            {(staffStatus === 'active' || resignedType === 'registered') && (
              <div className="mb-3">
                <p className={label}>직원 선택 (선택 시 이름 자동 입력, 요양센터·데이케어센터 제외)</p>
                <StaffPicker
                  staff={pickableStaff}
                  name="staffPick"
                  onSelect={(s) => setField('성명', s.성명)}
                />
              </div>
            )}
            <label className={label}>
              신청일
              <input type="date" className={input} value={신청일} onChange={(e) => set신청일(e.target.value)} />
              <input type="hidden" name="신청일" value={신청일} />
            </label>
            {(!staffStatus || resignedType === 'unregistered' || top === 'instructor') && (
              <>
                {top !== 'instructor' && (
                  <label className={`${label} mt-3`}>
                    종사자 이름
                    <input className={input} value={fields.성명} onChange={(e) => setField('성명', e.target.value)} />
                  </label>
                )}
                {top === 'instructor' && (
                  <>
                    <label className={`${label} mt-3`}>
                      재직/퇴사 구분
                      <select className={input} value={instructorStatus} onChange={(e) => setInstructorStatus(e.target.value as StaffStatus)}>
                        <option value="active">재직 (재직증명서)</option>
                        <option value="resigned">퇴사 (경력증명서)</option>
                      </select>
                    </label>
                    <label className={`${label} mt-3`}>
                      대상자 성명
                      <input className={input} value={fields.성명} onChange={(e) => setField('성명', e.target.value)} />
                    </label>
                  </>
                )}
              </>
            )}
            <label className={`${label} mt-3`}>
              발급받을 이메일
              {top === 'instructor' && (
                <select className={`${input} mb-1.5`} value={receiveMethod} onChange={(e) => setReceiveMethod(e.target.value as ReceiveMethod)}>
                  <option value="email">이메일로 수령</option>
                  <option value="inperson">직접 수령</option>
                </select>
              )}
              {(top !== 'instructor' || receiveMethod === 'email') && (
                <input type="email" name="대상자이메일" className={input} value={이메일} onChange={(e) => set이메일(e.target.value)} />
              )}
            </label>
            <label className={`${label} mt-3`}>
              비고사항
              <input name="비고" className={input} value={비고} onChange={(e) => set비고(e.target.value)} />
            </label>
            <button type="submit" className={`${btn} mt-4 w-full`}>{resolved.submitLabel}</button>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mx-auto max-w-[560px] rounded-2xl bg-zinc-100 p-6 dark:bg-black/20 sm:p-10">
              <div className="rounded-sm border border-zinc-200 bg-white p-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
                <div className="border border-zinc-100 p-8 dark:border-zinc-800">
                  <DocPreview title={resolved.title} fields={fields} onChange={setField} showSoso={resolved.showSoso} />
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
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 max-w-md">
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
