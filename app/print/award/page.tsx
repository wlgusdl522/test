import type { CSSProperties } from 'react';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { getAllCertificates } from '@/lib/supabase/certificate';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';
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

async function AwardDoc({
  record: r, origin, isLast,
}: { record: Record<string, string>; origin: string; isLast: boolean }) {
  const verifyUrl = `${origin}/verify/certificate/${r.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
  const { certificateSealImageUrl } = await getSystemSettings();
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;

  const pageStyle: CSSProperties = isLast ? {} : { pageBreakAfter: 'always' };

  return (
    <div
      style={{ ...pageStyle, fontSize: 13.5, color: '#000', width: '186mm', margin: '0 auto 40px' }}
      className="bg-white p-10 print:p-0"
    >
      <div style={{ fontSize: 12 }}>제 {r.문서번호}호</div>
      <h2 style={{ textAlign: 'center', fontSize: 28, letterSpacing: 12, margin: '32px 0 40px' }}>{r.종류 || '상장'}</h2>
      <p style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 32 }}>{r.대상자성명} 님</p>
      <p style={{ fontSize: 14, lineHeight: 1.9, textAlign: 'center', whiteSpace: 'pre-wrap', marginBottom: 40 }}>{r.본문}</p>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 12 }}>{formatPrintDate(r.발급일)}</p>
        <p style={{ marginTop: 12, fontWeight: 700, fontSize: 14 }}>사회복지법인 새문안교회사회복지재단</p>
        <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
          <p style={{ fontSize: 19, fontWeight: 700 }}>시립서대문노인종합복지관장</p>
          {sealDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sealDataUrl}
              alt="직인"
              width={58}
              height={58}
              style={{ position: 'absolute', top: -16, right: -10, opacity: 0.85 }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #ddd',
          borderRadius: 8,
          background: '#fafafa',
          padding: 12,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="발급 확인 QR코드" width={46} height={46} />
        <p style={{ flex: 1, marginLeft: 14, fontSize: 11, color: '#666' }}>
          QR 코드를 스캔하면 본 문서의 발급 진위 여부를 확인할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
