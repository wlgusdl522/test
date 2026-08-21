import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/auth-helpers';
import { getDutyLog, type DutyOrderType } from '@/lib/supabase/duty';
import { getActiveStaffList } from '@/lib/mutate/permissions';
import { getSimpleList } from '@/lib/mutate/simpleList';
import { TEAM_LIST_SHEET_NAME } from '@/lib/sheets/sheetIds';
import { driveThumbUrl } from '@/lib/drive/thumbUrl';
import { btn, card, h1, input, label, pageFluid, pageSubtitle } from '@/lib/ui';
import SignaturePad from '@/components/duty/SignaturePad';
import AbnormalCheckField from '@/components/duty/AbnormalCheckField';
import StaffCheckGroup from '@/components/duty/StaffCheckGroup';
import { saveDutySaturdayLogAction, saveDutySaturdaySignatureAction, saveDutyWeekdayLogAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHECK_FIELDS: { key: string; reasonKey: string; label: string }[] = [
  { key: '실별소등확인', reasonKey: '사유', label: '실별 소등 확인' },
  { key: '창문닫기', reasonKey: '사유2', label: '창문닫기' },
  { key: '출입문잠금', reasonKey: '사유3', label: '출입문잠금' },
];

const TEXT_FIELDS: { key: string; label: string }[] = [
  { key: '전화민원내용', label: '전화/민원 내용' },
  { key: '내방객및내방이유', label: '내방객 및 내방이유' },
  { key: '응급및비상시특이사항', label: '응급 및 비상시 특이사항' },
];

function splitNames(value?: string): string[] {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

function SignatureBox({ url, label: boxLabel }: { url?: string; label: string }) {
  const thumb = url ? driveThumbUrl(url, 300) : '';
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{boxLabel}</span>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={`${boxLabel} 서명`} className="h-[80px] w-auto rounded border border-zinc-200 bg-white dark:border-zinc-700" />
      ) : (
        <span className="text-sm text-zinc-400">서명 없음</span>
      )}
    </div>
  );
}

function ReadOnlyLog({ row }: { row: Record<string, string> }) {
  const rows = [
    ...CHECK_FIELDS.map((f) => ({ label: f.label, value: row[f.key], reason: row[f.reasonKey] })),
    ...TEXT_FIELDS.map((f) => ({ label: f.label, value: row[f.key] })),
    { label: '당직자 퇴근전 특근자 성명', value: row['퇴근전특근자성명'] },
    { label: '최종인계자', value: row['최종인계자'] },
  ];
  return (
    <div className="flex flex-col gap-3">
      {rows.map((f) => (
        <div key={f.label}>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">{f.label}</div>
          <div className="text-sm text-zinc-800 dark:text-zinc-100">
            {f.value || '-'}
            {'reason' in f && f.reason ? ` (${f.reason})` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function DutyLogPage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type: rawType, id } = await params;
  if (rawType !== 'weekday' && rawType !== 'saturday') notFound();
  const type = rawType as DutyOrderType;

  const row = await getDutyLog(type, id);
  if (!row) notFound();

  const [session, activeStaff, teams] = await Promise.all([
    auth(),
    getActiveStaffList(),
    getSimpleList(TEAM_LIST_SHEET_NAME),
  ]);
  const viewerEmail = (session?.user?.email ?? '').toLowerCase();
  const isAdmin = await isAdminEmail(viewerEmail);
  const staffGroups = teams
    .map((team) => ({ team, staff: activeStaff.filter((s) => s.team === team) }))
    .filter((g) => g.staff.length > 0);

  if (type === 'weekday') {
    const isOwner = isAdmin || (row['이메일'] ?? '').toLowerCase() === viewerEmail;
    return (
      <main className={pageFluid}>
        <h1 className={h1}>당직근무일지 (평일) · {row['근무일자']}</h1>
        <p className={pageSubtitle}>{row['이름']} · {row['소속']}</p>

        <div className={card}>
          {isOwner ? (
            <form action={saveDutyWeekdayLogAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={id} />
              {CHECK_FIELDS.map((f) => (
                <div key={f.key} className="sm:col-span-2">
                  <AbnormalCheckField
                    name={f.key}
                    reasonName={f.reasonKey}
                    label={f.label}
                    defaultValue={row[f.key]}
                    defaultReason={row[f.reasonKey]}
                  />
                </div>
              ))}
              {TEXT_FIELDS.map((f) => (
                <label key={f.key} className={`${label} sm:col-span-2`}>
                  {f.label}
                  <input name={f.key} defaultValue={row[f.key]} className={input} />
                </label>
              ))}
              <StaffCheckGroup
                name="퇴근전특근자성명"
                label="당직자 퇴근전 특근자 성명 (해당자 전체 선택)"
                type="checkbox"
                staffGroups={staffGroups}
                selectedNames={splitNames(row['퇴근전특근자성명'])}
              />
              <StaffCheckGroup
                name="최종인계자"
                label="최종인계자 (한 명 선택)"
                type="radio"
                staffGroups={staffGroups}
                selectedNames={splitNames(row['최종인계자'])}
              />
              <div className="sm:col-span-2">
                <p className={label}>서명</p>
                <SignaturePad name="signature" hasExisting={!!row['사인']} />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className={btn}>저장</button>
              </div>
            </form>
          ) : (
            <>
              <ReadOnlyLog row={row} />
              <div className="mt-3">
                <SignatureBox url={row['사인']} label="서명" />
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  const slots = [
    { slot: 1 as const, email: row['이메일1'], name: row['이름1'], team: row['소속1'], sign: row['사인1'] },
    { slot: 2 as const, email: row['이메일2'], name: row['이름2'], team: row['소속2'], sign: row['사인2'] },
  ];
  const isJournalOwner = isAdmin || slots.some((s) => (s.email ?? '').toLowerCase() === viewerEmail);

  return (
    <main className={pageFluid}>
      <h1 className={h1}>당직근무일지 (토요) · {row['근무일자']}</h1>
      <p className={pageSubtitle}>{slots.map((s) => s.name).filter(Boolean).join(', ')}</p>

      <div className={card}>
        {isJournalOwner ? (
          <form action={saveDutySaturdayLogAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            {CHECK_FIELDS.map((f) => (
              <div key={f.key} className="sm:col-span-2">
                <AbnormalCheckField
                  name={f.key}
                  reasonName={f.reasonKey}
                  label={f.label}
                  defaultValue={row[f.key]}
                  defaultReason={row[f.reasonKey]}
                />
              </div>
            ))}
            {TEXT_FIELDS.map((f) => (
              <label key={f.key} className={`${label} sm:col-span-2`}>
                {f.label}
                <input name={f.key} defaultValue={row[f.key]} className={input} />
              </label>
            ))}
            <StaffCheckGroup
              name="퇴근전특근자성명"
              label="당직자 퇴근전 특근자 성명 (해당자 전체 선택)"
              type="checkbox"
              staffGroups={staffGroups}
              selectedNames={splitNames(row['퇴근전특근자성명'])}
            />
            <StaffCheckGroup
              name="최종인계자"
              label="최종인계자 (한 명 선택)"
              type="radio"
              staffGroups={staffGroups}
              selectedNames={splitNames(row['최종인계자'])}
            />
            <div className="sm:col-span-2">
              <button type="submit" className={btn}>일지 저장</button>
            </div>
          </form>
        ) : (
          <ReadOnlyLog row={row} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {slots.map((s) => {
          const isOwner = isAdmin || (s.email ?? '').toLowerCase() === viewerEmail;
          return (
            <div key={s.slot} className={card}>
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {s.name || '(미배정)'} · {s.team}
              </p>
              {isOwner ? (
                <form action={saveDutySaturdaySignatureAction} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="slot" value={s.slot} />
                  <SignaturePad name="signature" hasExisting={!!s.sign} />
                  <button type="submit" className={`${btn} w-fit`}>서명 저장</button>
                </form>
              ) : (
                <SignatureBox url={s.sign} label="서명" />
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
