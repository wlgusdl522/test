import path from 'path';
import QRCode from 'qrcode';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { parseApprovalHistory } from '@/lib/approval/engine';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';

// 결재 그리드에 표시되는 단계 라벨(실제 STEPS와 1:1 대응) — lib/supabase/certificate.ts의 STEPS와 나란히 유지해야 한다.
const APPROVAL_STEPS = ['서무/회계', '총무과 과장', '부장', '관장'] as const;
const APPROVAL_LABELS: Record<string, string> = { '서무/회계': '서무', '총무과 과장': '과장', 부장: '부장', 관장: '관장' };

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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  docNumber: { fontSize: 10 },
  approvalTable: { flexDirection: 'row', border: '1px solid #333' },
  approvalLabelCol: { width: 24, borderRight: '1px solid #333', alignItems: 'center', justifyContent: 'center', padding: 4 },
  approvalCol: { width: 64, borderRight: '1px solid #333' },
  approvalColLast: { width: 64 },
  approvalHead: { textAlign: 'center', fontWeight: 700, backgroundColor: '#f2f2f2', borderBottom: '1px solid #333', padding: 4, fontSize: 9 },
  approvalBody: { height: 34, textAlign: 'center', justifyContent: 'center', fontSize: 9, padding: 2 },
  title: { textAlign: 'center', fontSize: 24, letterSpacing: 8, marginTop: 24, marginBottom: 32 },
  infoTable: { border: '1px solid #333' },
  infoRow: { flexDirection: 'row', borderBottom: '1px solid #333' },
  infoRowLast: { flexDirection: 'row' },
  infoLabel: { width: 110, backgroundColor: '#f2f2f2', fontWeight: 700, textAlign: 'center', justifyContent: 'center', padding: 8, borderRight: '1px solid #333' },
  infoValue: { flex: 1, padding: 8, justifyContent: 'center' },
  verifyPhrase: { textAlign: 'center', marginTop: 32, fontSize: 13 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 40 },
  qrBlock: { width: 90 },
  qrCaption: { fontSize: 8, color: '#666', marginTop: 4 },
  orgBlock: { flex: 1, alignItems: 'center', position: 'relative' },
  orgDate: { fontSize: 11 },
  orgName: { marginTop: 14, fontWeight: 700 },
  orgHeadTitle: { marginTop: 6, fontSize: 16, fontWeight: 700 },
  sealImage: { position: 'absolute', top: 30, left: '50%', width: 56, height: 56, marginLeft: 60, opacity: 0.9 },
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

  const history = parseApprovalHistory(record['결재이력JSON']);
  const approverNameByStep = new Map(history.filter((h) => h.액션 === '승인').map((h) => [h.단계, h.승인자명]));

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <Text style={styles.docNumber}>제 {record['문서번호']}호</Text>
          <View style={styles.approvalTable}>
            <View style={styles.approvalLabelCol}>
              <Text style={{ fontSize: 9, fontWeight: 700 }}>결재</Text>
            </View>
            {APPROVAL_STEPS.map((step, i) => (
              <View key={step} style={i === APPROVAL_STEPS.length - 1 ? styles.approvalColLast : styles.approvalCol}>
                <Text style={styles.approvalHead}>{APPROVAL_LABELS[step]}</Text>
                <View style={styles.approvalBody}>
                  <Text>{approverNameByStep.get(step) ?? ''}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

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

        <View style={styles.footerRow}>
          <View style={styles.qrBlock}>
            <Image src={qrDataUrl} style={{ width: 90, height: 90 }} />
            <Text style={styles.qrCaption}>QR로 진위 확인</Text>
          </View>
          <View style={styles.orgBlock}>
            {sealDataUrl && <Image src={sealDataUrl} style={styles.sealImage} />}
            <Text style={styles.orgDate}>{formatPrintDate(record['발급일'])}</Text>
            <Text style={styles.orgName}>사회복지법인 새문안교회사회복지재단</Text>
            <Text style={styles.orgHeadTitle}>서대문노인종합복지관장</Text>
          </View>
          <View style={styles.qrBlock} />
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
