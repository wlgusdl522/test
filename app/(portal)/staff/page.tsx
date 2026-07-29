import { getBusinessList } from '@/lib/mutate/business';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { getStaffList } from '@/lib/mutate/staff';
import { POSITION_LIST_SHEET_NAME, TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { btn, btnDanger, btnSecondary, card, h1, input, label, pageWide, table, td, th } from '@/lib/ui';
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
    <main className={pageWide}>
      <h1 className={h1}>직원관리</h1>

      <form
        action={editing ? updateStaffAction : registerStaffAction}
        className={`${card} grid grid-cols-2 gap-3`}
      >
        {editing && <input type="hidden" name="originalEmail" value={editing['이메일(아이디)']} />}

        <label className={label}>
          이메일(아이디) *
          <div className="flex items-center gap-1">
            <input
              name="email"
              defaultValue={editing ? editing['이메일(아이디)'].replace('@sdmsenior.or.kr', '') : ''}
              required
              className={input}
            />
            <span className="whitespace-nowrap text-xs text-zinc-500">@sdmsenior.or.kr</span>
          </div>
        </label>
        <label className={label}>
          성명 *
          <input name="name" defaultValue={editing?.성명 ?? ''} required className={input} />
        </label>

        <label className={label}>
          소속팀
          <select name="team" defaultValue={editing?.소속팀 ?? teams[0] ?? ''} className={input}>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className={label}>
          직급/직책
          <select name="position" defaultValue={editing?.['직급/직책'] ?? positions[0] ?? ''} className={input}>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        <div className="col-span-2">
          <p className={label}>담당사업 (여러 개 선택 가능)</p>
          <div className="flex flex-wrap gap-3 mt-1">
            {businesses.map((b) => (
              <label key={b.name} className="text-xs text-zinc-700 dark:text-zinc-300">
                <input type="checkbox" name="business" value={b.name} defaultChecked={selectedBusinesses.includes(b.name)} /> {b.name}
              </label>
            ))}
          </div>
        </div>

        <label className={label}>
          당직대상여부
          <select name="dutyEligible" defaultValue={editing?.당직대상여부 ?? 'Y'} className={input}>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </label>
        <label className={label}>
          재직상태
          <select name="status" defaultValue={editing?.재직상태 ?? '재직'} className={input}>
            <option value="재직">재직</option>
            <option value="휴직">휴직</option>
            <option value="퇴사">퇴사</option>
          </select>
        </label>

        <label className={label}>
          내선번호
          <input name="extension" defaultValue={editing?.내선번호 ?? ''} className={input} />
        </label>
        <label className={label}>
          휴대폰번호
          <input name="mobile" defaultValue={editing?.휴대폰번호 ?? ''} className={input} />
        </label>

        <label className={label}>
          입사일
          <input type="date" name="hireDate" defaultValue={editing?.입사일 ?? ''} className={input} />
        </label>
        <label className={label}>
          퇴사일
          <input type="date" name="resignDate" defaultValue={editing?.퇴사일 ?? ''} className={input} />
        </label>

        <label className={label}>
          휴직시작일
          <input type="date" name="leaveStart" defaultValue={editing?.휴직시작일 ?? ''} className={input} />
        </label>
        <label className={label}>
          휴직종료일(예정)
          <input type="date" name="leaveEnd" defaultValue={editing?.['휴직종료일(예정)'] ?? ''} className={input} />
        </label>
        <label className={`${label} col-span-2`}>
          휴직사유
          <input name="leaveReason" defaultValue={editing?.휴직사유 ?? ''} className={input} />
        </label>

        <label className={`${label} col-span-2`}>
          비고
          <input name="note" defaultValue={editing?.비고 ?? ''} className={input} />
        </label>

        {!editing && (
          <div className="col-span-2 flex flex-wrap items-center gap-4 text-sm">
            <label><input type="radio" name="processType" value="신규생성" defaultChecked /> 신규 생성 (새 계정)</label>
            <label><input type="radio" name="processType" value="계정인계" /> 계정 인계 (기존 계정 이어받기)</label>
            <select name="prevEmail" className={`${input} w-auto`}>
              <option value="">이전 담당자 선택</option>
              {staff.map((s) => (
                <option key={s['이메일(아이디)']} value={s['이메일(아이디)']}>{s.성명} ({s['이메일(아이디)']})</option>
              ))}
            </select>
          </div>
        )}

        <div className="col-span-2 flex items-center gap-3">
          <button type="submit" className={btn}>{editing ? '저장' : '등록'}</button>
          {editing && <a href="/staff" className="text-xs text-zinc-500 hover:underline">취소</a>}
        </div>
      </form>

      <table className={table}>
        <thead>
          <tr>
            <th className={th}>이메일</th><th className={th}>성명</th><th className={th}>소속팀</th>
            <th className={th}>직급/직책</th><th className={th}>재직상태</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s['이메일(아이디)']}>
              <td className={td}>{s['이메일(아이디)']}</td>
              <td className={td}>{s.성명}</td>
              <td className={td}>{s.소속팀}</td>
              <td className={td}>{s['직급/직책']}</td>
              <td className={td}>{s.재직상태}</td>
              <td className={`${td} flex gap-1.5`}>
                <a href={`/staff?edit=${encodeURIComponent(s['이메일(아이디)'])}`} className={btnSecondary}>수정</a>
                <form action={deleteStaffAction}>
                  <input type="hidden" name="email" value={s['이메일(아이디)']} />
                  <button type="submit" className={btnDanger}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
