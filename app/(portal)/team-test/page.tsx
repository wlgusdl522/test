import { getTeamList } from '@/lib/mutate/team';
import { addTeamAction, deleteTeamAction, moveTeamAction } from './actions';

export const runtime = 'nodejs';

export default async function TeamTestPage() {
  const teams = await getTeamList();

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>
      <h1>팀목록 (Phase 0 증명용 임시 화면)</h1>
      <p style={{ color: '#666', fontSize: 14 }}>
        읽기는 Supabase에서, 추가/삭제/이동은 실제 구글시트에 반영 후 Supabase에 미러링합니다.
      </p>

      <form action={addTeamAction} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input name="value" placeholder="팀 이름" required style={{ flex: 1, padding: 6 }} />
        <button type="submit">추가</button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {teams.map((team, i) => (
          <li key={team} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ flex: 1 }}>{team}</span>
            <form action={moveTeamAction}>
              <input type="hidden" name="value" value={team} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" disabled={i === 0}>위</button>
            </form>
            <form action={moveTeamAction}>
              <input type="hidden" name="value" value={team} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" disabled={i === teams.length - 1}>아래</button>
            </form>
            <form action={deleteTeamAction}>
              <input type="hidden" name="value" value={team} />
              <button type="submit">삭제</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
