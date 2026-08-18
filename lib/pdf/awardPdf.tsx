import path from 'path';
import QRCode from 'qrcode';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';
import { getStaffList } from '@/lib/mutate/staff';

// 기관에서 실제 쓰던 표창장/우수상 한글 양식(제N-N호 / 중앙 큰 제목 / 우측 정렬 "성 명 : OOO" /
// 양쪽정렬 본문 / 중앙 날짜·기관명·관장 직함+성명)을 그대로 재현한다. 원본엔 없지만 QR·직인은
// 재직/경력증명서와 동일한 위변조 확인용 하단 박스로 추가한다.

let fontRegistered = false;
function ensureFont() {
  if (fontRegistered) return;
  Font.register({ family: 'NotoSansKR', src: path.join(process.cwd(), 'lib/pdf/fonts/NotoSansKR-Variable.ttf') });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 64, fontFamily: 'NotoSansKR', fontSize: 12, color: '#000' },
  docNumber: { fontSize: 11, marginBottom: 40 },
  title: { textAlign: 'center', fontSize: 32, fontWeight: 700, letterSpacing: 14, marginBottom: 56 },
  recipientRow: { textAlign: 'right', fontSize: 18, letterSpacing: 4, marginBottom: 48 },
  body: { fontSize: 14, lineHeight: 2, textAlign: 'justify', textIndent: 28, marginBottom: 56 },
  closingBlock: { marginTop: 24, alignItems: 'center' },
  closingDate: { fontSize: 12 },
  closingOrgName: { marginTop: 14, fontWeight: 700, fontSize: 14 },
  closingTitleRow: { marginTop: 10, position: 'relative' },
  closingTitle: { fontSize: 17, fontWeight: 700 },
  sealImage: { position: 'absolute', width: 58, height: 58, opacity: 0.85, top: -18, right: -16 },
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
  const [{ certificateSealImageUrl }, staffList] = await Promise.all([getSystemSettings(), getStaffList()]);
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;
  const directorName = staffList.find((s) => s['재직상태'] === '재직' && s['직급/직책'] === '관장')?.['성명'] ?? '';

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.docNumber}>제 {record['문서번호']}호</Text>

        <Text style={styles.title}>{record['종류'] || '상장'}</Text>

        <Text style={styles.recipientRow}>성 명 : {record['대상자성명']}</Text>

        <Text style={styles.body}>{record['본문']}</Text>

        <View style={styles.closingBlock}>
          <Text style={styles.closingDate}>{formatPrintDate(record['발급일'])}</Text>
          <Text style={styles.closingOrgName}>사회복지법인 새문안교회사회복지재단</Text>
          <View style={styles.closingTitleRow}>
            <Text style={styles.closingTitle}>시립서대문노인종합복지관장{directorName ? ` ${directorName}` : ''}</Text>
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
