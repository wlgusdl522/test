import { getActiveStaffDirectory } from '@/lib/mutate/staff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function StaffDirectoryPage() {
  const staff = await getActiveStaffDirectory();
  const sorted = [...staff].sort((a, b) => a.소속팀.localeCompare(b.소속팀) || a.성명.localeCompare(b.성명));

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto' }}>
      <h1>전직원 주소록</h1>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>소속팀</th><th>성명</th><th>직급/직책</th><th>내선번호</th><th>휴대폰번호</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s['이메일(아이디)']}>
              <td>{s.소속팀}</td>
              <td>{s.성명}</td>
              <td>{s['직급/직책']}</td>
              <td>{s.내선번호}</td>
              <td>{s.휴대폰번호}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
