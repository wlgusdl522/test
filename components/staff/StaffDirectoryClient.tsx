'use client';

import { useMemo, useState } from 'react';
import Avatar from '@/components/Avatar';
import DetailPanel from '@/components/DetailPanel';
import Tag from '@/components/Tag';
import { h1, metaGrid, metaLabel, metaValue, pageFluid, pageSubtitle, searchInput, selectFilter } from '@/lib/ui';

type StaffRow = Record<string, string>;

const ALL_TEAMS = '전체';

// 관장 - 부장 - 각팀 과장/팀장 - 대리 - 사회복지사 순으로 노출. 목록에 없는 직급(조리원, 주임 등)은 뒤로.
const POSITION_ORDER = ['관장', '부장', '과장', '팀장', '대리', '사회복지사'];

function positionRank(position: string): number {
  const idx = POSITION_ORDER.indexOf(position);
  return idx === -1 ? POSITION_ORDER.length : idx;
}

const TEAM_ORDER = ['미배정', '복지1팀', '복지2팀', '복지3팀', '총무팀', '요양센터', '데이케어센터'];

function teamRank(team: string): number {
  const idx = TEAM_ORDER.indexOf(team);
  return idx === -1 ? TEAM_ORDER.length : idx;
}

export default function StaffDirectoryClient({ staff }: { staff: StaffRow[] }) {
  const [query, setQuery] = useState('');
  const [team, setTeam] = useState(ALL_TEAMS);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const teams = useMemo(
    () => [ALL_TEAMS, ...Array.from(new Set(staff.map((s) => s.소속팀))).filter(Boolean).sort()],
    [staff]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((s) => {
      if (team !== ALL_TEAMS && s.소속팀 !== team) return false;
      if (!q) return true;
      return [s.성명, s.소속팀, s['직급/직책'], s.담당사업, s.내선번호, s.휴대폰번호].some((v) =>
        (v ?? '').toLowerCase().includes(q)
      );
    });
  }, [staff, query, team]);

  const groups = useMemo(() => {
    const map = new Map<string, StaffRow[]>();
    filtered.forEach((s) => {
      const key = s.소속팀 || '미배정';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    const entries = Array.from(map.entries()).map(([teamName, members]) => {
      const sorted = [...members].sort((a, b) => {
        const rankDiff = positionRank(a['직급/직책']) - positionRank(b['직급/직책']);
        return rankDiff !== 0 ? rankDiff : a.성명.localeCompare(b.성명);
      });
      return [teamName, sorted] as const;
    });
    return entries.sort((a, b) => {
      const rankDiff = teamRank(a[0]) - teamRank(b[0]);
      return rankDiff !== 0 ? rankDiff : a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  const selected = staff.find((s) => s['이메일(아이디)'] === selectedEmail) ?? null;

  return (
    <main className={pageFluid}>
      <h1 className={h1}>전직원 주소록</h1>
      <p className={pageSubtitle}>재직중인 직원 · 검색결과 {filtered.length}명 (전체 {staff.length}명)</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·직급·담당사업·번호 검색"
            className={searchInput}
          />
        </div>
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectFilter}>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t === ALL_TEAMS ? '전체 팀' : t}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-start gap-4">
        <div className="grid min-w-0 flex-1 grid-cols-1 content-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(([teamName, members]) => (
            <div
              key={teamName}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/40">
                <h3 className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-100">{teamName}</h3>
                <span className="text-xs text-zinc-400">{members.length}명</span>
              </div>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {members.map((s) => {
                  const email = s['이메일(아이디)'];
                  const active = email === selectedEmail;
                  return (
                    <li key={email}>
                      <button
                        type="button"
                        onClick={() => setSelectedEmail(active ? null : email)}
                        className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-brand-tint/60 ${active ? 'bg-brand-tint' : ''}`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar initial={(s.성명 || '?').charAt(0)} />
                          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{s.성명}</span>
                        </span>
                        <Tag label={s['직급/직책']} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {groups.length === 0 && <p className="col-span-full py-12 text-center text-zinc-400">검색 결과가 없습니다.</p>}
        </div>

        {selected && (
          <DetailPanel
            title={selected.성명}
            subtitle={selected['이메일(아이디)']}
            tag={<Tag label={selected.소속팀} />}
            onClose={() => setSelectedEmail(null)}
          >
            <div className={metaGrid}>
              <div>
                <div className={metaLabel}>직급/직책</div>
                <div className={metaValue}>{selected['직급/직책'] || '-'}</div>
              </div>
              <div>
                <div className={metaLabel}>당직대상여부</div>
                <div className={metaValue}>{selected.당직대상여부 || '-'}</div>
              </div>
              <div className="col-span-2">
                <div className={metaLabel}>담당사업</div>
                <div className={metaValue}>{selected.담당사업 || '-'}</div>
              </div>
              <div>
                <div className={metaLabel}>내선번호</div>
                <div className={metaValue}>{selected.내선번호 || '-'}</div>
              </div>
              <div>
                <div className={metaLabel}>휴대폰번호</div>
                <div className={metaValue}>{selected.휴대폰번호 || '-'}</div>
              </div>
              <div>
                <div className={metaLabel}>입사일</div>
                <div className={metaValue}>{selected.입사일 || '-'}</div>
              </div>
              {selected.비고 && (
                <div className="col-span-2">
                  <div className={metaLabel}>비고</div>
                  <div className={metaValue}>{selected.비고}</div>
                </div>
              )}
            </div>
          </DetailPanel>
        )}
      </div>
    </main>
  );
}
