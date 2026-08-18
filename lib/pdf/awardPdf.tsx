import path from 'path';
import QRCode from 'qrcode';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';

// 상장/임명장/수료증 — 재직·경력증명서와 달리 인적사항/재직사항 표가 없고, 담당자가 자유롭게
// 작성한 본문을 그대로 싣는다. 결재란은 없다(서무/회계 단독승인 후 즉시 발행되는 구조라
// 재직/경력증명서처럼 별도 결재 흐름이 문서에 남을 일이 없음).

let fontRegistered = false;
function ensureFont() {
  if (fontRegistered) return;
  Font.register({ family: 'NotoSansKR', src: path.join(process.cwd(), 'lib/pdf/fonts/NotoSansKR-Variable.ttf') });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 56, fontFamily: 'NotoSansKR', fontSize: 12, color: '#000' },
  docNumber: { fontSize: 10, marginBottom: 24 },
  title: { textAlign: 'center', fontSize: 28, letterSpacing: 10, marginTop: 24, marginBottom: 40 },
  recipient: { textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 32 },
  body: { fontSize: 13, lineHeight: 1.9, marginBottom: 40, textAlign: 'center' },
  closingBlock: { marginTop: 40, alignItems: 'center' },
  closingDate: { fontSize: 11 },
  closingOrgName: { marginTop: 12, fontWeight: 700, fontSize: 13 },
  closingTitleRow: { marginTop: 8, position: 'relative' },
  closingTitle: { fontSize: 18, fontWeight: 700 },
  sealImage: { position: 'absolute', width: 58, height: 58, opacity: 0.85, top: -16, right: -10 },
  qrBar: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    padding: 12,
  },
  qrBarImage: { width: 46, height: 46 },
  qrBarText: { flex: 1, marginLeft: 14, fontSize: 9.5, color: '#666' },
});

function formatPrintDate(iso: string): string {
  const parts = String(iso || '').split('-');
  if (parts.length < 3) return iso || '';
  return `${parts[0]}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
}

export async function renderAwardPdf(record: Record<string, string>, verifyUrl: string): Promise<Buffer> {
  ensureFont();
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
  const { certificateSealImageUrl } = await getSystemSettings();
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.docNumber}>제 {record['문서번호']}호</Text>

        <Text style={styles.title}>{record['종류'] || '상장'}</Text>

        <Text style={styles.recipient}>{record['대상자성명']} 님</Text>

        <Text style={styles.body}>{record['본문']}</Text>

        <View style={styles.closingBlock}>
          <Text style={styles.closingDate}>{formatPrintDate(record['발급일'])}</Text>
          <Text style={styles.closingOrgName}>사회복지법인 새문안교회사회복지재단</Text>
          <View style={styles.closingTitleRow}>
            <Text style={styles.closingTitle}>시립서대문노인종합복지관장</Text>
            {sealDataUrl && <Image src={sealDataUrl} style={styles.sealImage} />}
          </View>
        </View>

        <View style={styles.qrBar}>
          <Image src={qrDataUrl} style={styles.qrBarImage} />
          <Text style={styles.qrBarText}>QR 코드를 스캔하면 본 문서의 발급 진위 여부를 확인할 수 있습니다.</Text>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
