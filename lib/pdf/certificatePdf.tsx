import path from 'path';
import QRCode from 'qrcode';
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { getDriveImageAsDataUrl } from '@/lib/drive/upload';
import { getSystemSettings } from '@/lib/mutate/settings';
import { VERIFY_PHRASE, maskedResidentNumber, formatPrintDate } from '@/lib/pdf/printShared';

// 실제 발급되는 최종 문서에는 결재란이 나오지 않는다 — 결재는 신청~승인 단계에서 이미 끝난 상태이고,
// 이 PDF는 관장 최종승인 후 "발행" 시점에만 생성되는 완결된 결과물이다.
// 레이아웃(글자크기·자간·"인적사항/재직사항"을 표 왼쪽에 걸치는 라벨 셀로 두는 방식, 성명·주민등록번호를
// 한 행에 나란히 배치하는 것)은 기관에서 실제 쓰던 재직/경력증명서 한글 양식 PDF를 pdfjs로 파싱해
// 얻은 실측값을 반영했다. 여백은 한 페이지 안에 다 들어가도록 압축했다(넘치면 QR이 2페이지로 밀림).

let fontRegistered = false;
// 가변폰트(Variable) 파일 하나만 등록하면 fontWeight:700을 줘도 항상 기본 인스턴스(얇게)로만
// 렌더링된다 - react-pdf/fontkit이 같은 src를 여러 fontWeight로 등록해두면 그 굵기의 배리에이션을
// 뽑아 쓴다. 그래서 실제 문서에서 라벨/제목이 굵게 안 나오고 전체적으로 얇아 보였다.
function ensureFont() {
  if (fontRegistered) return;
  const src = path.join(process.cwd(), 'lib/pdf/fonts/NotoSansKR-Variable.ttf');
  Font.register({
    family: 'NotoSansKR',
    fonts: [
      { src, fontWeight: 400 },
      { src, fontWeight: 700 },
    ],
  });
  fontRegistered = true;
}

const styles = StyleSheet.create({
  page: { padding: 38, fontFamily: 'NotoSansKR', fontSize: 11, color: '#000' },
  docNumber: { fontSize: 11, marginBottom: 28 },
  title: { textAlign: 'center', fontSize: 24, fontWeight: 700, letterSpacing: 12, marginBottom: 24 },
  sectionRow: { flexDirection: 'row', marginTop: 12 },
  sectionLabelCol: {
    width: 60, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f2f2f2', borderTop: '1px solid #333', borderLeft: '1px solid #333', borderBottom: '1px solid #333',
  },
  sectionLabelText: { fontSize: 11, fontWeight: 700 },
  infoTable: { flex: 1, borderTop: '1px solid #333', borderRight: '1px solid #333', borderBottom: '1px solid #333' },
  infoRow: { flexDirection: 'row', borderBottom: '1px solid #333' },
  infoRowLast: { flexDirection: 'row' },
  infoLabel: { width: 100, backgroundColor: '#f2f2f2', fontWeight: 700, textAlign: 'center', justifyContent: 'center', padding: 8, borderRight: '1px solid #333' },
  infoValue: { flex: 1, padding: 8, justifyContent: 'center' },
  infoLabelNarrow: { width: 60, backgroundColor: '#f2f2f2', fontWeight: 700, textAlign: 'center', justifyContent: 'center', padding: 8, borderRight: '1px solid #333' },
  infoValueNarrow: { width: 120, padding: 8, justifyContent: 'center', borderRight: '1px solid #333' },
  infoLabelWide: { width: 90, backgroundColor: '#f2f2f2', fontWeight: 700, textAlign: 'center', justifyContent: 'center', padding: 8, borderRight: '1px solid #333' },
  infoValueWide: { flex: 1, padding: 8, justifyContent: 'center' },
  plainRow: { flexDirection: 'row', borderBottom: '1px solid #333' },
  plainRowLast: { flexDirection: 'row' },
  plainTable: { marginTop: 12, border: '1px solid #333' },
  verifyPhrase: { textAlign: 'center', marginTop: 20, fontSize: 13 },
  closingBlock: { marginTop: 24, alignItems: 'center' },
  closingDate: { fontSize: 13 },
  closingOrgName: { marginTop: 10, fontWeight: 700, fontSize: 13 },
  closingTitleRow: { marginTop: 8, position: 'relative' },
  closingTitle: { fontSize: 21, fontWeight: 700 },
  sealImage: { position: 'absolute', width: 52, height: 52, opacity: 0.85, top: -14, right: -14 },
  qrBar: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    padding: 10,
  },
  qrBarImage: { width: 42, height: 42 },
  qrBarText: { flex: 1, marginLeft: 12, fontSize: 9, color: '#666' },
});

export async function renderCertificatePdf(record: Record<string, string>, verifyUrl: string): Promise<Buffer> {
  ensureFont();
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 100, margin: 1 });
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
              <Text style={styles.infoLabelNarrow}>성 명</Text>
              <Text style={styles.infoValueNarrow}>{record['대상자성명']}</Text>
              <Text style={styles.infoLabelWide}>주민등록번호</Text>
              <Text style={styles.infoValueWide}>{maskedResidentNumber(record['생년월일'], record['성별'])}</Text>
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
