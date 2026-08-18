import path from 'path';
import QRCode from 'qrcode';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';

// 실제 발급되는 최종 문서에는 결재란이 나오지 않는다 — 결재는 신청~승인 단계에서 이미 끝난 상태이고,
// 이 PDF는 관장 최종승인 후 "발행" 시점에만 생성되는 완결된 결과물이다.
// 레이아웃(글자크기·자간·"인적사항/재직사항"을 표 왼쪽에 세로로 걸치는 라벨로 두는 방식)은
// 기관에서 실제 쓰던 재직/경력증명서 한글 양식 PDF를 pdfjs로 파싱해 얻은 실측값을 반영했다.

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

let fontRegistered = false;
function ensureFont() {
  if (fontRegistered) return;
  Font.register({ family: 'NotoSansKR', src: path.join(process.cwd(), 'lib/pdf/fonts/NotoSansKR-Variable.ttf') });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: 'NotoSansKR', fontSize: 11, color: '#000' },
  docNumber: { fontSize: 11, marginBottom: 56 },
  title: { textAlign: 'center', fontSize: 25, fontWeight: 700, letterSpacing: 13, marginBottom: 40 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  sectionLabelCol: { width: 64, alignItems: 'center' },
  sectionLabelText: { fontSize: 11, fontWeight: 700 },
  infoTable: { flex: 1, border: '1px solid #333' },
  infoRow: { flexDirection: 'row', borderBottom: '1px solid #333' },
  infoRowLast: { flexDirection: 'row' },
  infoLabel: { width: 110, backgroundColor: '#f2f2f2', fontWeight: 700, textAlign: 'center', justifyContent: 'center', padding: 12, borderRight: '1px solid #333' },
  infoValue: { flex: 1, padding: 12, justifyContent: 'center' },
  plainRow: { flexDirection: 'row', borderBottom: '1px solid #333' },
  plainRowLast: { flexDirection: 'row' },
  plainTable: { marginTop: 20, border: '1px solid #333' },
  verifyPhrase: { textAlign: 'center', marginTop: 32, fontSize: 15 },
  closingBlock: { marginTop: 40, alignItems: 'center' },
  closingDate: { fontSize: 15 },
  closingOrgName: { marginTop: 14, fontWeight: 700, fontSize: 15 },
  closingTitleRow: { marginTop: 10, position: 'relative' },
  closingTitle: { fontSize: 25, fontWeight: 700 },
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

export async function renderCertificatePdf(record: Record<string, string>, verifyUrl: string): Promise<Buffer> {
  ensureFont();
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
  const { certificateSealImageUrl } = await getSystemSettings();
  const sealDataUrl = certificateSealImageUrl ? await getDriveImageAsDataUrl(certificateSealImageUrl) : null;
  const isCareer = record['종류'] === '경력증명서';

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.docNumber}>제 {record['문서번호']}호</Text>

        <Text style={styles.title}>{record['종류']}</Text>

        <View style={styles.sectionRow}>
          <View style={styles.sectionLabelCol}>
            <Text style={styles.sectionLabelText}>인적사항</Text>
          </View>
          <View style={styles.infoTable}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>성 명</Text>
              <Text style={styles.infoValue}>{record['대상자성명']}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>주민등록번호</Text>
              <Text style={styles.infoValue}>{maskedResidentNumber(record['생년월일'], record['성별'])}</Text>
            </View>
            <View style={styles.infoRowLast}>
              <Text style={styles.infoLabel}>주 소</Text>
              <Text style={styles.infoValue}>{record['대상자주소']}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.sectionLabelCol}>
            <Text style={styles.sectionLabelText}>{isCareer ? '경력사항' : '재직사항'}</Text>
          </View>
          <View style={styles.infoTable}>
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
            <View style={isCareer ? styles.infoRow : styles.infoRowLast}>
              <Text style={styles.infoLabel}>담당업무</Text>
              <Text style={styles.infoValue}>{record['담당업무']}</Text>
            </View>
            {isCareer && (
              <View style={styles.infoRowLast}>
                <Text style={styles.infoLabel}>퇴직사유</Text>
                <Text style={styles.infoValue}>{record['퇴직사유']}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.plainTable}>
          <View style={styles.plainRow}>
            <Text style={styles.infoLabel}>용 도</Text>
            <Text style={styles.infoValue}>{record['용도']}</Text>
          </View>
          <View style={styles.plainRowLast}>
            <Text style={styles.infoLabel}>비 고</Text>
            <Text style={styles.infoValue}>{record['비고']}</Text>
          </View>
        </View>

        <Text style={styles.verifyPhrase}>{VERIFY_PHRASE[record['종류']] ?? '위 내용을 확인합니다.'}</Text>

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
