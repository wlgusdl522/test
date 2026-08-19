import path from 'path';
import QRCode from 'qrcode';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';
import { getStaffList } from '@/lib/mutate/staff';
import { AWARD_CONTENT_LEFT as CONTENT_LEFT, AWARD_CONTENT_WIDTH as CONTENT_WIDTH, formatPrintDate } from '@/lib/pdf/printShared';

// 기관에서 실제 쓰던 표창장 한글 양식(상장 테두리가 미리 인쇄된 용지에 텍스트만 겹쳐 인쇄하는 용도)의
// PDF를 pdfjs로 직접 파싱해서 각 요소의 실제 좌표(pt)·글자크기·자간을 측정한 뒤, 그 값을 그대로
// 절대좌표로 재현한다. 여백/폰트크기가 조금이라도 다르면 실물 상장 테두리와 어긋나기 때문에
// 대략적인 느낌이 아니라 측정값을 그대로 쓴다. QR·직인 박스만 원본에 없던 우리쪽 추가 요소.

let fontRegistered = false;
// certificatePdf.tsx와 동일한 이유(가변폰트 굵기 배리에이션) - 400/700 둘 다 등록해야 fontWeight:700이 실제로 굵게 나온다.
function ensureFont() {
  if (fontRegistered) return;
  const src = path.join(process.cwd(), 'lib/pdf/fonts/NotoSansKR-Variable.ttf');
  Font.register({ family: 'NotoSansKR', fonts: [{ src, fontWeight: 400 }, { src, fontWeight: 700 }] });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: { fontFamily: 'NotoSansKR', color: '#000', position: 'relative' },
  docNumber: { position: 'absolute', top: 108, left: CONTENT_LEFT, fontSize: 15 },
  title: { position: 'absolute', top: 193, left: 0, right: 0, textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: 14 },
  recipient: {
    position: 'absolute', top: 306, left: CONTENT_LEFT, width: CONTENT_WIDTH,
    textAlign: 'right', fontSize: 15, letterSpacing: 7,
  },
  body: {
    position: 'absolute', top: 390, left: CONTENT_LEFT, width: CONTENT_WIDTH,
    fontSize: 16, lineHeight: 1.9, textAlign: 'justify', textIndent: 12,
  },
  date: { position: 'absolute', top: 650, left: 0, right: 0, textAlign: 'center', fontSize: 13 },
  orgRow: { position: 'absolute', top: 700, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  orgLabelCol: { marginRight: 10 },
  orgLabelLine: { fontSize: 9, lineHeight: 1.25 },
  orgName: { fontSize: 14, fontWeight: 700 },
  directorRow: { position: 'absolute', top: 735, left: 0, right: 0, alignItems: 'center' },
  directorTitle: { fontSize: 14, fontWeight: 700 },
  sealImage: { position: 'absolute', width: 56, height: 56, opacity: 0.85, top: -16, right: -20 },
  qrBar: {
    position: 'absolute', top: 786, left: CONTENT_LEFT, width: CONTENT_WIDTH,
    flexDirection: 'row', alignItems: 'center',
    border: '1px solid #ddd', borderRadius: 8, backgroundColor: '#fafafa', padding: 10,
  },
  qrBarImage: { width: 40, height: 40 },
  qrBarText: { flex: 1, marginLeft: 12, fontSize: 9, color: '#666' },
});

export async function renderAwardPdf(record: Record<string, string>, verifyUrl: string): Promise<Buffer> {
  ensureFont();
  const showQr = record['QR표시여부'] !== 'N';
  const qrDataUrl = showQr ? await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1 }) : null;
  const [{ certificateSealImageUrl }, staffList] = await Promise.all([getSystemSettings(), getStaffList()]);
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;
  const directorName = staffList.find((s) => s['재직상태'] === '재직' && s['직급/직책'] === '관장')?.['성명'] ?? '';

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.docNumber}>제 {record['문서번호']}호</Text>

        <Text style={styles.title}>{record['종류'] || '상장'}</Text>

        <Text style={styles.recipient}>성 명 : {record['대상자성명']}</Text>

        <Text style={styles.body}>{record['본문']}</Text>

        <Text style={styles.date}>{formatPrintDate(record['발급일'])}</Text>

        <View style={styles.orgRow}>
          <View style={styles.orgLabelCol}>
            <Text style={styles.orgLabelLine}>사회복지</Text>
            <Text style={styles.orgLabelLine}>법 인</Text>
          </View>
          <Text style={styles.orgName}>새 문 안 교 회 사 회 복 지 재 단</Text>
        </View>

        <View style={styles.directorRow}>
          <View style={{ position: 'relative' }}>
            <Text style={styles.directorTitle}>시립서대문노인종합복지관장{directorName ? ` ${directorName}` : ''}</Text>
            {sealDataUrl && <Image src={sealDataUrl} style={styles.sealImage} />}
          </View>
        </View>

        {showQr && qrDataUrl && (
          <View style={styles.qrBar}>
            <Image src={qrDataUrl} style={styles.qrBarImage} />
            <Text style={styles.qrBarText}>QR 코드를 스캔하면 본 문서의 발급 진위 여부를 확인할 수 있습니다.</Text>
          </View>
        )}
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
