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
  재직증명서: '위 사실을 증명합니다.',
  경력증명서: '위 사실을 증명합니다.',
  원천징수영수증: '위 내용을 확인합니다.',
  기타: '위 내용을 확인합니다.',
};

// 실제 주민등록번호는 저장하지 않고, 생년월일+성별로 문서에 찍히는 마스킹된 형태만 재현한다.
function maskedResidentNumber(birth: string, gender: string): string {
  if (!birth) return '';
  const [y, m, d] = birth.split('-');
  if (!y || !m || !d) return '';
  const yy = y.slice(2);
  const isBefore2000 = Number(y) < 2000;
  const genderDigit = gender === '여' ? (isBefore2000 ? '2' : '4') : (isBefore2000 ? '1' : '3');
  return `${yy}${m}${d}-${genderDigit}******`;
}

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
  const sectionLabelCell: CSSProperties = { ...lbl, width: 56 };
  const isCareer = r.종류 === '경력증명서';

  return (
    <div style={{ fontSize: 13.5, color: '#000', width: '186mm', margin: '0 auto' }} className="bg-white p-6 print:p-0">
      <div style={{ fontSize: 12 }}>제 {r.문서번호}호</div>

      <h2 style={{ textAlign: 'center', fontSize: 25, fontWeight: 700, letterSpacing: 12, margin: '18px 0 24px' }}>{r.종류}</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <tbody>
          <tr>
            <td rowSpan={2} style={sectionLabelCell}>인적사항</td>
            <td style={{ ...lbl, width: 90 }}>성&nbsp;&nbsp;명</td><td style={cell}>{r.대상자성명}</td>
            <td style={{ ...lbl, width: 100 }}>주민등록번호</td><td style={cell}>{maskedResidentNumber(r.생년월일, r.성별)}</td>
          </tr>
          <tr>
            <td style={lbl}>주&nbsp;&nbsp;소</td><td style={cell} colSpan={3}>{r.대상자주소}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <tbody>
          <tr><td rowSpan={isCareer ? 5 : 4} style={sectionLabelCell}>{isCareer ? '경력사항' : '재직사항'}</td><td style={{ ...lbl, width: 120 }}>소&nbsp;&nbsp;&nbsp;&nbsp;속</td><td style={cell}>{r.대상자소속}</td></tr>
          <tr><td style={lbl}>직&nbsp;&nbsp;&nbsp;&nbsp;위</td><td style={cell}>{r.대상자직위}</td></tr>
          <tr><td style={lbl}>기&nbsp;&nbsp;&nbsp;&nbsp;간</td><td style={cell}>{r.근무기간}</td></tr>
          <tr><td style={lbl}>담당업무</td><td style={cell}>{r.담당업무}</td></tr>
          {isCareer && <tr><td style={lbl}>퇴직사유</td><td style={cell}>{r.퇴직사유}</td></tr>}
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <tbody>
          <tr><td style={{ ...lbl, width: 120 }}>용&nbsp;&nbsp;&nbsp;&nbsp;도</td><td style={cell}>{r.용도}</td></tr>
          <tr><td style={lbl}>비&nbsp;&nbsp;&nbsp;&nbsp;고</td><td style={cell}>{r.비고}</td></tr>
        </tbody>
      </table>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 15 }}>
        {VERIFY_PHRASE[r.종류] ?? '위 내용을 확인합니다.'}
      </p>

      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 15 }}>{formatPrintDate(r.발급일)}</p>
        <p style={{ marginTop: 14, fontWeight: 700, fontSize: 15 }}>사회복지법인 새문안교회사회복지재단</p>
        <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
          <p style={{ fontSize: 27, fontWeight: 700 }}>시립서대문노인종합복지관장</p>
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
