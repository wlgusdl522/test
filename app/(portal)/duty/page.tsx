import { auth } from '@/auth';
import { getDutyHolidays, getDutySaturdayLogs, getDutyWeekdayLogs } from '@/lib/supabase/duty';
import { getStaffList } from '@/lib/mutate/staff';
import { ADMIN_EMAILS } from '@/lib/auth-helpers';
import { h1, pageFluid, pageSubtitle } from '@/lib/ui';
import DutyClient from '@/components/duty/DutyClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function DutyPage() {
  const [weekdayLogs, saturdayLogs, holidays, staffAll, session] = await Promise.all([
    getDutyWeekdayLogs(),
    getDutySaturdayLogs(),
    getDutyHolidays(),
    getStaffList(),
    auth(),
  ]);
  const activeStaff = staffAll.filter((s) => s['재직상태'] === '재직');
  const viewerEmail = (session?.user?.email ?? '').toLowerCase();
  const isAdmin = ADMIN_EMAILS.includes(viewerEmail);

  return (
    <main className={pageFluid}>
      <div className="mb-4">
        <h1 className={h1}>당직근무</h1>
        <p className={pageSubtitle}>
          날짜를 클릭하면 현황을 보고 근무일지를 작성할 수 있고, 더블클릭하면 담당자를 교체할 수 있습니다.
        </p>
      </div>
      <DutyClient
        weekdayLogs={weekdayLogs}
        saturdayLogs={saturdayLogs}
        holidays={holidays}
        staff={activeStaff}
        viewerEmail={viewerEmail}
        isAdmin={isAdmin}
      />
    </main>
  );
}
