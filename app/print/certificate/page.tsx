import type { CSSProperties } from 'react';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { getAllCertificates } from '@/lib/supabase/certificate';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';
import PrintButton from '@/components/print/PrintButton';
import { card, inputBase } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VERIFY_PHRASE: Record<string, string> = {
  재직증명서: '위와 같이 재직하고 있음을 증명합니다.',
  경력증명서: '위와 같이 근무한 경력이 있음을 증명합니다.',
  원천징수영수증: '위 내용을 확인합니다.',
  기타: '위 내용을 확인합니다.',
};

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

export default async function CertificatePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const sorted = await getAllCertificates();
  const r = id ? sorted.find((x) => x.id === id) : sorted.find((x) => x.구분 === '증명서' && x.결재상태 === '승인');

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <select name="id" defaultValue={r?.id ?? ''} className={`${inputBase} w-auto`}>
            {sorted
              .filter((x) => x.구분 === '증명서')
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.종류} · {x.대상자성명} · {x.결재상태}
                </option>
              ))}
          </select>
          <button type="submit" className="text-sm text-brand hover:underline">선택</button>
        </form>
        <PrintButton />
      </div>

      {!r ? (
        <div className={card}><p className="text-sm text-zinc-500">증명서를 찾을 수 없습니다.</p></div>
      ) : r.결재상태 !== '승인' ? (
        <div className={card}><p className="text-sm text-zinc-500">아직 승인되지 않은 문서는 인쇄할 수 없습니다. (현재 상태: {r.결재상태})</p></div>
      ) : (
        <CertificateDoc record={r} origin={await getOrigin()} />
      )}
    </div>
  );
}

async function CertificateDoc({ record: r, origin }: { record: Record<string, string>; origin: string }) {
  const verifyUrl = `${origin}/verify/certificate/${r.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
  const { certificateSealImageUrl } = await getSystemSettings();
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;

  const lbl: CSSProperties = { border: '1px solid #333', background: '#f2f2f2', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', padding: '10px' };
  const cell: CSSProperties = { border: '1px solid #333', padding: '10px' };

  return (
    <div style={{ fontSize: 13.5, color: '#000', width: '186mm', margin: '0 auto' }} className="bg-white p-6 print:p-0">
      <div style={{ fontSize: 12 }}>제 {r.문서번호}호</div>

      <h2 style={{ textAlign: 'center', fontSize: 26, letterSpacing: 14, margin: '24px 0 32px' }}>{r.종류}</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td style={{ ...lbl, width: 120 }}>성&nbsp;&nbsp;&nbsp;&nbsp;명</td><td style={cell}>{r.대상자성명}</td></tr>
          <tr><td style={lbl}>소&nbsp;&nbsp;&nbsp;&nbsp;속</td><td style={cell}>{r.대상자소속}</td></tr>
          <tr><td style={lbl}>직&nbsp;&nbsp;&nbsp;&nbsp;위</td><td style={cell}>{r.대상자직위}</td></tr>
          <tr><td style={lbl}>기&nbsp;&nbsp;&nbsp;&nbsp;간</td><td style={cell}>{r.근무기간}</td></tr>
          <tr><td style={lbl}>용&nbsp;&nbsp;&nbsp;&nbsp;도</td><td style={cell}>{r.용도}</td></tr>
        </tbody>
      </table>

      <p style={{ textAlign: 'center', marginTop: 32, fontSize: 15 }}>
        {VERIFY_PHRASE[r.종류] ?? '위 내용을 확인합니다.'}
      </p>

      <div
        style={{
          marginTop: 56,
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #ddd',
          borderRadius: 8,
          background: '#fafafa',
          padding: 16,
          position: 'relative',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="발급 확인 QR코드" width={70} height={70} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 11 }}>{formatPrintDate(r.발급일)}</p>
          <p style={{ marginTop: 10, fontWeight: 700 }}>사회복지법인 새문안교회사회복지재단</p>
          <p style={{ marginTop: 4, fontSize: 18, fontWeight: 700 }}>서대문노인종합복지관장</p>
        </div>
        <div style={{ width: 70 }} />
        {sealDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sealDataUrl}
            alt=""
            width={54}
            height={54}
            style={{ position: 'absolute', top: 12, right: 96, opacity: 0.85 }}
          />
        )}
      </div>
    </div>
  );
}
