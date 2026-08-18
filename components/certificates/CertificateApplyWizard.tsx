'use client';

import { useMemo, useState } from 'react';
import { btn, btnOutline, card, input, label } from '@/lib/ui';
import Modal from '@/components/Modal';
import StaffPicker from '@/components/duty/StaffPicker';
import { AWARD_TARGET_KINDS, AWARD_TYPES } from '@/lib/certificateTypes';

const EXCLUDED_TEAMS = ['요양센터', '데이케어센터'];

type DocType = '재직증명서' | '경력증명서' | '상장';
type WhoType = 'staff' | 'instructor';
type RegisteredType = 'registered' | 'unregistered';
type ReceiveMethod = 'email' | 'inperson';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
      <div className="space-y-3">{children}</div>
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

  const [성명, set성명] = useState('');
  const [pickedStaff, setPickedStaff] = useState<Record<string, string> | null>(null);
  const [신청일, set신청일] = useState(todayISO());
  const [이메일, set이메일] = useState('');
  const [비고, set비고] = useState('');

  function selectDocType(next: DocType) {
    setDocType(next);
    setWho(null);
    setRegistered(null);
    set성명('');
    setPickedStaff(null);
  }

  function selectWho(next: WhoType) {
    setWho(next);
    setRegistered(null);
    set성명('');
    setPickedStaff(null);
  }

  function pickStaffMember(s: Record<string, string>) {
    setPickedStaff(s);
    set성명(s.성명 ?? '');
  }

  // 어떤 화면이 확정됐는지에 따라 문서 제목/신청유형/직원선택 여부/제출버튼 문구를 정한다.
  const resolved = useMemo(() => {
    if (docType === '재직증명서' && who === 'staff') {
      return { kind: '재직증명서' as const, 신청유형: '재직증명서(직원)', needStaffPicker: true, submitLabel: '재직증명서 신청하기' };
    }
    if (docType === '재직증명서' && who === 'instructor') {
      return { kind: '재직증명서' as const, 신청유형: '재직증명서(강사)', needStaffPicker: false, submitLabel: '재직증명서 신청하기' };
    }
    if (docType === '경력증명서' && who === 'staff' && registered === 'registered') {
      return { kind: '경력증명서' as const, 신청유형: '경력증명서(직원-희망이음등록)', needStaffPicker: true, submitLabel: '경력증명서 신청하기' };
    }
    if (docType === '경력증명서' && who === 'staff' && registered === 'unregistered') {
      return { kind: '경력증명서' as const, 신청유형: '경력증명서(직원-희망이음미등록)', needStaffPicker: true, submitLabel: '경력증명서 신청' };
    }
    if (docType === '경력증명서' && who === 'instructor') {
      return { kind: '경력증명서' as const, 신청유형: '경력증명서(강사)', needStaffPicker: false, submitLabel: '경력증명서 신청' };
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
        <form action={certificateAction} className="mx-auto max-w-md">
          <input type="hidden" name="종류" value={resolved.kind} />
          <input type="hidden" name="신청유형" value={resolved.신청유형} />
          <input type="hidden" name="대상자성명" value={성명} />
          <input type="hidden" name="신청일" value={신청일} />
          <input type="hidden" name="수령방법" value={receiveMethod === 'email' ? '이메일' : '직접수령'} />

          <div className={card}>
            <Section title="신청 정보">
              <label className={label}>
                신청일
                <input type="date" className={input} value={신청일} onChange={(e) => set신청일(e.target.value)} />
              </label>

              {resolved.needStaffPicker ? (
                <div>
                  <p className={label}>직원 선택 (요양센터·데이케어센터 제외)</p>
                  <StaffPicker staff={pickableStaff} name="staffPick" onSelect={pickStaffMember} />
                  {pickedStaff && (
                    <p className="mt-2 text-xs text-zinc-400">
                      {pickedStaff.소속팀} · {pickedStaff['직급/직책']}
                    </p>
                  )}
                </div>
              ) : (
                <label className={label}>
                  대상자 성명
                  <input className={input} value={성명} onChange={(e) => set성명(e.target.value)} />
                </label>
              )}
            </Section>

            <Section title="수령 방법">
              <label className={label}>
                발급받을 방법
                <select className={input} value={receiveMethod} onChange={(e) => setReceiveMethod(e.target.value as ReceiveMethod)}>
                  <option value="email">이메일로 수령</option>
                  <option value="inperson">직접 수령</option>
                </select>
              </label>
              {receiveMethod === 'email' && (
                <label className={label}>
                  발급받을 이메일
                  <input type="email" name="대상자이메일" className={input} value={이메일} onChange={(e) => set이메일(e.target.value)} />
                </label>
              )}
              <label className={label}>
                비고사항
                <input name="비고" className={input} value={비고} onChange={(e) => set비고(e.target.value)} />
              </label>
            </Section>

            <button type="submit" className={`${btn} mt-5 w-full`}>{resolved.submitLabel}</button>
          </div>
        </form>
      )}
    </div>
  );
}

function AwardForm({ action }: { action: (formData: FormData) => void }) {
  const [상장구분, set상장구분] = useState<string>(AWARD_TYPES[0]);
  const [상장구분기타, set상장구분기타] = useState('');
  const [대상자원본, set대상자원본] = useState('');
  const [대상자구분, set대상자구분] = useState<string>(AWARD_TARGET_KINDS[0]);
  const [용도, set용도] = useState('');
  const [본문, set본문] = useState('');
  const [비고, set비고] = useState('');
  const [bodyModalOpen, setBodyModalOpen] = useState(false);

  const names = useMemo(
    () => 대상자원본.split(',').map((s) => s.trim()).filter(Boolean),
    [대상자원본]
  );
  const finalKind = 상장구분 === '기타' ? (상장구분기타 || '기타') : 상장구분;

  function openBodyModal() {
    if (!본문) {
      set본문(`${names[0] || '000'}님께서는 ${용도 || '____'}하였기에 이 ${finalKind}을(를) 드립니다.`);
    }
    setBodyModalOpen(true);
  }

  return (
    <form action={action} className="mx-auto max-w-md">
      <input type="hidden" name="대상자성명" value={대상자원본} />
      <input type="hidden" name="종류" value={finalKind} />
      <input type="hidden" name="대상자구분" value={대상자구분} />
      <input type="hidden" name="본문" value={본문} />

      <div className={`${card} flex flex-col gap-4`}>
        <label className={label}>
          상장 구분
          <select className={input} value={상장구분} onChange={(e) => set상장구분(e.target.value)}>
            {AWARD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        {상장구분 === '기타' && (
          <label className={label}>
            상장 구분 (직접입력)
            <input className={input} value={상장구분기타} onChange={(e) => set상장구분기타(e.target.value)} />
          </label>
        )}

        <div>
          <label className={label}>
            대상자 (여러 명은 쉼표로 구분)
            <input
              className={input}
              placeholder="예: 홍길동, 김철수, 이영희"
              value={대상자원본}
              onChange={(e) => set대상자원본(e.target.value)}
              required
            />
          </label>
          {names.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {names.map((n, i) => (
                <span key={`${n}-${i}`} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs text-brand">{n}</span>
              ))}
              <span className="text-xs text-zinc-400">총 {names.length}명</span>
            </div>
          )}
        </div>

        <label className={label}>
          구분
          <select className={input} value={대상자구분} onChange={(e) => set대상자구분(e.target.value)}>
            {AWARD_TARGET_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>

        <label className={label}>
          수여사유
          <input
            name="용도"
            required
            className={input}
            placeholder="예: OOO 프로그램 이수"
            value={용도}
            onChange={(e) => set용도(e.target.value)}
          />
        </label>

        <div>
          <button type="button" onClick={openBodyModal} className={btnOutline}>
            {본문 ? '본문 수정하기' : '본문 입력하기'}
          </button>
          {본문 && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/50">{본문}</p>
          )}
        </div>

        <label className={label}>
          비고
          <input name="비고" className={input} value={비고} onChange={(e) => set비고(e.target.value)} />
        </label>

        <button type="submit" className={`${btn} w-full`}>
          {names.length > 1 ? `상장 ${names.length}건 등록` : '상장 등록'}
        </button>
      </div>

      {bodyModalOpen && (
        <Modal title="본문 입력하기" onClose={() => setBodyModalOpen(false)}>
          <textarea className={`${input} h-56 resize-none`} value={본문} onChange={(e) => set본문(e.target.value)} />
          <button type="button" onClick={() => setBodyModalOpen(false)} className={`${btn} mt-3 w-full`}>완료</button>
        </Modal>
      )}
    </form>
  );
}
