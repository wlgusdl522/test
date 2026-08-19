'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { btn, btnSecondary, table, td, th, tableWrap } from '@/lib/ui';

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
const PREV_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);

// 사업구분을 몇 개 묶을지(페이지 분할)는 가장 큰 글씨(lg) 기준 높이로 정하고, 그렇게 정해진
// 페이지가 실제로는 내용이 많아 lg로 안 들어가면 md → sm 순으로 그 페이지만 글씨를 줄인다.
const TIERS = [
  { key: 'lg', fontSize: '26px', titleFontSize: 44 },
  { key: 'md', fontSize: '20px', titleFontSize: 36 },
  { key: 'sm', fontSize: '15px', titleFontSize: 28 },
] as const;
type Tier = (typeof TIERS)[number];

const TEAM_TITLE_MARGIN_BOTTOM = 20;
// 표 테두리/여백/측정 오차를 흡수하는 여유분 — 이만큼 빼고 채워야 실제로 스크롤 없이 꽉 찬다.
const SAFETY_MARGIN = 48;
// 내용이 짧아 화면에 여유가 많이 남아도, 한 페이지에는 최대 이 개수까지만 보여준다.
const MAX_ROWS_PER_PAGE = 3;
// th 공용 클래스에 whitespace-nowrap이 박혀있어 협조사항처럼 좁은 열은 헤더 글자("타 부서
// 협조사항 및 기타")가 한 줄로 강제되며 옆으로 넘쳐 가로 스크롤이 생겼다. 인라인 스타일로
// 덮어써 좁은 열에서는 헤더도 줄바꿈되게 한다(인라인 스타일이 클래스보다 항상 우선한다).
const HEADER_WRAP_STYLE: React.CSSProperties = { whiteSpace: 'normal' };

type Row = { id: string; 사업구분: string; 업무보고: string; 업무계획: string; 협조사항: string };
type Section = { team: string; rows: Row[] };
type PageGroup = { team: string; rows: Row[]; tier: Tier };

function TeamTable({
  team,
  rows,
  reportLabel,
  planLabel,
  tier,
}: {
  team: string;
  rows: Row[];
  reportLabel: string;
  planLabel: string;
  tier: Tier;
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: TEAM_TITLE_MARGIN_BOTTOM }}>
        <div style={{ fontSize: tier.titleFontSize, fontWeight: 700 }}>{team}</div>
      </div>
      <div className={tableWrap}>
        <table className={table} style={{ fontSize: tier.fontSize, tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '14%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className={th} style={HEADER_WRAP_STYLE}>사업구분</th>
              <th className={th} style={HEADER_WRAP_STYLE}>{reportLabel} 업무보고</th>
              <th className={th} style={HEADER_WRAP_STYLE}>{planLabel} 업무계획</th>
              <th className={th} style={HEADER_WRAP_STYLE}>타 부서 협조사항 및 기타</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-pre-wrap break-keep break-words font-semibold align-top`}>{r.사업구분}</td>
                <td className={`${td} align-top whitespace-pre-wrap break-keep break-words`}>{r.업무보고}</td>
                <td className={`${td} align-top whitespace-pre-wrap break-keep break-words`}>{r.업무계획}</td>
                <td className={`${td} align-top whitespace-pre-wrap break-keep break-words`}>{r.협조사항}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function refKey(tierKey: string, team: string): string {
  return `${tierKey}:${team}`;
}

// 표지 + 팀별 페이지를 실제 프레젠테이션 슬라이드쇼처럼 전체화면으로 보여준다. 사업구분을
// 몇 개씩 묶어 한 장에 보여줄지는 고정하지 않고, 실제 렌더링 높이를 재서 화면에 스크롤 없이
// 꽉 차는 만큼(내용이 많으면 1개, 적으면 여러 개) 동적으로 나눈다.
export default function PresentClient({
  ym,
  reportLabel,
  planLabel,
  meetingDateTime,
  place,
  host,
  attendingTeams,
  sections,
}: {
  ym: string;
  reportLabel: string;
  planLabel: string;
  meetingDateTime: string;
  place: string;
  host: string;
  attendingTeams: string;
  sections: Section[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const teamTitleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const theadRefs = useRef<Record<string, HTMLTableSectionElement | null>>({});
  const rowRefs = useRef<Record<string, (HTMLTableRowElement | null)[]>>({});

  const [index, setIndex] = useState(0);
  const [pageGroups, setPageGroups] = useState<PageGroup[] | null>(null);

  const recompute = useCallback(() => {
    const contentHeight = contentRef.current?.clientHeight ?? 0;
    if (!contentHeight) return;

    // 1) 페이지를 몇 개씩 묶을지는 항상 가장 큰 글씨(lg) 기준 높이로 정한다 — 내용이 짧으면
    //    최대한 큰 글씨로 여러 개를 보여주는 경험을 우선한다.
    const packTier = TIERS[0];
    type Grouped = { team: string; rowIdx: number[] };
    const grouped: Grouped[] = [];
    for (const section of sections) {
      const k = refKey(packTier.key, section.team);
      const teamTitleH = (teamTitleRefs.current[k]?.offsetHeight ?? 0) + TEAM_TITLE_MARGIN_BOTTOM;
      const theadH = theadRefs.current[k]?.offsetHeight ?? 0;
      const available = contentHeight - teamTitleH - theadH - SAFETY_MARGIN;
      const rowEls = rowRefs.current[k] ?? [];

      let current: number[] = [];
      let currentHeight = 0;
      section.rows.forEach((_row, i) => {
        const h = rowEls[i]?.offsetHeight ?? 0;
        if (current.length > 0 && (current.length >= MAX_ROWS_PER_PAGE || currentHeight + h > available)) {
          grouped.push({ team: section.team, rowIdx: current });
          current = [];
          currentHeight = 0;
        }
        current.push(i);
        currentHeight += h;
      });
      if (current.length > 0) grouped.push({ team: section.team, rowIdx: current });
    }

    // 2) 정해진 각 묶음이 lg로 실제 화면에 꽉 차지 않으면(내용이 많아 넘치면) md → sm 순으로
    //    그 페이지만 글씨를 줄여서, 묶는 개수(=구성)는 그대로 두고 세로 스크롤만 없앤다.
    const groups: PageGroup[] = grouped.map(({ team, rowIdx }) => {
      const section = sections.find((s) => s.team === team)!;
      const rows = rowIdx.map((i) => section.rows[i]);

      let chosen: Tier = TIERS[TIERS.length - 1];
      for (const tier of TIERS) {
        const k = refKey(tier.key, team);
        const teamTitleH = (teamTitleRefs.current[k]?.offsetHeight ?? 0) + TEAM_TITLE_MARGIN_BOTTOM;
        const theadH = theadRefs.current[k]?.offsetHeight ?? 0;
        const available = contentHeight - teamTitleH - theadH - SAFETY_MARGIN;
        const rowEls = rowRefs.current[k] ?? [];
        const total = rowIdx.reduce((sum, i) => sum + (rowEls[i]?.offsetHeight ?? 0), 0);
        if (total <= available) {
          chosen = tier;
          break;
        }
      }
      return { team, rows, tier: chosen };
    });

    setPageGroups(groups);
  }, [sections]);

  useLayoutEffect(() => {
    recompute();
  }, [recompute]);

  useEffect(() => {
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [recompute]);

  const totalPages = 1 + (pageGroups?.length ?? 0);
  // pageGroups는 리사이즈 시에만 바뀌는데, 그 순간 index가 이전 총 페이지 수 기준일 수
  // 있어 범위를 벗어날 수 있으므로 렌더링 시점에 안전하게 잘라서 쓴다.
  const clampedIndex = Math.min(index, totalPages - 1);

  const next = useCallback(() => setIndex((i) => Math.min(totalPages - 1, i + 1)), [totalPages]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    containerRef.current?.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (NEXT_KEYS.has(e.key)) {
        e.preventDefault();
        next();
      } else if (PREV_KEYS.has(e.key)) {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [next, prev]);

  function handleClose() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    router.push(`/staff-meeting?ym=${ym}`);
  }

  if (sections.length === 0 && !meetingDateTime && !place && !host && !attendingTeams) return null;

  const current = clampedIndex === 0 ? null : pageGroups?.[clampedIndex - 1];

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
      {/* 실제 화면과 같은 너비로 숨겨서 렌더링해, 글씨 크기별(lg/md/sm)로 각 팀 제목/표
          머리글/행의 실제 높이를 잰다. overflow:hidden으로 감싸서, 측정용 사본이 아무리
          넓어져도 실제 화면 가로/세로 스크롤에 영향을 주지 않게 한다. */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
        <div className="px-10">
          {TIERS.map((tier) =>
            sections.map((section) => (
              <div key={refKey(tier.key, section.team)}>
                <div
                  ref={(el) => { teamTitleRefs.current[refKey(tier.key, section.team)] = el; }}
                  style={{ textAlign: 'center' }}
                >
                  <div style={{ fontSize: tier.titleFontSize, fontWeight: 700 }}>{section.team}</div>
                </div>
                <table className={table} style={{ fontSize: tier.fontSize, tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead ref={(el) => { theadRefs.current[refKey(tier.key, section.team)] = el; }}>
                    <tr>
                      <th className={th} style={HEADER_WRAP_STYLE}>사업구분</th>
                      <th className={th} style={HEADER_WRAP_STYLE}>{reportLabel} 업무보고</th>
                      <th className={th} style={HEADER_WRAP_STYLE}>{planLabel} 업무계획</th>
                      <th className={th} style={HEADER_WRAP_STYLE}>타 부서 협조사항 및 기타</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((r, i) => (
                      <tr
                        key={r.id}
                        ref={(el) => {
                          const k = refKey(tier.key, section.team);
                          const arr = rowRefs.current[k] ?? (rowRefs.current[k] = []);
                          arr[i] = el;
                        }}
                      >
                        <td className={`${td} whitespace-pre-wrap break-keep break-words font-semibold align-top`}>{r.사업구분}</td>
                        <td className={`${td} align-top whitespace-pre-wrap break-keep break-words`}>{r.업무보고}</td>
                        <td className={`${td} align-top whitespace-pre-wrap break-keep break-words`}>{r.업무계획}</td>
                        <td className={`${td} align-top whitespace-pre-wrap break-keep break-words`}>{r.협조사항}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end p-3">
        <button type="button" onClick={handleClose} className={btnSecondary}>닫기</button>
      </div>

      <div ref={contentRef} className="flex-1 overflow-auto px-10">
        {clampedIndex === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <h1 className="mb-10 text-6xl font-bold leading-snug">
              {reportLabel} 보고 및<br />
              {planLabel} 계획
            </h1>
            {(meetingDateTime || place || host || attendingTeams) && (
              <div className="rounded-lg bg-amber-50 px-8 py-6 text-left text-2xl leading-loose dark:bg-amber-500/10">
                {meetingDateTime && <div><b>회의일시</b> : {meetingDateTime}</div>}
                {place && <div><b>장소</b> : {place}</div>}
                {host && <div><b>진행</b> : {host}</div>}
                {attendingTeams && <div><b>참석부서</b> : {attendingTeams}</div>}
              </div>
            )}
          </div>
        ) : current ? (
          <TeamTable team={current.team} rows={current.rows} reportLabel={reportLabel} planLabel={planLabel} tier={current.tier} />
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-3 p-4">
        <button
          type="button"
          onClick={prev}
          disabled={clampedIndex === 0}
          className={`${btnSecondary} disabled:opacity-30`}
        >
          ← 이전
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{clampedIndex + 1} / {totalPages}</span>
        <button
          type="button"
          onClick={next}
          disabled={clampedIndex === totalPages - 1}
          className={`${btn} disabled:opacity-30`}
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
