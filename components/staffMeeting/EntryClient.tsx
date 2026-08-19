'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { btn, table, td, th, tableWrap } from '@/lib/ui';
import { submitStaffMeetingValuesAction } from '@/app/(portal)/staff-meeting/actions';

type Row = {
  id: string;
  사업구분: string;
  업무보고: string;
  업무계획: string;
  협조사항: string;
  지난달계획: string;
};

const textareaClass =
  'w-full min-w-[200px] resize-none overflow-hidden rounded border border-transparent bg-[#fcfbf8] px-2 py-1 text-[13px] focus:border-brand focus:outline-none dark:bg-zinc-950';

// 입력한 글자 수만큼 칸이 늘어나도록 스크롤 높이에 맞춰 실제 높이를 다시 잰다.
function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export default function EntryClient({
  팀명,
  ym,
  rows,
  reportLabel,
  planLabel,
}: {
  팀명: string;
  ym: string;
  rows: Row[];
  reportLabel: string;
  planLabel: string;
}) {
  const router = useRouter();
  // 이번달 업무보고를 아직 안 썼으면 지난달에 적어둔 "다음달 업무계획"을 그대로 옮겨 적어 시작점으로
  // 준다(회계 전월이월 추천값과 같은 방식 — 그대로 둬도 되고 고쳐 써도 됨, 잠긴 값이 아님).
  const [values, setValues] = useState<Record<string, { 업무보고: string; 업무계획: string; 협조사항: string }>>(
    Object.fromEntries(
      rows.map((r) => [r.id, { 업무보고: r.업무보고 || r.지난달계획, 업무계획: r.업무계획, 협조사항: r.협조사항 }])
    )
  );
  const [status, setStatus] = useState('');
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-400">등록된 사업구분이 없습니다. 위에서 사업구분을 먼저 추가해주세요.</p>;
  }

  function update(id: string, field: '업무보고' | '업무계획' | '협조사항', value: string) {
    setValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function handleSubmit() {
    setStatus('저장 중...');
    startTransition(async () => {
      try {
        const entries = rows.map((r) => ({ 사업구분ID: r.id, ...values[r.id] }));
        await submitStaffMeetingValuesAction(팀명, ym, entries);
        setStatus('저장했습니다');
        router.refresh();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : '저장 실패');
      }
    });
  }

  return (
    <div>
      <div className={tableWrap}>
        <table className={table}>
          <thead>
            <tr>
              <th className={`${th} whitespace-nowrap`}>사업구분</th>
              <th className={th}>{reportLabel} 업무보고</th>
              <th className={th}>{planLabel} 업무계획</th>
              <th className={th}>타 부서 협조사항 및 기타</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-pre-wrap font-semibold align-top`}>{r.사업구분}</td>
                <td className={`${td} align-top`}>
                  <textarea
                    ref={autoResize}
                    rows={4}
                    value={values[r.id]?.업무보고 ?? ''}
                    onChange={(e) => { update(r.id, '업무보고', e.target.value); autoResize(e.target); }}
                    className={textareaClass}
                  />
                </td>
                <td className={`${td} align-top`}>
                  <textarea
                    ref={autoResize}
                    rows={4}
                    value={values[r.id]?.업무계획 ?? ''}
                    onChange={(e) => { update(r.id, '업무계획', e.target.value); autoResize(e.target); }}
                    className={textareaClass}
                  />
                </td>
                <td className={`${td} align-top`}>
                  <textarea
                    ref={autoResize}
                    rows={4}
                    value={values[r.id]?.협조사항 ?? ''}
                    onChange={(e) => { update(r.id, '협조사항', e.target.value); autoResize(e.target); }}
                    className={textareaClass}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={handleSubmit} disabled={isPending} className={btn}>저장</button>
        <span className="text-sm text-zinc-500">{status}</span>
      </div>
    </div>
  );
}
