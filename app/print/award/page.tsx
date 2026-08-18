import type { CSSProperties } from 'react';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { getAllCertificates } from '@/lib/supabase/certificate';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';
import { getStaffList } from '@/lib/mutate/staff';
import PrintButton from '@/components/print/PrintButton';
import { card } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatPrintDate(iso: string): string {
  const parts = String(iso || '').split('-');
  if (parts.length < 3) return iso || '';
  return `${parts[0]}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

// "선택한 상장 인쇄" — 관리 탭에서 체크한 여러 상장을 한 번에 A4 연속 페이지로 인쇄한다.
// id를 하나도 지정하지 않으면 승인 완료된 상장 전체를 보여준다.
export default async function AwardPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  const idList = id ? (Array.isArray(id) ? id : [id]) : [];
  const all = await getAllCertificates();
  const records = idList.length > 0
    ? idList.map((x) => all.find((r) => r.id === x)).filter((r): r is Record<string, string> => !!r)
    : all.filter((r) => r.구분 === '상장' && r.결재상태 === '승인');

  const origin = await getOrigin();

  return (
    <div className="p-6">
      {/* 상장 테두리가 미리 인쇄된 용지에 맞춰야 해서, 전역 @page 12mm 여백(globals.css) 대신
          이 페이지만 여백 0으로 — 절대좌표가 실제 용지 모서리 기준으로 계산되어 있다. */}
      <style>{'@media print { @page { margin: 0; } }'}</style>
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <p className="text-sm text-zinc-500">{records.length}건 인쇄</p>
        <PrintButton />
      </div>

      {records.length === 0 ? (
        <div className={card}><p className="text-sm text-zinc-500">인쇄할 상장을 찾을 수 없습니다.</p></div>
      ) : (
        records.map((r, i) => <AwardDoc key={r.id} record={r} origin={origin} isLast={i === records.length - 1} />)
      )}
    </div>
  );
}

// 실제 상장 테두리 인쇄용지에 맞춰야 해서, 원본 한글 양식 PDF를 pdfjs로 파싱해 얻은 실측 좌표(pt)를
// 그대로 절대좌표로 재현한다(lib/pdf/awardPdf.tsx와 동일한 수치 — 두 렌더링 경로가 어긋나면 안 됨).
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const CONTENT_LEFT = 96;
const CONTENT_RIGHT = 96;
const CONTENT_WIDTH = A4_WIDTH_PT - CONTENT_LEFT - CONTENT_RIGHT;

async function AwardDoc({
  record: r, origin, isLast,
}: { record: Record<string, string>; origin: string; isLast: boolean }) {
  const verifyUrl = `${origin}/verify/certificate/${r.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1 });
  const [{ certificateSealImageUrl }, staffList] = await Promise.all([getSystemSettings(), getStaffList()]);
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;
  const directorName = staffList.find((s) => s['재직상태'] === '재직' && s['직급/직책'] === '관장')?.['성명'] ?? '';

  const pageStyle: CSSProperties = isLast ? {} : { pageBreakAfter: 'always' };

  return (
    <div
      style={{
        ...pageStyle,
        position: 'relative',
        fontFamily: '"바탕체", "바탕", Batang, serif',
        color: '#000',
        width: `${A4_WIDTH_PT}pt`,
        height: `${A4_HEIGHT_PT}pt`,
        margin: '0 auto 40px',
      }}
      className="bg-white print:m-0"
    >
      <div style={{ position: 'absolute', top: 108, left: CONTENT_LEFT, fontSize: 15 }}>제 {r.문서번호}호</div>

      <h2 style={{ position: 'absolute', top: 193, left: 0, right: 0, textAlign: 'center', fontSize: 38, fontWeight: 700, letterSpacing: 19, margin: 0 }}>
        {r.종류 || '상장'}
      </h2>

      <p style={{ position: 'absolute', top: 306, left: CONTENT_LEFT, width: CONTENT_WIDTH, textAlign: 'right', fontSize: 20, letterSpacing: 10, margin: 0 }}>
        성 명 : {r.대상자성명}
      </p>

      <p
        style={{
          position: 'absolute', top: 390, left: CONTENT_LEFT, width: CONTENT_WIDTH,
          fontSize: 22, lineHeight: 2.15, textAlign: 'justify', textIndent: 12, whiteSpace: 'pre-wrap', margin: 0,
        }}
      >
        {r.본문}
      </p>

      <p style={{ position: 'absolute', top: 650, left: 0, right: 0, textAlign: 'center', fontSize: 17, margin: 0 }}>
        {formatPrintDate(r.발급일)}
      </p>

      <div style={{ position: 'absolute', top: 700, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ marginRight: 10, fontSize: 10.5, lineHeight: 1.25, textAlign: 'center' }}>
          <div>사회복지</div>
          <div>법 인</div>
        </div>
        <div style={{ fontSize: 19, fontWeight: 700 }}>새 문 안 교 회 사 회 복 지 재 단</div>
      </div>

      <div style={{ position: 'absolute', top: 735, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 18.9, fontWeight: 700, margin: 0 }}>시립서대문노인종합복지관장{directorName ? ` ${directorName}` : ''}</p>
          {sealDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sealDataUrl}
              alt="직인"
              width={56}
              height={56}
              style={{ position: 'absolute', top: -16, right: -20, opacity: 0.85 }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          position: 'absolute', top: 786, left: CONTENT_LEFT, width: CONTENT_WIDTH,
          display: 'flex', alignItems: 'center',
          border: '1px solid #ddd', borderRadius: 8, background: '#fafafa', padding: 10,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="발급 확인 QR코드" width={40} height={40} />
        <p style={{ flex: 1, marginLeft: 12, fontSize: 9, color: '#666', margin: 0 }}>
          QR 코드를 스캔하면 본 문서의 발급 진위 여부를 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
