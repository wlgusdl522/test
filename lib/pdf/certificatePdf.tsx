import path from 'path';
import QRCode from 'qrcode';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';

// 실제 발급되는 최종 문서에는 결재란이 나오지 않는다 — 결재는 신청~승인 단계에서 이미 끝난 상태이고,
// 이 PDF는 관장 최종승인 후 "발행" 시점에만 생성되는 완결된 결과물이다.

const VERIFY_PHRASE: Record<string, string> = {
  재직증명서: '위와 같이 재직하고 있음을 증명합니다.',
  경력증명서: '위와 같이 근무한 경력이 있음을 증명합니다.',
  원천징수영수증: '위 내용을 확인합니다.',
  기타: '위 내용을 확인합니다.',
};

let fontRegistered = false;
function ensureFont() {
  if (fontRegistered) return;
  Font.register({ family: 'NotoSansKR', src: path.join(process.cwd(), 'lib/pdf/fonts/NotoSansKR-Variable.ttf') });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'NotoSansKR', fontSize: 11, color: '#000' },
  docNumber: { fontSize: 10, marginBottom: 16 },
  title: { textAlign: 'center', fontSize: 24, letterSpacing: 8, marginTop: 16, marginBottom: 32 },
  infoTable: { border: '1px solid #333' },
  infoRow: { flexDirection: 'row', borderBottom: '1px solid #333' },
  infoRowLast: { flexDirection: 'row' },
  infoLabel: { width: 110, backgroundColor: '#f2f2f2', fontWeight: 700, textAlign: 'center', justifyContent: 'center', padding: 8, borderRight: '1px solid #333' },
  infoValue: { flex: 1, padding: 8, justifyContent: 'center' },
  verifyPhrase: { textAlign: 'center', marginTop: 32, fontSize: 13 },
  footerBox: {
    marginTop: 56,
    flexDirection: 'row',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    padding: 16,
    position: 'relative',
  },
  qrImage: { width: 70, height: 70 },
  footerText: { flex: 1, textAlign: 'center' },
  orgDate: { fontSize: 11 },
  orgName: { marginTop: 10, fontWeight: 700 },
  orgHeadTitle: { marginTop: 4, fontSize: 15, fontWeight: 700 },
  qrSpacer: { width: 70 },
  sealImage: { position: 'absolute', width: 54, height: 54, opacity: 0.85, top: 12, right: 96 },
});

function formatPrintDate(iso: string): string {
  const parts = String(iso || '').split('-');
  if (parts.length < 3) return iso || '';
  return `${parts[0]}년 ${Number(parts[1])}월 ${Number(parts[2])}일`;
}

export async function renderCertificatePdf(record: Record<string, string>, verifyUrl: string): Promise<Buffer> {
  ensureFont();
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
  const { certificateSealImageUrl } = await getSystemSettings();
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.docNumber}>제 {record['문서번호']}호</Text>

        <Text style={styles.title}>{record['종류']}</Text>

        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>성 명</Text>
            <Text style={styles.infoValue}>{record['대상자성명']}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>소 속</Text>
            <Text style={styles.infoValue}>{record['대상자소속']}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>직 위</Text>
            <Text style={styles.infoValue}>{record['대상자직위']}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>기 간</Text>
            <Text style={styles.infoValue}>{record['근무기간']}</Text>
          </View>
          <View style={styles.infoRowLast}>
            <Text style={styles.infoLabel}>용 도</Text>
            <Text style={styles.infoValue}>{record['용도']}</Text>
          </View>
        </View>

        <Text style={styles.verifyPhrase}>{VERIFY_PHRASE[record['종류']] ?? '위 내용을 확인합니다.'}</Text>

        <View style={styles.footerBox}>
          <Image src={qrDataUrl} style={styles.qrImage} />
          <View style={styles.footerText}>
            <Text style={styles.orgDate}>{formatPrintDate(record['발급일'])}</Text>
            <Text style={styles.orgName}>사회복지법인 새문안교회사회복지재단</Text>
            <Text style={styles.orgHeadTitle}>서대문노인종합복지관장</Text>
          </View>
          <View style={styles.qrSpacer} />
          {sealDataUrl && <Image src={sealDataUrl} style={styles.sealImage} />}
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
