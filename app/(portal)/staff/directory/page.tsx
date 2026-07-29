import { getActiveStaffDirectory } from '@/lib/mutate/staff';
import { h1, page, table, tableWrap, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function StaffDirectoryPage() {
  const staff = await getActiveStaffDirectory();
  const sorted = [...staff].sort((a, b) => a.소속팀.localeCompare(b.소속팀) || a.성명.localeCompare(b.성명));

  return (
    <main className={page}>
      <h1 className={h1}>전직원 주소록</h1>

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>소속팀</th><th className={th}>성명</th><th className={th}>직급/직책</th>
            <th className={th}>내선번호</th><th className={th}>휴대폰번호</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s['이메일(아이디)']}>
              <td className={td}>{s.소속팀}</td>
              <td className={td}>{s.성명}</td>
              <td className={td}>{s['직급/직책']}</td>
              <td className={td}>{s.내선번호}</td>
              <td className={td}>{s.휴대폰번호}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </main>
  );
}
