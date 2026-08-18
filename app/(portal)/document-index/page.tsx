import { hasPageAccess } from '@/lib/mutate/permissions';
import { getViewerStaffRecord } from '@/lib/auth-helpers';
import PageAccessDenied from '@/components/PageAccessDenied';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';
import VolumeTabs from '@/components/documentIndex/VolumeTabs';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getDocumentIndexEntries, getDocumentIndexState } from '@/lib/mutate/documentIndex';
import {
  btn, btnDanger, btnSecondary, card, h1, h2, input, inputBase, pageFluid, table, td, th, tableWrap,
} from '@/lib/ui';
import { addDocumentIndexEntryAction, deleteDocumentIndexEntryAction, startNewVolumeAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function currentYear(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()).slice(0, 4);
}

export default async function DocumentIndexPage({
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

  const volumesAsc = Array.from(new Set(entries.map((e) => e.권))).sort((a, b) => a - b);
  if (volumesAsc.length === 0 || volumesAsc[volumesAsc.length - 1] !== state.현재권) volumesAsc.push(state.현재권);
  const volumesDesc = [...volumesAsc].sort((a, b) => b - a);

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>업무관리 &gt; 색인목록</h1>

      <form method="get" className="mb-5 flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">팀</label>
        <select name="team" defaultValue={팀명} className={`${inputBase} w-auto`}>
          {teams.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">연도</label>
        <input type="number" name="year" defaultValue={연도} className={`${inputBase} w-24`} />
        <button type="submit" className={btnSecondary}>조회</button>
      </form>

      {!팀명 ? (
        <div className={card}>설정 &gt; 팀 / 직급 / 결재라인 화면에서 팀을 먼저 등록해주세요.</div>
      ) : (
        <>
          <div className={card}>
            <h2 className={`${h2} mb-3`}>공문 등록</h2>
            <form action={addDocumentIndexEntryAction} className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <input type="hidden" name="팀명" value={팀명} />
              <input type="hidden" name="연도" value={연도} />
              <select name="구분" defaultValue="일반문서" className={input}>
                <option value="일반문서">일반문서</option>
                <option value="스탬프결재">스탬프결재</option>
              </select>
              <input name="제목" placeholder="제목" required className={`${input} md:col-span-2`} />
              <input name="월일" placeholder="월/일 (예: 1/5)" className={input} />
              <input name="수신" placeholder="수신" className={input} />
              <input name="발신" placeholder="발신" className={input} />
              <button type="submit" className={`${btn} md:col-span-1`}>등록</button>
            </form>
          </div>

          <div className={card}>
            <VolumeTabs
              volumes={volumesDesc}
              defaultVolume={state.현재권}
              panels={Object.fromEntries(
                volumesDesc.map((권) => {
                  const rows = entries.filter((e) => e.권 === 권);
                  const isLatest = 권 === state.현재권;
                  return [
                    권,
                    <div key={권}>
                      {isLatest && (
                        <div className="mb-3 flex justify-end">
                          <form action={startNewVolumeAction}>
                            <input type="hidden" name="팀명" value={팀명} />
                            <input type="hidden" name="연도" value={연도} />
                            <ConfirmSubmitButton
                              confirmMessage={`${권}권을 마감하고 ${권 + 1}권을 시작할까요? 이후 등록되는 공문은 ${권 + 1}권에 쌓입니다.`}
                              className={btnSecondary}
                            >
                              다음 권 시작
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      )}
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
                              <th className={`${th} w-12`} />
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 && (
                              <tr>
                                <td className={`${td} text-center text-zinc-400`} colSpan={7}>등록된 공문이 없습니다.</td>
                              </tr>
                            )}
                            {rows.map((r, i) => (
                              <tr key={r.id}>
                                <td className={`${td} text-center tabular-nums text-zinc-400`}>{i + 1}</td>
                                <td className={td}>{r.구분 === '스탬프결재' ? '스탬프 결재' : r.문서번호}</td>
                                <td className={td}>{r.제목}</td>
                                <td className={td}>{r.월일}</td>
                                <td className={td}>{r.수신}</td>
                                <td className={td}>{r.발신}</td>
                                <td className={`${td} text-center`}>
                                  <form action={deleteDocumentIndexEntryAction}>
                                    <input type="hidden" name="id" value={r.id} />
                                    <ConfirmSubmitButton confirmMessage="이 공문을 삭제할까요?" className={btnDanger}>삭제</ConfirmSubmitButton>
                                  </form>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>,
                  ] as const;
                })
              )}
            />
          </div>
        </>
      )}
    </main>
  );
}
