import { getAccountHistory } from '@/lib/mutate/accountHistory';
import { btn, card, h1, input, label, pageWide, table, tableWrap, td, th } from '@/lib/ui';
import { addAccountHistoryAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function AccountHistoryPage() {
  const records = await getAccountHistory();
  const sorted = [...records].sort((a, b) => b.처리일자.localeCompare(a.처리일자));

  return (
    <main className={pageWide}>
      <h1 className={h1}>인사관리 &gt; 계정관리</h1>

      <form action={addAccountHistoryAction} className={`${card} grid grid-cols-2 gap-3`}>
        <label className={label}>
          처리일자
          <input type="date" name="date" className={input} />
        </label>
        <label className={label}>
          처리구분 *
          <select name="type" className={input}>
            <option value="신규생성">신규생성</option>
            <option value="계정인계">계정인계</option>
          </select>
        </label>
        <label className={label}>
          이전 이메일(계정인계 시에만)
          <input name="prevEmail" className={input} />
        </label>
        <label className={label}>
          이전 담당자(성명)
          <input name="prevName" className={input} />
        </label>
        <label className={label}>
          신규 이메일(계정) *
          <input name="newEmail" required className={input} />
        </label>
        <label className={label}>
          신규 담당자(성명)
          <input name="newName" className={input} />
        </label>
        <label className={label}>
          인계 사유/담당사업
          <input name="reason" className={input} />
        </label>
        <label className={label}>
          인계 범위(비고)
          <input name="scope" className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          비고
          <input name="note" className={input} />
        </label>
        <div>
          <button type="submit" className={btn}>등록</button>
        </div>
      </form>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>처리일자</th><th className={th}>처리구분</th><th className={th}>이전 이메일</th><th className={th}>이전 담당자</th>
            <th className={th}>신규 이메일</th><th className={th}>신규 담당자</th><th className={th}>사유/사업</th><th className={th}>처리자</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td className={td}>{r.처리일자}</td>
              <td className={td}>{r.처리구분}</td>
              <td className={td}>{r['이전 이메일(계정)']}</td>
              <td className={td}>{r['이전 담당자(성명)']}</td>
              <td className={td}>{r['신규 이메일(계정)']}</td>
              <td className={td}>{r['신규 담당자(성명)']}</td>
              <td className={td}>{r['인계 사유/담당사업']}</td>
              <td className={td}>{r['처리자(총무)']}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </main>
  );
}
