import { requireViewerEmail } from '@/lib/auth-helpers';
import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getItemCheckReportList } from '@/lib/mutate/itemCheckReport';
import { getVehicleRequestList } from '@/lib/mutate/vehicleRequest';
import { getVehicleLogList } from '@/lib/mutate/vehicleLog';
import { getSystemSettings } from '@/lib/mutate/settings';

export type PendingTask = {
  id: string;
  section: string;
  date: string;
  title: string;
  status: string;
};

function isMine(email: string | undefined, viewerEmail: string): boolean {
  return (email ?? '').toLowerCase() === viewerEmail;
}

function topN(list: Record<string, string>[], dateField: string, limit = 5): Record<string, string>[] {
  return [...list].sort((a, b) => String(b[dateField]).localeCompare(String(a[dateField]))).slice(0, limit);
}

export async function getMyRecordsSummary() {
  const viewerEmail = await requireViewerEmail();

  const [myLedgerAll, allPhotos, allReports, myVehicleRequestsAll, myVehicleLogsAll, settings] = await Promise.all([
    getCardLedgerList(),
    getItemCheckPhotoList(),
    getItemCheckReportList(),
    getVehicleRequestList(),
    getVehicleLogList(),
    getSystemSettings(),
  ]);

  const myLedger = myLedgerAll.filter((r) => isMine(r.담당자이메일, viewerEmail));
  const myPhotos = allPhotos.filter((r) => isMine(r.등록자이메일, viewerEmail));
  const myReports = allReports.filter((r) => isMine(r.검수자이메일, viewerEmail));
  const myVehicleRequests = myVehicleRequestsAll.filter((r) => isMine(r.신청자이메일, viewerEmail));
  const myVehicleLogs = myVehicleLogsAll.filter((r) => isMine(r.운전자이메일, viewerEmail));

  const threshold = settings.itemCheckReportThreshold;
  const pendingTasks: PendingTask[] = [];

  myLedger.forEach((r) => {
    const hasPhoto = allPhotos.some((p) => p.카드사용대장ID === r.id);
    const report = allReports.find((p) => p.카드사용대장ID === r.id);
    const amount = Number(r.사용금액 || 0);
    const reportRequired = threshold > 0 && amount >= threshold;
    if (!hasPhoto) pendingTasks.push({ id: r.id, section: 'cardLedger', date: r.사용일자, title: r.사용내역, status: '사진필요' });
    if (reportRequired && !report) pendingTasks.push({ id: r.id, section: 'cardLedger', date: r.사용일자, title: r.사용내역, status: '조서필수' });
  });
  myReports.forEach((r) => {
    if (r.결재상태 === '반려') pendingTasks.push({ id: r.id, section: 'itemCheckReport', date: r.검수년월일, title: r.품명, status: '조서반려' });
  });
  myVehicleRequests.forEach((r) => {
    const hasLog = myVehicleLogs.some((l) => l.신청ID === r.id);
    if (!hasLog) pendingTasks.push({ id: r.id, section: 'vehicleRequest', date: r.사용일자, title: `${r.차량번호} · ${r.목적}`, status: '운행일지 미작성' });
  });
  myVehicleLogs.forEach((r) => {
    if (r.결재상태 === '반려') pendingTasks.push({ id: r.id, section: 'vehicleLog', date: r.운행일자, title: `${r.차량번호} · ${r.목적}`, status: '운행일지 반려' });
    if (r.주유필요 === 'Y') pendingTasks.push({ id: r.id, section: 'vehicleLog', date: r.운행일자, title: `${r.차량번호} · ${r.목적}`, status: '주유필요' });
  });

  return {
    pendingTasks: pendingTasks.sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 10),
    cardLedger: topN(myLedger, '사용일자'),
    itemCheckPhoto: topN(myPhotos, '지출일자'),
    itemCheckReport: topN(myReports, '검수년월일'),
    vehicleRequest: topN(myVehicleRequests, '사용일자'),
    vehicleLog: topN(myVehicleLogs, '운행일자'),
  };
}

export async function getMyApprovalCount(): Promise<number> {
  const viewerEmail = await requireViewerEmail();
  const [reports, logs] = await Promise.all([getItemCheckReportList(), getVehicleLogList()]);
  const reportCount = reports.filter((r) => r.현재결재자이메일?.toLowerCase() === viewerEmail).length;
  const logCount = logs.filter((r) => r.현재결재자이메일?.toLowerCase() === viewerEmail).length;
  return reportCount + logCount;
}
