import { getBusinessList } from '@/lib/mutate/business';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { addBusinessAction, deleteBusinessAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function BusinessListSettingsPage() {
  const [businesses, teams] = await Promise.all([getBusinessList(), getSimpleList(TEAM_LIST_SHEET_NAME)]);

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 560, margin: '0 auto' }}>
      <h1>설정 &gt; 사업목록</h1>

      <form action={addBusinessAction} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input name="name" placeholder="새 사업명" required style={{ flex: 1, padding: 6 }} />
        <select name="team" required style={{ padding: 6 }}>
          <option value="">소관팀 선택</option>
          {teams.map((team) => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
        <button type="submit">추가</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {businesses.map((b) => (
          <li key={b.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ flex: 1 }}>{b.name}</span>
            <span style={{ color: '#666', fontSize: 13 }}>{b.team}</span>
            <form action={deleteBusinessAction}>
              <input type="hidden" name="name" value={b.name} />
              <button type="submit">삭제</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
