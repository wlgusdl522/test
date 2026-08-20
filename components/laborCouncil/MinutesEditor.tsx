'use client';

import { useState } from 'react';
import SubmitButton from '@/components/SubmitButton';
import TrashIcon from '@/components/icons/TrashIcon';
import { btn, btnSecondary, card, h2, input, label } from '@/lib/ui';
import type { AttendeeRow, LaborCouncilMinutes, ResolutionRow } from '@/lib/mutate/laborCouncil';

function emptyResolution(): ResolutionRow {
  return { 안건제목: '', 근로자의견: '', 사용자의견: '', 의결내용: '' };
}

export default function MinutesEditor({
  회차,
  minutes,
  canEdit,
  action,
}: {
  회차: string;
  minutes: LaborCouncilMinutes;
  canEdit: boolean;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [resolutions, setResolutions] = useState<ResolutionRow[]>(
    minutes.협의의결.length > 0 ? minutes.협의의결 : [emptyResolution()]
  );
  const [attendees, setAttendees] = useState<AttendeeRow[]>(minutes.참석자);

  function updateResolution(idx: number, key: keyof ResolutionRow, value: string) {
    setResolutions((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }
  function addResolution() {
    setResolutions((prev) => [...prev, emptyResolution()]);
  }
  function removeResolution(idx: number) {
    setResolutions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }
  function toggleAttendee(email: string) {
    setAttendees((prev) => prev.map((a) => (a.이메일 === email ? { ...a, 참석: !a.참석 } : a)));
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-5">
        <div className={card}>
          <h2 className={h2}>회의 정보</h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            일시: {minutes.회의일시 || '미정'} · 장소: {minutes.회의장소 || '미정'}
          </p>
        </div>
        <div className={card}>
          <h2 className={h2}>협의사항 · 의결사항</h2>
          {resolutions.map((r, i) => (
            <div key={i} className="mb-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 last:mb-0">
              <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{i + 1}. {r.안건제목 || '(제목 없음)'}</div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-zinc-400 mb-1">근로자 의견</div>
                  <div className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-100">{r.근로자의견 || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400 mb-1">사용자 의견</div>
                  <div className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-100">{r.사용자의견 || '-'}</div>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <div className="text-xs text-zinc-400 mb-1">의결내용</div>
                <div className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-100">{r.의결내용 || '-'}</div>
              </div>
            </div>
          ))}
        </div>
        <div className={card}>
          <h2 className={h2}>보고사항</h2>
          <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{minutes.보고사항 || '-'}</p>
        </div>
        <div className={card}>
          <h2 className={h2}>의결된 사항 및 이행에 관한 사항</h2>
          <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{minutes.의결된사항 || '-'}</p>
        </div>
        <div className={card}>
          <h2 className={h2}>참석자</h2>
          <AttendeeList attendees={attendees} readOnly />
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="회차" value={회차} />
      <input type="hidden" name="협의의결JSON" value={JSON.stringify(resolutions)} readOnly />
      <input type="hidden" name="참석자JSON" value={JSON.stringify(attendees)} readOnly />

      <div className={card}>
        <h2 className={h2}>회의 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className={label}>
            회의일시
            <input type="datetime-local" name="회의일시" defaultValue={minutes.회의일시} className={input} />
          </label>
          <label className={label}>
            회의장소
            <input name="회의장소" defaultValue={minutes.회의장소} className={input} />
          </label>
        </div>
      </div>

      <div className={card}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className={`${h2} mt-0 mb-0 border-0 pb-0`}>협의사항 · 의결사항</h2>
          <button type="button" onClick={addResolution} className={btnSecondary}>+ 안건 추가</button>
        </div>
        {resolutions.map((r, idx) => (
          <div key={idx} className="mb-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 last:mb-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <input
                value={r.안건제목}
                onChange={(e) => updateResolution(idx, '안건제목', e.target.value)}
                placeholder={`${idx + 1}. 안건 제목`}
                className={`${input} font-semibold`}
              />
              <button
                type="button"
                onClick={() => removeResolution(idx)}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-[#b51c31] dark:hover:bg-red-950/40"
                aria-label="안건 삭제"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={label}>
                근로자 의견
                <textarea
                  value={r.근로자의견}
                  onChange={(e) => updateResolution(idx, '근로자의견', e.target.value)}
                  rows={3}
                  className={`${input} whitespace-pre-wrap`}
                />
              </label>
              <label className={label}>
                사용자 의견
                <textarea
                  value={r.사용자의견}
                  onChange={(e) => updateResolution(idx, '사용자의견', e.target.value)}
                  rows={3}
                  className={`${input} whitespace-pre-wrap`}
                />
              </label>
            </div>
            <label className={`${label} mt-3`}>
              의결내용
              <textarea
                value={r.의결내용}
                onChange={(e) => updateResolution(idx, '의결내용', e.target.value)}
                rows={2}
                className={`${input} whitespace-pre-wrap`}
              />
            </label>
          </div>
        ))}
      </div>

      <div className={card}>
        <h2 className={h2}>보고사항</h2>
        <textarea name="보고사항" defaultValue={minutes.보고사항} rows={3} className={`${input} whitespace-pre-wrap`} />
      </div>

      <div className={card}>
        <h2 className={h2}>의결된 사항 및 이행에 관한 사항</h2>
        <textarea name="의결된사항" defaultValue={minutes.의결된사항} rows={3} className={`${input} whitespace-pre-wrap`} />
      </div>

      <div className={card}>
        <h2 className={h2}>참석자</h2>
        <AttendeeList attendees={attendees} onToggle={toggleAttendee} />
      </div>

      <div>
        <SubmitButton className={btn} pendingLabel="저장 중...">저장</SubmitButton>
      </div>
    </form>
  );
}

function AttendeeList({
  attendees,
  onToggle,
  readOnly,
}: {
  attendees: AttendeeRow[];
  onToggle?: (email: string) => void;
  readOnly?: boolean;
}) {
  const groups: Record<string, AttendeeRow[]> = {};
  attendees.forEach((a) => {
    (groups[a.구분] ??= []).push(a);
  });

  if (attendees.length === 0) {
    return <div className="text-xs text-zinc-400">설정 &gt; 노사협의회 위원에서 위원을 먼저 등록해주세요.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.entries(groups).map(([구분, list]) => (
        <div key={구분}>
          <div className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{구분}</div>
          <div className="flex flex-col gap-1.5">
            {list.map((a) => (
              <label key={a.이메일} className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-100">
                <input type="checkbox" checked={a.참석} disabled={readOnly} onChange={() => onToggle?.(a.이메일)} />
                {a.성명}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
