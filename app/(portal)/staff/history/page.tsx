import { getAccountHistory } from '@/lib/mutate/accountHistory';
import { addAccountHistoryAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AccountHistoryPage() {
  const records = await getAccountHistory();
  const sorted = [...records].sort((a, b) => b.처리일자.localeCompare(a.처리일자));

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>인사관리 &gt; 계정관리</h1>

      <form action={addAccountHistoryAction} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '16px 0', border: '1px solid #ddd', padding: 16 }}>
        <label>
          처리일자
          <input type="date" name="date" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          처리구분 *
          <select name="type" style={{ width: '100%', padding: 6 }}>
            <option value="신규생성">신규생성</option>
            <option value="계정인계">계정인계</option>
          </select>
        </label>
        <label>
          이전 이메일(계정인계 시에만)
          <input name="prevEmail" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          이전 담당자(성명)
          <input name="prevName" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          신규 이메일(계정) *
          <input name="newEmail" required style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          신규 담당자(성명)
          <input name="newName" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          인계 사유/담당사업
          <input name="reason" style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          인계 범위(비고)
          <input name="scope" style={{ width: '100%', padding: 6 }} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          비고
          <input name="note" style={{ width: '100%', padding: 6 }} />
        </label>
        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit">등록</button>
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>처리일자</th><th>처리구분</th><th>이전 이메일</th><th>이전 담당자</th>
            <th>신규 이메일</th><th>신규 담당자</th><th>사유/사업</th><th>처리자</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td>{r.처리일자}</td>
              <td>{r.처리구분}</td>
              <td>{r['이전 이메일(계정)']}</td>
              <td>{r['이전 담당자(성명)']}</td>
              <td>{r['신규 이메일(계정)']}</td>
              <td>{r['신규 담당자(성명)']}</td>
              <td>{r['인계 사유/담당사업']}</td>
              <td>{r['처리자(총무)']}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
