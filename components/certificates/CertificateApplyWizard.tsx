'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { btn, btnOutline, card, input, label } from '@/lib/ui';
import Modal from '@/components/Modal';
import StaffPicker from '@/components/duty/StaffPicker';
import { AWARD_TARGET_KINDS, AWARD_TYPES } from '@/lib/certificateTypes';

const EXCLUDED_TEAMS = ['요양센터', '데이케어센터'];

// 신청/등록 서버 액션은 성공 시 void를 반환해서, 폼 제출이 실제로 반영됐는지 화면만 봐서는
// 알기 어렵다 — useActionState로 감싸서 매 성공마다 바뀌는 토큰을 만들고, 그 변화를 감지해
// "완료" 모달을 띄운다.
function useActionSuccess(action: (formData: FormData) => void | Promise<void>) {
  const [token, dispatch] = useActionState(async (_prev: number, formData: FormData) => {
    await action(formData);
    return Date.now();
  }, 0);
  const [show, setShow] = useState(false);
  const prevToken = useRef(token);
  useEffect(() => {
    if (token !== prevToken.current) {
      prevToken.current = token;
      setShow(true);
    }
  }, [token]);
  return { formAction: dispatch, show, dismiss: () => setShow(false) };
}

type DocType = '재직증명서' | '경력증명서' | '상장';
type WhoType = 'staff' | 'instructor';
type InstructorType = '강사' | '생활지원사';
type ReceiveMethod = 'email' | 'inperson';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatKoreanDate(iso: string): string {
  const [y, m, d] = (iso || '').split('-');
  if (!y || !m || !d) return '';
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

const DOC_TYPES: { value: DocType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: '재직증명서',
    label: '재직증명서',
    desc: '현재 재직 중인 직원·강사·생활지원사',
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
    desc: '퇴사한 직원·강사·생활지원사',
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
      className={`group flex w-full items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-all ${
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
  const directorName = useMemo(
    () => staff.find((s) => s['재직상태'] === '재직' && s['직급/직책'] === '관장')?.['성명'] ?? '',
    [staff]
  );
  const certSuccess = useActionSuccess(certificateAction);

  const [docType, setDocType] = useState<DocType | null>(null);
  const [who, setWho] = useState<WhoType | null>(null);
  const [instructorType, setInstructorType] = useState<InstructorType | null>(null);
  const [receiveMethod, setReceiveMethod] = useState<ReceiveMethod>('email');

  const [성명, set성명] = useState('');
  const [pickedStaff, setPickedStaff] = useState<Record<string, string> | null>(null);
  const [소속부서, set소속부서] = useState('');
  const [직위, set직위] = useState('');
  const [근무시작일, set근무시작일] = useState('');
  const [근무종료일, set근무종료일] = useState('');
  const [신청일, set신청일] = useState(todayISO());
  const [이메일, set이메일] = useState('');
  const [비고, set비고] = useState('');

  function resetInstructorFields() {
    set성명('');
    setPickedStaff(null);
    set소속부서('');
    set직위('');
    set근무시작일('');
    set근무종료일('');
  }

  function selectDocType(next: DocType) {
    setDocType(next);
    setWho(null);
    setInstructorType(null);
    resetInstructorFields();
  }

  function selectWho(next: WhoType) {
    setWho(next);
    setInstructorType(null);
    resetInstructorFields();
  }

  function pickStaffMember(s: Record<string, string>) {
    setPickedStaff(s);
    set성명(s.성명 ?? '');
  }

  // 강사·생활지원사는 직원명부(StaffPicker)에 없어서 이름/소속부서/직위를 본인이 직접 적는다.
  // 강사는 재직기간(재직증명서)·경력기간(경력증명서)도 직접 날짜로 적어야 한다.
  const 근무기간 = instructorType === '강사' && 근무시작일
    ? `${formatKoreanDate(근무시작일)} ~ ${docType === '재직증명서' ? '현재' : (근무종료일 ? formatKoreanDate(근무종료일) : '')}`
    : '';

  // 어떤 화면이 확정됐는지에 따라 문서 제목/신청유형/직원선택 여부/제출버튼 문구를 정한다.
  const resolved = useMemo(() => {
    if (docType === '재직증명서' && who === 'staff') {
      return { kind: '재직증명서' as const, 신청유형: '재직증명서(직원)', needStaffPicker: true, submitLabel: '재직증명서 신청하기' };
    }
    if (docType === '재직증명서' && who === 'instructor' && instructorType) {
      return { kind: '재직증명서' as const, 신청유형: `재직증명서(${instructorType})`, needStaffPicker: false, submitLabel: '재직증명서 신청하기' };
    }
    if (docType === '경력증명서' && who === 'staff') {
      // 신청 시점엔 본인도 희망이음 등록 여부를 정확히 모르는 경우가 많고, 이미 퇴사해 직원명부에도
      // 없을 수 있어 강사·생활지원사처럼 본인이 직접 입력한다. 희망이음 등록 여부는 실제로 그
      // 시스템에 접근권한이 있는 서무/회계가 "발급 처리" 단계에서 판단한다.
      return { kind: '경력증명서' as const, 신청유형: '경력증명서(직원)', needStaffPicker: false, submitLabel: '경력증명서 신청하기' };
    }
    if (docType === '경력증명서' && who === 'instructor' && instructorType) {
      return { kind: '경력증명서' as const, 신청유형: `경력증명서(${instructorType})`, needStaffPicker: false, submitLabel: '경력증명서 신청' };
    }
    return null;
  }, [docType, who, instructorType]);

  return (
    <div className="mb-6 flex items-start gap-6">
      <div className="flex w-64 shrink-0 flex-col gap-2">
        {DOC_TYPES.map((dt) => (
          <DocTypeCard key={dt.value} docType={dt} active={docType === dt.value} onClick={() => selectDocType(dt.value)} />
        ))}
      </div>

      <div className="min-w-0 flex-1">
      {!docType && (
        <div className={card}>
          <p className="text-sm text-zinc-400">왼쪽에서 신청할 문서 종류를 선택해주세요.</p>
        </div>
      )}

      {(docType === '재직증명서' || docType === '경력증명서') && (
        <div className="mb-3">
          <ButtonGroup>
            <PillButton active={who === 'staff'} onClick={() => selectWho('staff')}>복지관 직원</PillButton>
            <PillButton active={who === 'instructor'} onClick={() => selectWho('instructor')}>강사·생활지원사</PillButton>
          </ButtonGroup>
        </div>
      )}
      {(docType === '재직증명서' || docType === '경력증명서') && who === 'instructor' && (
        <div className="mb-3">
          <ButtonGroup>
            <PillButton active={instructorType === '강사'} onClick={() => setInstructorType('강사')}>강사</PillButton>
            <PillButton active={instructorType === '생활지원사'} onClick={() => setInstructorType('생활지원사')}>생활지원사</PillButton>
          </ButtonGroup>
        </div>
      )}
      {docType === '상장' && <AwardForm action={awardAction} directorName={directorName} />}

      {docType !== '상장' && resolved && (
        <form action={certSuccess.formAction} className="max-w-md">
          <input type="hidden" name="종류" value={resolved.kind} />
          <input type="hidden" name="신청유형" value={resolved.신청유형} />
          <input type="hidden" name="대상자성명" value={성명} />
          <input type="hidden" name="대상자소속" value={resolved.needStaffPicker ? '' : 소속부서} />
          <input type="hidden" name="대상자직위" value={resolved.needStaffPicker ? '' : 직위} />
          <input type="hidden" name="근무기간" value={근무기간} />
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
                <>
                  <label className={label}>
                    대상자 성명
                    <input required className={input} value={성명} onChange={(e) => set성명(e.target.value)} />
                  </label>
                  <label className={label}>
                    소속부서
                    <input required className={input} value={소속부서} onChange={(e) => set소속부서(e.target.value)} />
                  </label>
                  <label className={label}>
                    직위
                    <input required className={input} value={직위} onChange={(e) => set직위(e.target.value)} />
                  </label>
                  {instructorType === '강사' && (
                    <div className="flex gap-2">
                      <label className={`${label} flex-1`}>
                        {docType === '재직증명서' ? '재직기간 (시작일)' : '경력기간 (시작일)'}
                        <input type="date" required className={input} value={근무시작일} onChange={(e) => set근무시작일(e.target.value)} />
                      </label>
                      {docType === '경력증명서' && (
                        <label className={`${label} flex-1`}>
                          경력기간 (종료일)
                          <input type="date" required className={input} value={근무종료일} onChange={(e) => set근무종료일(e.target.value)} />
                        </label>
                      )}
                    </div>
                  )}
                </>
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

      {certSuccess.show && (
        <Modal title="신청 완료" onClose={certSuccess.dismiss}>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">신청이 정상적으로 접수되었습니다.</p>
          <button type="button" onClick={certSuccess.dismiss} className={`${btn} mt-4 w-full`}>확인</button>
        </Modal>
      )}
      </div>
    </div>
  );
}

// 실제 발행되는 PDF·인쇄화면(lib/pdf/awardPdf.tsx, app/print/award)과 같은 순서·비율로 구성한
// 미리보기 — 문서번호·직인·QR은 발급 전이라 실제 값 대신 자리표시자로 보여준다.
export function AwardPreview({
  kind, names, body, directorName,
}: { kind: string; names: string[]; body: string; directorName?: string }) {
  return (
    <div style={{ fontFamily: '"바탕체", "바탕", Batang, serif' }}>
      <p className="text-[11px] text-zinc-300 dark:text-zinc-600">제 ____ 호</p>

      <h2 className="mt-6 text-center text-[28px] font-bold tracking-[0.4em] text-zinc-900 dark:text-zinc-50" style={{ textIndent: '0.4em' }}>
        {kind || '상장'}
      </h2>

      <p className="mt-10 text-right text-[15px] tracking-[0.12em] text-zinc-800 dark:text-zinc-100">
        성 명 : {(names[0] || '대상자명') + (names.length > 1 ? ` 외 ${names.length - 1}명` : '')}
      </p>

      <p className="mt-8 whitespace-pre-wrap text-justify text-[13px] leading-loose text-zinc-600 dark:text-zinc-300" style={{ textIndent: '1.3em' }}>
        {body || '"본문 입력하기"로 작성하면 여기에 미리보기가 표시됩니다.'}
      </p>

      <div className="mt-10 text-center">
        <p className="text-[11px] text-zinc-300 dark:text-zinc-600">발급일 (발급승인 시 자동 기록)</p>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="text-[8px] leading-tight text-zinc-500 dark:text-zinc-400">사회복지<br />법 인</span>
          <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-200">새 문 안 교 회 사 회 복 지 재 단</span>
        </div>
        <p className="mt-2 text-[15px] font-bold text-zinc-800 dark:text-zinc-100">
          시립서대문노인종합복지관장{directorName ? ` ${directorName}` : ''}
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-zinc-200 text-[8px] text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500">QR</div>
        <p className="text-[10px] text-zinc-400">직인·QR코드는 발급승인 시 자동으로 채워집니다.</p>
      </div>
    </div>
  );
}

function AwardForm({ action, directorName }: { action: (formData: FormData) => void; directorName?: string }) {
  const awardSuccess = useActionSuccess(action);
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
    <div className="flex items-start gap-6">
      <form action={awardSuccess.formAction} className="w-[380px] shrink-0">
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
          </div>

          <label className={label}>
            비고
            <input name="비고" className={input} value={비고} onChange={(e) => set비고(e.target.value)} />
          </label>

          <button type="submit" className={`${btn} w-full`}>
            {names.length > 1 ? `상장 ${names.length}건 등록` : '상장 등록'}
          </button>
        </div>
      </form>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-[560px] rounded-2xl bg-zinc-100 p-6 dark:bg-black/20 sm:p-10">
          <div className="rounded-sm border border-zinc-200 bg-white p-3 shadow-[0_10px_40px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900">
            <div className="border border-zinc-100 p-8 dark:border-zinc-800">
              <AwardPreview kind={finalKind} names={names} body={본문} directorName={directorName} />
            </div>
          </div>
        </div>
      </div>

      {bodyModalOpen && (
        <Modal title="본문 입력하기" onClose={() => setBodyModalOpen(false)}>
          <textarea className={`${input} h-56 resize-none`} value={본문} onChange={(e) => set본문(e.target.value)} />
          <button type="button" onClick={() => setBodyModalOpen(false)} className={`${btn} mt-3 w-full`}>완료</button>
        </Modal>
      )}

      {awardSuccess.show && (
        <Modal title="등록 완료" onClose={awardSuccess.dismiss}>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {names.length > 1 ? `상장 ${names.length}건이 정상적으로 등록되었습니다.` : '상장이 정상적으로 등록되었습니다.'}
          </p>
          <button type="button" onClick={awardSuccess.dismiss} className={`${btn} mt-4 w-full`}>확인</button>
        </Modal>
      )}
    </div>
  );
}
