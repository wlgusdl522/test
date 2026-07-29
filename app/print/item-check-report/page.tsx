import { getItemCheckReportList } from '@/lib/mutate/itemCheckReport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ItemCheckReportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const reports = await getItemCheckReportList();
  const r = reports.find((x) => x.id === id);

  if (!r) return <div>조서를 찾을 수 없습니다.</div>;

  const rows: [string, string][] = [
    ['품명', r.품명], ['등록구분', r.등록구분], ['비품등록번호', r.비품등록번호],
    ['납품처상호', r.납품처상호], ['납품처대표자', r.납품처대표자], ['계약금액', Number(r.계약금액 || 0).toLocaleString() + '원'],
    ['계약체결년월일', r.계약체결년월일], ['납품기한', r.납품기한], ['납품완료일자', r.납품완료일자],
    ['검수년월일', r.검수년월일], ['검수장소', r.검수장소], ['규격', r.규격],
    ['단위', r.단위], ['수량', r.수량], ['단가', Number(r.단가 || 0).toLocaleString() + '원'],
    ['금액', Number(r.금액 || 0).toLocaleString() + '원'], ['검수자명', r.검수자명], ['소속부서', r.소속부서],
    ['비고', r.비고], ['결재상태', r.결재상태],
  ];

  return (
    <div style={{ width: 700, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>물품검수조서</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td style={{ border: '1px solid #333', background: '#f2f2f2', fontWeight: 600, padding: 8, width: 160 }}>{label}</td>
              <td style={{ border: '1px solid #333', padding: 8 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
