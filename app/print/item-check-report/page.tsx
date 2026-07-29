import type { CSSProperties } from 'react';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { ITEM_CHECK_REPORT_TABLE } from '@/lib/sheets/registry';
import { getStaffList } from '@/lib/mutate/staff';
import { parseApprovalHistory, type ApprovalHistoryEntry } from '@/lib/approval/engine';
import { driveThumbUrl } from '@/lib/drive/thumbUrl';
import PrintButton from '@/components/print/PrintButton';
import { card, input } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatPrintDate(iso: string): string {
  const parts = String(iso || '').split('-');
  if (parts.length < 3) return iso || '';
  return `${parts[0]}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 13, height: 13, border: '1.3px solid #333', textAlign: 'center', lineHeight: '12px', fontSize: 10, marginRight: 4, verticalAlign: 'middle' }}>
      {checked ? '✓' : ''}
    </span>
  );
}

function StampBox({ url }: { url: string }) {
  const thumb = url ? driveThumbUrl(url) : '';
  return (
    <span style={{ position: 'relative', display: 'inline-block', padding: '0 2px' }}>
      (인)
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', maxWidth: 34, maxHeight: 34, opacity: 0.85 }} />
      )}
    </span>
  );
}

function getStepInfo(history: ApprovalHistoryEntry[], step: string, currentStep: string, currentName: string, currentEmail: string) {
  const approved = [...history].reverse().find((h) => h.단계 === step && h.액션 === '승인');
  if (approved) return { name: approved.승인자명.replace(/\s*\(관리자 대리처리\)\s*$/, ''), email: approved.승인자이메일, approved: true };
  if (currentStep === step) return { name: currentName, email: currentEmail, approved: false };
  return { name: '', email: '', approved: false };
}

export default async function ItemCheckReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const [reports, staffList] = await Promise.all([
    getKeyedList(ITEM_CHECK_REPORT_TABLE),
    getStaffList(),
  ]);
  const sorted = [...reports].reverse();
  const r = id ? sorted.find((x) => x.id === id) : sorted[0];

  const findStaff = (email: string) => staffList.find((s) => s['이메일(아이디)'] === email);

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="id" defaultValue={r?.id ?? ''} className={`${input} w-auto`}>
            {sorted.map((x) => (
              <option key={x.id} value={x.id}>
                {x.검수년월일} · {x.품명} · {x.검수자명}
              </option>
            ))}
          </select>
          <button type="submit" className="text-sm text-brand hover:underline">선택</button>
        </form>
        <PrintButton />
      </div>

      {!r ? (
        <div className={card}><p className="text-sm text-zinc-500">조서를 찾을 수 없습니다.</p></div>
      ) : (
        <ItemCheckReportDoc record={r} findStaff={findStaff} />
      )}
    </div>
  );
}

function ItemCheckReportDoc({
  record: r,
  findStaff,
}: {
  record: Record<string, string>;
  findStaff: (email: string) => Record<string, string> | undefined;
}) {
  const isTarget = r.등록구분 === '등록대상';
  const steps = isTarget ? ['과장', '물품관리자'] : ['과장'];
  const history = parseApprovalHistory(r.결재이력JSON);
  const done = new Set(history.filter((h) => h.액션 === '승인').map((h) => h.단계));
  const currentStep = r.결재상태 === '결재중' ? steps.find((s) => !done.has(s)) ?? '' : '';

  const checkerStaff = findStaff(r.검수자이메일);
  const checkerPosition = checkerStaff?.['직급/직책'] ?? '';
  const checkerStamp = checkerStaff?.['도장'] ?? '';

  const gwajang = getStepInfo(history, '과장', currentStep, '', '');
  const gwajangStaff = gwajang.approved ? findStaff(gwajang.email) : undefined;
  const gwajangStamp = gwajangStaff?.['도장'] ?? '';

  const assetMgr = isTarget ? getStepInfo(history, '물품관리자', currentStep, '', '') : null;
  const assetMgrStaff = assetMgr?.approved ? findStaff(assetMgr.email) : undefined;
  const assetMgrStamp = assetMgrStaff?.['도장'] ?? '';

  const lbl: CSSProperties = { border: '1px solid #333', background: '#f2f2f2', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', padding: '7px 10px' };
  const cell: CSSProperties = { border: '1px solid #333', padding: '7px 10px' };

  return (
    <div style={{ fontSize: 13.5, color: '#000', width: '186mm', margin: '0 auto' }} className="bg-white p-6 print:p-0">
      <h2 style={{ textAlign: 'center', fontSize: 22, letterSpacing: 10, marginBottom: 18 }}>물품검수조서</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={{ ...lbl, width: 110 }}>품&nbsp;&nbsp;&nbsp;&nbsp;명</td><td colSpan={3} style={cell}>{r.품명}</td></tr>
          <tr><td style={{ ...lbl }} rowSpan={2}>납&nbsp;&nbsp;품&nbsp;&nbsp;처</td><td style={{ ...lbl, width: 80 }}>상&nbsp;&nbsp;호</td><td colSpan={2} style={cell}>{r.납품처상호}</td></tr>
          <tr><td style={lbl}>대&nbsp;&nbsp;표&nbsp;&nbsp;자</td><td colSpan={2} style={cell}>{r.납품처대표자}</td></tr>
          <tr><td style={lbl}>계&nbsp;약&nbsp;금&nbsp;액</td><td colSpan={3} style={{ ...cell, textAlign: 'center' }}>{Number(r.계약금액 || 0).toLocaleString()}원</td></tr>
          <tr><td style={lbl}>계약체결년월일</td><td colSpan={3} style={cell}>{formatPrintDate(r.계약체결년월일)}</td></tr>
          <tr><td style={lbl}>납&nbsp;품&nbsp;기&nbsp;한</td><td style={cell}>{formatPrintDate(r.납품기한)}</td><td style={lbl}>납품(완료)일자</td><td style={cell}>{formatPrintDate(r.납품완료일자)}</td></tr>
          <tr><td style={lbl}>검&nbsp;수&nbsp;년&nbsp;월&nbsp;일</td><td style={cell}>{formatPrintDate(r.검수년월일)}</td><td style={lbl}>검수장소</td><td style={cell}>{r.검수장소}</td></tr>
          <tr>
            <td style={lbl}>물품관리시스템<br />등록대상구분</td>
            <td colSpan={3} style={cell}>
              <Checkbox checked={isTarget} />등록대상 &nbsp;&nbsp;&nbsp; <Checkbox checked={!isTarget} />비대상
            </td>
          </tr>
          <tr><td colSpan={4} style={{ ...lbl, textAlign: 'center' }}>검 수 내 용</td></tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={lbl}>품명(내용)</th><th style={lbl}>규격</th><th style={lbl}>단위</th><th style={lbl}>수량</th>
            <th style={lbl}>단가</th><th style={lbl}>금액</th><th style={lbl}>{isTarget ? '비품등록번호' : '비고'}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...cell, textAlign: 'center' }}>{r.품목명 || r.품명}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{r.규격}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{r.단위}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{r.수량}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{Number(r.단가 || 0) ? `${Number(r.단가).toLocaleString()}원` : ''}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{Number(r.금액 || 0) ? `${Number(r.금액).toLocaleString()}원` : ''}</td>
            <td style={{ ...cell, textAlign: 'center' }}>{isTarget ? r.비품등록번호 : r.비고}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 24 }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          위와 같이 검수하였습니다.<br />{formatPrintDate(r.검수년월일)}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, whiteSpace: 'nowrap' }}>
            검수자: {checkerPosition} {r.검수자명}<StampBox url={checkerStamp} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, whiteSpace: 'nowrap' }}>
            확인자: 과장 {gwajang.name}<StampBox url={gwajang.approved ? gwajangStamp : ''} />
          </div>
        </div>
        {isTarget ? (
          <div style={{ width: 100, flexShrink: 0 }}>
            <div style={{ border: '1px solid #333', textAlign: 'center', padding: '8px 4px', marginBottom: 8, fontSize: 11.5, fontWeight: 600, minHeight: 50 }}>
              물품출납원<Checkbox checked={false} />
            </div>
            <div style={{ border: '1px solid #333', textAlign: 'center', padding: '8px 4px', marginBottom: 8, fontSize: 11.5, fontWeight: 600, minHeight: 50 }}>
              물품관리자<Checkbox checked={!!assetMgr?.approved} />
              {assetMgr?.approved && assetMgrStamp && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={driveThumbUrl(assetMgrStamp)} alt="" style={{ maxWidth: 34, maxHeight: 34, verticalAlign: 'middle' }} />
              )}
            </div>
          </div>
        ) : (
          <div style={{ width: 100, flexShrink: 0 }} />
        )}
      </div>
    </div>
  );
}
