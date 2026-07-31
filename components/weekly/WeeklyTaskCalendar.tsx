'use client';

import { useRef, useState, useTransition } from 'react';
import { input, label } from '@/lib/ui';
import { syncMyWeeklyTaskDayAction, toggleHighlightAction } from '@/app/(portal)/weekly-plan/actions';
import { FULL_DAY_LEAVE_TYPES, LEAVE_TYPES, parseLeaveTag } from '@/lib/weeklyLeave';

type Task = { id: string; 날짜: string; 업무내용: string; 회의록후보: string };

function parseBulletLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

function toBulletText(tasks: Task[]): string {
  return tasks.length ? tasks.map((t) => `• ${t.업무내용}`).join('\n') : '';
}

export default function WeeklyTaskCalendar({
  dayDates,
  weekdayLabels,
  initialTasks,
  myName,
}: {
  dayDates: string[];
  weekdayLabels: string[];
  initialTasks: Task[];
  myName: string;
}) {
  const [tasksByDay, setTasksByDay] = useState<Record<string, Task[]>>(() => {
    const grouped: Record<string, Task[]> = {};
    for (const iso of dayDates) grouped[iso] = initialTasks.filter((t) => t.날짜 === iso);
    return grouped;
  });
  const [textByDay, setTextByDay] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const iso of dayDates) map[iso] = toBulletText(initialTasks.filter((t) => t.날짜 === iso));
    return map;
  });
  const [statusText, setStatusText] = useState('');
  const [, startTransition] = useTransition();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // textByDay를 그대로 미러링 — 저장 요청이 도는 동안(1~2초) 사용자가 더 입력한 경우,
  // 응답이 그 사이의 최신 입력을 덮어쓰지 않도록 "요청 시점 텍스트 == 지금 화면 텍스트"인지 비교하는 용도.
  const liveTextRef = useRef<Record<string, string>>(
    Object.fromEntries(dayDates.map((iso) => [iso, toBulletText(initialTasks.filter((t) => t.날짜 === iso))]))
  );

  // 입력이 멈추고 나서 자동 저장 — blur(포커스 이탈) 전에도 회의록 체크 목록이 곧바로 뜨도록.
  function scheduleAutoSync(iso: string, text: string) {
    clearTimeout(debounceTimers.current[iso]);
    debounceTimers.current[iso] = setTimeout(() => {
      syncDay(iso, text);
    }, 1200);
  }

  async function syncDay(iso: string, text: string) {
    clearTimeout(debounceTimers.current[iso]);
    const lines = parseBulletLines(text);
    setStatusText('저장 중...');
    try {
      const updated = await syncMyWeeklyTaskDayAction(iso, lines);
      // 응답이 오는 사이 사용자가 계속 타이핑해서 화면 내용이 이미 더 앞서갔다면,
      // 이 요청은 낡은 스냅샷이므로 화면을 덮어쓰지 않는다 — 다음 자동저장/blur가 최신 내용을 다시 저장한다.
      if (liveTextRef.current[iso] !== text) return;
      setTasksByDay((prev) => ({ ...prev, [iso]: updated as Task[] }));
      const savedText = toBulletText(updated as Task[]);
      liveTextRef.current[iso] = savedText;
      setTextByDay((prev) => ({ ...prev, [iso]: savedText }));
      setStatusText('저장됨');
    } catch (err) {
      setStatusText(err instanceof Error ? err.message : '저장 실패');
    }
  }

  function handleLeaveChange(iso: string, type: string) {
    const remaining = parseBulletLines(textByDay[iso] ?? '').filter((line) => !parseLeaveTag(line));
    let newLines: string[];
    if (!type) newLines = remaining;
    else if (FULL_DAY_LEAVE_TYPES.includes(type)) newLines = [`${myName}(${type})`];
    else newLines = [`${myName}(${type})`, ...remaining];
    const text = newLines.length ? `• ${newLines.join('\n• ')}` : '';
    liveTextRef.current[iso] = text;
    setTextByDay((prev) => ({ ...prev, [iso]: text }));
    startTransition(() => {
      syncDay(iso, text);
    });
  }

  async function handleChecklistToggle(id: string, checked: boolean) {
    const fd = new FormData();
    fd.set('id', id);
    fd.set('flag', String(checked));
    await toggleHighlightAction(fd);
    setTasksByDay((prev) => {
      const next: Record<string, Task[]> = {};
      for (const iso of Object.keys(prev)) {
        next[iso] = prev[iso].map((t) => (t.id === id ? { ...t, 회의록후보: checked ? 'TRUE' : 'FALSE' } : t));
      }
      return next;
    });
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-3 mb-2">
        {dayDates.map((iso, i) => {
          const d = new Date(`${iso}T00:00:00`);
          const dayTasks = tasksByDay[iso] ?? [];
          const leaveTag = dayTasks.map((t) => parseLeaveTag(t.업무내용)).find(Boolean);
          const leaveVal = leaveTag?.type ?? '';
          const isFullDayLeave = FULL_DAY_LEAVE_TYPES.includes(leaveVal);
          return (
            <div key={iso} className="flex flex-col gap-1.5">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                {weekdayLabels[i]} ({d.getMonth() + 1}/{d.getDate()})
              </div>
              <select
                className={`${input} text-xs`}
                value={leaveVal}
                onChange={(e) => handleLeaveChange(iso, e.target.value)}
              >
                <option value="">휴가/교육 없음</option>
                {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea
                className={`${input} text-xs min-h-24 resize-y ${isFullDayLeave ? 'opacity-50' : ''}`}
                value={textByDay[iso] ?? ''}
                disabled={isFullDayLeave}
                onFocus={(e) => {
                  if (!e.target.value) {
                    liveTextRef.current[iso] = '• ';
                    setTextByDay((prev) => ({ ...prev, [iso]: '• ' }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const el = e.currentTarget;
                  const start = el.selectionStart, end = el.selectionEnd;
                  const value = `${el.value.slice(0, start)}\n• ${el.value.slice(end)}`;
                  liveTextRef.current[iso] = value;
                  setTextByDay((prev) => ({ ...prev, [iso]: value }));
                  scheduleAutoSync(iso, value);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + 3;
                  });
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  liveTextRef.current[iso] = value;
                  setTextByDay((prev) => ({ ...prev, [iso]: value }));
                  scheduleAutoSync(iso, value);
                }}
                onBlur={(e) => syncDay(iso, e.target.value)}
              />
              {dayTasks.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <div className="text-[11px] text-zinc-400">회의록에 반영</div>
                  {dayTasks.map((t) => (
                    <label key={t.id} className="flex items-start gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <input
                        type="checkbox"
                        defaultChecked={t.회의록후보 === 'TRUE' || t.회의록후보 === 'true'}
                        onChange={(e) => handleChecklistToggle(t.id, e.target.checked)}
                      />
                      {t.업무내용}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {statusText && <p className="text-xs text-zinc-400">{statusText}</p>}
    </div>
  );
}
