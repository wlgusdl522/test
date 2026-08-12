'use client';

import { useState } from 'react';
import { btn, card, input, label } from '@/lib/ui';

type FormState = {
  대상자성명: string;
  대상자소속: string;
  대상자직위: string;
  종류: string;
  근무기간: string;
  용도: string;
  대상자이메일: string;
  비고: string;
};

const EMPTY: FormState = {
  대상자성명: '', 대상자소속: '', 대상자직위: '', 종류: '',
  근무기간: '', 용도: '', 대상자이메일: '', 비고: '',
};

const VERIFY_PHRASE: Record<string, string> = {
  재직증명서: '위와 같이 재직하고 있음을 증명합니다.',
  경력증명서: '위와 같이 근무한 경력이 있음을 증명합니다.',
  원천징수영수증: '위 내용을 확인합니다.',
  기타: '위 내용을 확인합니다.',
};

export default function CertificateFormSplit({
  action,
  staffPicker,
  types,
}: {
  action: (formData: FormData) => void;
  staffPicker: React.ReactNode;
  types: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<FormState>(EMPTY);

  function set<K extends keyof FormState>(key: K, value: string) {
    setV((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="mb-5">
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={() => setOpen((o) => !o)} className={btn}>
          {open ? '접기 ▲' : '+ 증명서 신청 등록'}
        </button>
      </div>

      {open && (
        <div className="flex items-start gap-6">
          <form action={action} className={`${card} w-[360px] shrink-0 flex flex-col gap-3`}>
            <div>
              <p className={label}>희망이음 미등록자(옛 퇴사자·강사)면 직원 선택, 아니면 아래 칸에 직접 입력</p>
              {staffPicker}
            </div>
            <label className={label}>
              대상자성명 (직접입력, 미선택 시 필수)
              <input name="대상자성명" className={input} value={v.대상자성명} onChange={(e) => set('대상자성명', e.target.value)} />
            </label>
            <label className={label}>
              대상자소속 (직접입력)
              <input name="대상자소속" className={input} value={v.대상자소속} onChange={(e) => set('대상자소속', e.target.value)} />
            </label>
            <label className={label}>
              대상자직위
              <input name="대상자직위" className={input} value={v.대상자직위} onChange={(e) => set('대상자직위', e.target.value)} />
            </label>
            <label className={label}>
              대상자이메일 (발급 완료 시 이 주소로 메일이 발송됩니다)
              <input type="email" name="대상자이메일" className={input} value={v.대상자이메일} onChange={(e) => set('대상자이메일', e.target.value)} />
            </label>
            <label className={label}>
              종류
              <select name="종류" className={input} required value={v.종류} onChange={(e) => set('종류', e.target.value)}>
                <option value="" disabled>선택</option>
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              근무기간 (재직/경력증명서용)
              <input name="근무기간" placeholder="예: 2021-07-06 ~ 현재" className={input} value={v.근무기간} onChange={(e) => set('근무기간', e.target.value)} />
            </label>
            <label className={label}>
              용도
              <input name="용도" placeholder="예: 기관제출용" className={input} value={v.용도} onChange={(e) => set('용도', e.target.value)} />
            </label>
            <label className={label}>
              비고
              <input name="비고" className={input} value={v.비고} onChange={(e) => set('비고', e.target.value)} />
            </label>
            <button type="submit" className={`${btn} w-fit`}>신청 등록</button>
          </form>

          <div className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="mb-3 text-xs font-medium text-zinc-400">미리보기 — 발행 전까지 문서번호/QR은 부여되지 않습니다.</p>
            <CertificatePreviewDoc values={v} />
          </div>
        </div>
      )}
    </div>
  );
}

function CertificatePreviewDoc({ values: v }: { values: FormState }) {
  const lbl = 'border border-[#333] bg-[#f2f2f2] font-semibold text-center whitespace-nowrap px-2.5';
  const cell = 'border border-[#333] px-2.5 py-2';

  return (
    <div style={{ fontSize: 13.5, color: '#000' }} className="mx-auto w-full max-w-[186mm] bg-white">
      <div className="mb-2 flex items-start justify-between">
        <div className="text-xs text-zinc-400">제 (발행 시 부여)호</div>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td className={`${lbl} w-6 py-1`} rowSpan={2}>결<br />재</td>
              {['서무', '과장', '부장', '관장'].map((r) => (
                <td key={r} className={`${lbl} w-14 py-1 text-[11px]`}>{r}</td>
              ))}
            </tr>
            <tr>
              {['서무', '과장', '부장', '관장'].map((r) => (
                <td key={r} className={cell} style={{ height: 34 }} />
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="my-8 text-center text-2xl" style={{ letterSpacing: 12 }}>
        {v.종류 || '증 명 서'}
      </h2>

      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td className={`${lbl} w-32`}>성&nbsp;&nbsp;&nbsp;&nbsp;명</td><td className={cell}>{v.대상자성명}</td></tr>
          <tr><td className={lbl}>소&nbsp;&nbsp;&nbsp;&nbsp;속</td><td className={cell}>{v.대상자소속}</td></tr>
          <tr><td className={lbl}>직&nbsp;&nbsp;&nbsp;&nbsp;위</td><td className={cell}>{v.대상자직위}</td></tr>
          <tr><td className={lbl}>기&nbsp;&nbsp;&nbsp;&nbsp;간</td><td className={cell}>{v.근무기간}</td></tr>
          <tr><td className={lbl}>용&nbsp;&nbsp;&nbsp;&nbsp;도</td><td className={cell}>{v.용도}</td></tr>
        </tbody>
      </table>

      <p className="mt-8 text-center text-[15px]">
        {VERIFY_PHRASE[v.종류] ?? '위 내용을 확인합니다.'}
      </p>

      <div className="mt-10 flex items-end justify-between">
        <div className="flex h-[90px] w-[90px] items-center justify-center rounded border border-dashed border-zinc-300 text-[10px] text-zinc-400">
          QR
        </div>
        <div className="flex-1 text-center">
          <p>{new Date().toISOString().slice(0, 10).replace(/-/g, '. ')}.</p>
          <p className="mt-4 font-bold">사회복지법인 새문안교회사회복지재단</p>
          <p className="mt-1.5 text-lg font-bold">서대문노인종합복지관장</p>
        </div>
        <div className="w-[90px]" />
      </div>
    </div>
  );
}
