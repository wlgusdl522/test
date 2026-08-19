import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { getDocumentIndexPrefixes } from '@/lib/mutate/documentIndex';
import { btn, h1, hint, input, pageFluid } from '@/lib/ui';
import { setDocumentIndexPrefixAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DocumentIndexPrefixSettingsPage() {
  const [teams, prefixes] = await Promise.all([getSimpleList(TEAM_LIST_SHEET_NAME), getDocumentIndexPrefixes()]);
  const prefixMap = Object.fromEntries(prefixes.map((p) => [p.팀명, p.접두사]));

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-3`}>설정 &gt; 색인목록 접두사</h1>
      <p className={hint}>
        팀별 공문 문서번호 접두사를 등록합니다(예: 서노복102A). 등록 시점의 접두사가 문서번호에 그대로 저장되며,
        이후 접두사를 바꿔도 과거에 발급된 문서번호는 바뀌지 않습니다.
      </p>

      {teams.length === 0 ? (
        <p className="text-sm text-zinc-500">설정 &gt; 팀 / 직급 / 결재라인 화면에서 팀을 먼저 등록해주세요.</p>
      ) : (
        <div className="flex max-w-md flex-col gap-3">
          {teams.map((team) => (
            <form key={team} action={setDocumentIndexPrefixAction} className="flex flex-wrap items-center gap-2">
              <span className="w-24 shrink-0 text-sm text-zinc-700 dark:text-zinc-300">{team}</span>
              <input type="hidden" name="팀명" value={team} />
              <input name="접두사" defaultValue={prefixMap[team] ?? ''} placeholder="예: 서노복102A" className={input} />
              <button type="submit" className={btn}>저장</button>
            </form>
          ))}
        </div>
      )}
    </main>
  );
}
