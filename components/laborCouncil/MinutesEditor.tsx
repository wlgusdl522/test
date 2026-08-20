'use client';

import { useState } from 'react';
import SubmitButton from '@/components/SubmitButton';
import TrashIcon from '@/components/icons/TrashIcon';
import { btn, btnSecondary, card, h2, input, label } from '@/lib/ui';
import type { AttendeeRow, LaborCouncilMinutes, ResolutionRow } from '@/lib/mutate/laborCouncil';

function emptyResolution(): ResolutionRow {
  return { 안건제목: '', 근로자의견: '', 사용자의견: '', 의결내용: '' };
}

// datetime-local 인풋값("2026-06-29T15:00")을 화면 표기용으로 바꾼다. lib/mutate/staffMeeting.ts의
// formatMeetingDateTime과 같은 포맷이지만, 그 모듈은 구글시트 접근 코드를 물고 있어 클라이언트
// 컴포넌트에 그대로 import하면 서버 전용 의존성까지 번들에 딸려온다 — 그래서 여기서 따로 둔다.
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
function formatDateTimeLocal(v: string): string {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAY[d.getDay()]}) ${hh}:${mm}`;
}

const cellStyle = { padding: '8px 10px', border: '1px solid #d7dbe0', verticalAlign: 'top' as const };
const labelCellStyle = { ...cellStyle, color: '#666', width: 90, fontWeight: 600 };
const sectionHeaderStyle = { background: '#eef1f5', fontWeight: 600, textAlign: 'center' as const, padding: '6px 8px', border: '1px solid #d7dbe0' };
const emptyText = <span style={{ color: '#999' }}>-</span>;

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
  const [회의일시, set회의일시] = useState(minutes.회의일시);
  const [회의장소, set회의장소] = useState(minutes.회의장소);
  const [보고사항, set보고사항] = useState(minutes.보고사항);
  const [의결된사항, set의결된사항] = useState(minutes.의결된사항);
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
            일시: {minutes.회의일시 ? formatDateTimeLocal(minutes.회의일시) : '미정'} · 장소: {minutes.회의장소 || '미정'}
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
    <form action={action}>
      <input type="hidden" name="회차" value={회차} />
      <input type="hidden" name="협의의결JSON" value={JSON.stringify(resolutions)} readOnly />
      <input type="hidden" name="참석자JSON" value={JSON.stringify(attendees)} readOnly />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-5">
          <div className={card}>
            <h2 className={h2}>회의 정보</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={label}>
                회의일시
                <input
                  type="datetime-local"
                  name="회의일시"
                  value={회의일시}
                  onChange={(e) => set회의일시(e.target.value)}
                  className={input}
                />
              </label>
              <label className={label}>
                회의장소
                <input name="회의장소" value={회의장소} onChange={(e) => set회의장소(e.target.value)} className={input} />
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
            <textarea
              value={보고사항}
              onChange={(e) => set보고사항(e.target.value)}
              name="보고사항"
              rows={3}
              className={`${input} whitespace-pre-wrap`}
            />
          </div>

          <div className={card}>
            <h2 className={h2}>의결된 사항 및 이행에 관한 사항</h2>
            <textarea
              value={의결된사항}
              onChange={(e) => set의결된사항(e.target.value)}
              name="의결된사항"
              rows={3}
              className={`${input} whitespace-pre-wrap`}
            />
          </div>

          <div className={card}>
            <h2 className={h2}>참석자</h2>
            <AttendeeList attendees={attendees} onToggle={toggleAttendee} />
          </div>

          <div>
            <SubmitButton className={btn} pendingLabel="저장 중...">저장</SubmitButton>
          </div>
        </div>

        {/* 모바일에서는 미리보기를 생략 — 인쇄는 상단 "인쇄 · 복사 화면 열기"로 확인 */}
        <div className="hidden lg:block lg:sticky lg:top-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">미리보기</h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 style={{ margin: '0 0 10px', fontSize: 18, textAlign: 'center' }}>제 {회차}차 노사협의회 회의록</h2>
            <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                <tr>
                  <td style={labelCellStyle}>회의일시</td>
                  <td style={cellStyle}>{회의일시 ? formatDateTimeLocal(회의일시) : emptyText}</td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>회의장소</td>
                  <td style={cellStyle}>{회의장소 || emptyText}</td>
                </tr>
                <tr><td colSpan={2} style={sectionHeaderStyle}>협 의 사 항 · 의 결 사 항</td></tr>
                <tr>
                  <td colSpan={2} style={cellStyle}>
                    {resolutions.every((r) => !r.안건제목 && !r.근로자의견 && !r.사용자의견 && !r.의결내용) ? (
                      emptyText
                    ) : (
                      resolutions.map((r, i) => (
                        <div key={i} style={{ marginBottom: i < resolutions.length - 1 ? 10 : 0 }}>
                          <div style={{ fontWeight: 700 }}>{i + 1}. {r.안건제목 || '(제목 없음)'}</div>
                          <div style={{ marginTop: 4 }}>(가) 근로자 : {r.근로자의견 || '-'}</div>
                          <div style={{ marginTop: 4 }}>(나) 사용자 : {r.사용자의견 || '-'}</div>
                          <div style={{ marginTop: 4 }}>의결내용 : {r.의결내용 || '-'}</div>
                        </div>
                      ))
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>보고사항</td>
                  <td style={cellStyle}>{보고사항 ? 보고사항.split('\n').map((l, i) => <div key={i}>{l}</div>) : emptyText}</td>
                </tr>
                <tr>
                  <td style={labelCellStyle}>의결된 사항 및<br />이행에 관한 사항</td>
                  <td style={cellStyle}>{의결된사항 ? 의결된사항.split('\n').map((l, i) => <div key={i}>{l}</div>) : emptyText}</td>
                </tr>
                <tr><td colSpan={2} style={sectionHeaderStyle}>참 석 자</td></tr>
                <tr>
                  <td colSpan={2} style={cellStyle}>
                    <AttendeeList attendees={attendees} readOnly compact />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </form>
  );
}

function AttendeeList({
  attendees,
  onToggle,
  readOnly,
  compact,
}: {
  attendees: AttendeeRow[];
  onToggle?: (email: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}) {
  const groups: Record<string, AttendeeRow[]> = {};
  attendees.forEach((a) => {
    (groups[a.구분] ??= []).push(a);
  });

  if (attendees.length === 0) {
    return <div className="text-xs text-zinc-400">설정 &gt; 노사협의회 위원에서 위원을 먼저 등록해주세요.</div>;
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? 'gap-3 text-xs' : 'gap-4'}`}>
      {Object.entries(groups).map(([구분, list]) => (
        <div key={구분}>
          <div className={`mb-2 font-semibold text-zinc-500 dark:text-zinc-400 ${compact ? 'text-[11px]' : 'text-xs'}`}>{구분}</div>
          <div className="flex flex-col gap-1.5">
            {list.map((a) => (
              <label
                key={a.이메일}
                className={`flex items-center gap-2 text-zinc-800 dark:text-zinc-100 ${compact ? '' : 'text-sm'} ${
                  compact && !a.참석 ? 'text-zinc-400 dark:text-zinc-500' : ''
                }`}
              >
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
