import { getSimpleList } from '@/lib/mutate/simpleList';
import { APPROVAL_LINE_SHEET_NAME, POSITION_LIST_SHEET_NAME, TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
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
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto' }}>
      <h1>설정 &gt; 팀 / 직급 / 결재라인</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 16 }}>
        {lists.map((list) => (
          <section key={list.name}>
            <h2 style={{ fontSize: 16 }}>{list.label}</h2>
            <form action={addItemAction} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
              <input type="hidden" name="listName" value={list.name} />
              <input name="value" placeholder="추가할 값" required style={{ flex: 1, padding: 6 }} />
              <button type="submit">추가</button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {list.items.map((item, i) => (
                <li key={item} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ flex: 1 }}>{item}</span>
                  <form action={moveItemAction}>
                    <input type="hidden" name="listName" value={list.name} />
                    <input type="hidden" name="value" value={item} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" disabled={i === 0}>위</button>
                  </form>
                  <form action={moveItemAction}>
                    <input type="hidden" name="listName" value={list.name} />
                    <input type="hidden" name="value" value={item} />
                    <input type="hidden" name="direction" value="down" />
                    <button type="submit" disabled={i === list.items.length - 1}>아래</button>
                  </form>
                  <form action={deleteItemAction}>
                    <input type="hidden" name="listName" value={list.name} />
                    <input type="hidden" name="value" value={item} />
                    <button type="submit">삭제</button>
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
