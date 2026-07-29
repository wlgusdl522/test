import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME, POSITION_LIST_SHEET_NAME, TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { btn, btnDanger, btnSecondary, h1, h2, input, pageWide } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addItemAction, deleteItemAction, moveItemAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // 매 요청마다 최신 시트/Supabase 값을 읽어야 하므로 빌드 타임 프리렌더 시도 자체를 막는다

const LISTS = [
  { name: TEAM_LIST_SHEET_NAME, label: '팀목록' },
  { name: POSITION_LIST_SHEET_NAME, label: '직급목록' },
  { name: APPROVAL_LINE_SHEET_NAME, label: '결재라인' },
];

export default async function SimpleListsSettingsPage() {
  const lists = await Promise.all(
    LISTS.map(async (list) => ({ ...list, items: await getSimpleList(list.name) }))
  );

  return (
    <main className={pageWide}>
      <h1 className={h1}>설정 &gt; 팀 / 직급 / 결재라인</h1>
      <div className="grid grid-cols-3 gap-6">
        {lists.map((list) => (
          <section key={list.name}>
            <h2 className={h2}>{list.label}</h2>
            <FormToggle label="추가">
              <form action={addItemAction} className="flex gap-2 mb-3">
                <input type="hidden" name="listName" value={list.name} />
                <input name="value" placeholder="추가할 값" required className={input} />
                <button type="submit" className={btn}>추가</button>
              </form>
            </FormToggle>
            <ul className="flex flex-col gap-1">
              {list.items.map((item, i) => (
                <li key={item} className="flex items-center gap-1.5 text-sm">
                  <span className="flex-1 text-zinc-800 dark:text-zinc-200">{item}</span>
                  <form action={moveItemAction}>
                    <input type="hidden" name="listName" value={list.name} />
                    <input type="hidden" name="value" value={item} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" disabled={i === 0} className={`${btnSecondary} disabled:opacity-30`}>위</button>
                  </form>
                  <form action={moveItemAction}>
                    <input type="hidden" name="listName" value={list.name} />
                    <input type="hidden" name="value" value={item} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" disabled={i === list.items.length - 1} className={`${btnSecondary} disabled:opacity-30`}>아래</button>
                  </form>
                  <form action={deleteItemAction}>
                    <input type="hidden" name="listName" value={list.name} />
                    <input type="hidden" name="value" value={item} />
                    <button type="submit" className={btnDanger}>삭제</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
