import { getBusinessList } from '@/lib/mutate/business';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { getStaffList } from '@/lib/mutate/staff';
import { POSITION_LIST_SHEET_NAME, TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { deleteStaffAction, registerStaffAction, updateStaffAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [staff, teams, positions, businesses] = await Promise.all([
    getStaffList(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
    getSimpleList(POSITION_LIST_SHEET_NAME),
    getBusinessList(),
  ]);

  const editing = edit ? staff.find((s) => s['이메일(아이디)'] === edit) : null;
  const selectedBusinesses = editing ? editing.담당사업.split(',').map((v) => v.trim()).filter(Boolean) : [];

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1>직원관리</h1>

      <form
        action={editing ? updateStaffAction : registerStaffAction}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, margin: '16px 0', border: '1px solid #ddd', padding: 16 }}
      >
        {editing && <input type="hidden" name="originalEmail" value={editing['이메일(아이디)']} />}

        <label>
          이메일(아이디) *
          <input
            name="email"
            defaultValue={editing ? editing['이메일(아이디)'].replace('@sdmsenior.or.kr', '') : ''}
            required
            style={{ width: '100%', padding: 6 }}
          />
          @sdmsenior.or.kr
        </label>
        <label>
          성명 *
          <input name="name" defaultValue={editing?.성명 ?? ''} required style={{ width: '100%', padding: 6 }} />
        </label>

        <label>
          소속팀
          <select name="team" defaultValue={editing?.소속팀 ?? teams[0] ?? ''} style={{ width: '100%', padding: 6 }}>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>
          직급/직책
          <select name="position" defaultValue={editing?.['직급/직책'] ?? positions[0] ?? ''} style={{ width: '100%', padding: 6 }}>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <div style={{ gridColumn: '1 / -1' }}>
          담당사업 (여러 개 선택 가능)
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {businesses.map((b) => (
              <label key={b.name} style={{ fontSize: 13 }}>
                <input type="checkbox" name="business" value={b.name} defaultChecked={selectedBusinesses.includes(b.name)} /> {b.name}
              </label>
            ))}
          </div>
        </div>

        <label>
          당직대상여부
          <select name="dutyEligible" defaultValue={editing?.당직대상여부 ?? 'Y'} style={{ width: '100%', padding: 6 }}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
        <label>
          재직상태
          <select name="status" defaultValue={editing?.재직상태 ?? '재직'} style={{ width: '100%', padding: 6 }}>
            <option value="재직">재직</option>
            <option value="휴직">휴직</option>
            <option value="퇴사">퇴사</option>
          </select>
        </label>

        <label>
          내선번호
          <input name="extension" defaultValue={editing?.내선번호 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          휴대폰번호
          <input name="mobile" defaultValue={editing?.휴대폰번호 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>

        <label>
          입사일
          <input type="date" name="hireDate" defaultValue={editing?.입사일 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          퇴사일
          <input type="date" name="resignDate" defaultValue={editing?.퇴사일 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>

        <label>
          휴직시작일
          <input type="date" name="leaveStart" defaultValue={editing?.휴직시작일 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label>
          휴직종료일(예정)
          <input type="date" name="leaveEnd" defaultValue={editing?.['휴직종료일(예정)'] ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>
        <label style={{ gridColumn: '1 / -1' }}>
          휴직사유
          <input name="leaveReason" defaultValue={editing?.휴직사유 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>

        <label style={{ gridColumn: '1 / -1' }}>
          비고
          <input name="note" defaultValue={editing?.비고 ?? ''} style={{ width: '100%', padding: 6 }} />
        </label>

        {!editing && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 16, alignItems: 'center' }}>
            <label><input type="radio" name="processType" value="신규생성" defaultChecked /> 신규 생성 (새 계정)</label>
            <label><input type="radio" name="processType" value="계정인계" /> 계정 인계 (기존 계정 이어받기)</label>
            <select name="prevEmail" style={{ padding: 4 }}>
              <option value="">이전 담당자 선택</option>
              {staff.map((s) => (
                <option key={s['이메일(아이디)']} value={s['이메일(아이디)']}>{s.성명} ({s['이메일(아이디)']})</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <button type="submit">{editing ? '저장' : '등록'}</button>
          {editing && <a href="/staff" style={{ marginLeft: 8 }}>취소</a>}
        </div>
      </form>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>이메일</th><th>성명</th><th>소속팀</th><th>직급/직책</th><th>재직상태</th><th></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s['이메일(아이디)']}>
              <td>{s['이메일(아이디)']}</td>
              <td>{s.성명}</td>
              <td>{s.소속팀}</td>
              <td>{s['직급/직책']}</td>
              <td>{s.재직상태}</td>
              <td>
                <a href={`/staff?edit=${encodeURIComponent(s['이메일(아이디)'])}`}>수정</a>
                {' '}
                <form action={deleteStaffAction} style={{ display: 'inline' }}>
                  <input type="hidden" name="email" value={s['이메일(아이디)']} />
                  <button type="submit">삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
