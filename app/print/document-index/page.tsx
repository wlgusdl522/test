import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import PrintButton from '@/components/print/PrintButton';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getDocumentIndexEntries, getDocumentIndexState } from '@/lib/mutate/documentIndex';
import { btn, card, inputBase, table, td, th, tableWrap } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function currentYear(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 4);
}

export default async function DocumentIndexPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; year?: string }>;
}) {
  if (!(await hasPageAccess('document-index'))) return <PageAccessDenied />;

  const [teams, me] = await Promise.all([getSimpleList(TEAM_LIST_SHEET_NAME), getViewerStaffRecord()]);
  const { team: teamParam, year: yearParam } = await searchParams;
  const myTeam = me?.소속팀 ?? '';
  const 팀명 = teams.includes(teamParam ?? '')
    ? (teamParam as string)
    : teams.includes(myTeam)
      ? myTeam
      : (teams[0] ?? '');
  const 연도 = yearParam || currentYear();

  const [entries, state] = 팀명
    ? await Promise.all([getDocumentIndexEntries(팀명, 연도), getDocumentIndexState(팀명, 연도)])
    : [[], { 팀명, 연도, 현재권: 1, 다음일련번호: 1 }];

  const volumes = Array.from(new Set(entries.map((e) => e.권))).sort((a, b) => a - b);
  if (volumes.length === 0 || volumes[volumes.length - 1] !== state.현재권) volumes.push(state.현재권);

  return (
    <div>
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="team" defaultValue={팀명} className={`${inputBase} w-auto`}>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input type="number" name="year" defaultValue={연도} className={`${inputBase} w-24`} />
          <button type="submit" className={btn}>조회</button>
        </form>
        <PrintButton />
      </div>

      <div className="bg-white dark:bg-zinc-900">
        {volumes.map((권, i) => {
          const rows = entries.filter((e) => e.권 === 권);
          const isLast = i === volumes.length - 1;
          return (
            <div key={권} className={isLast ? '' : 'print:break-after-page'}>
              <div style={{ textAlign: 'center', marginBottom: 4, marginTop: i === 0 ? 0 : 24 }}>
                <div style={{ fontSize: 13, color: '#666' }}>{연도}년 {팀명} 문서등록철</div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.5em', marginTop: 4 }}>색 인 목 록</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{권}권</div>
              </div>
              <div className={tableWrap}>
                <table className={table}>
                  <thead>
                    <tr>
                      <th className={`${th} w-10 text-center`}>No</th>
                      <th className={th}>문서번호</th>
                      <th className={th}>제목</th>
                      <th className={th}>월/일</th>
                      <th className={th}>수신</th>
                      <th className={th}>발신</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td className={`${td} text-center text-zinc-400`} colSpan={6}>등록된 공문이 없습니다.</td>
                      </tr>
                    )}
                    {rows.map((r, ri) => (
                      <tr key={r.id}>
                        <td className={`${td} text-center tabular-nums text-zinc-400`}>{ri + 1}</td>
                        <td className={td}>{r.구분 === '스탬프결재' ? '스탬프 결재' : r.문서번호}</td>
                        <td className={td}>{r.제목}</td>
                        <td className={td}>{r.월일}</td>
                        <td className={td}>{r.수신}</td>
                        <td className={td}>{r.발신}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
