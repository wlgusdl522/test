import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { driveThumbUrl } from '@/lib/drive/thumbUrl';
import PrintButton from '@/components/print/PrintButton';
import { card, inputBase, table, td } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 개봉전/개봉후 두 그룹이 모두 있으면 한 그룹당 쓸 수 있는 세로 공간이 절반으로 줄어든다 —
// 어느 경우든 A4 한 장(297mm - 위아래 여백 24mm) 안에 항상 들어가도록 그룹 수에 따라
// 사진 한 장의 최대 높이를 미리 정해둔다.
function photoMaxHeight(groupCount: number): string {
  return groupCount > 1 ? '78mm' : '175mm';
}

function PhotoGroup({ urls, maxHeight }: { urls: string[]; maxHeight: string }) {
  const filled = urls.filter(Boolean);
  if (!filled.length) return null;
  const single = filled.length === 1;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: single ? '1fr' : '1fr 1fr',
        gap: 10,
        margin: '0 auto 18px',
        maxWidth: single ? 640 : 680,
        justifyItems: 'center',
      }}
    >
      {filled.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={driveThumbUrl(url, 1000)}
          alt=""
          style={{ width: '100%', height: maxHeight, objectFit: 'contain', border: '1px solid #333' }}
        />
      ))}
    </div>
  );
}

function PhotoDoc({ r, pageBreakAfter }: { r: Record<string, string>; pageBreakAfter: boolean }) {
  const hasBefore = [r.개봉전사진1, r.개봉전사진2].some(Boolean);
  const hasAfter = [r.개봉후사진1, r.개봉후사진2].some(Boolean);
  const maxHeight = photoMaxHeight((hasBefore ? 1 : 0) + (hasAfter ? 1 : 0));
  const lbl = { width: 100, fontWeight: 600, background: '#eef1f5' } as const;

  return (
    <div
      className="bg-white"
      style={{ width: 700, margin: '0 auto', breakAfter: pageBreakAfter ? 'page' : 'auto', breakInside: 'avoid' }}
    >
      <h2 style={{ margin: '0 0 14px', fontSize: 22, textAlign: 'center' }}>물 품 검 수 사 진</h2>
      <table className={table} style={{ marginBottom: 14 }}>
        <tbody>
          <tr>
            <td className={td} style={lbl}>사업명</td><td className={td}>{r.사업명}</td>
            <td className={td} style={lbl}>지출일자</td><td className={td}>{r.지출일자}</td>
          </tr>
          <tr>
            <td className={td} style={lbl}>품명</td><td className={td}>{r.품명}</td>
            <td className={td} style={lbl}>금액</td><td className={td}>{Number(r.금액 || 0).toLocaleString()}원</td>
          </tr>
        </tbody>
      </table>

      {hasBefore && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>개봉 전</div>
          <PhotoGroup urls={[r.개봉전사진1, r.개봉전사진2]} maxHeight={maxHeight} />
        </>
      )}
      {hasAfter && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>개봉 후</div>
          <PhotoGroup urls={[r.개봉후사진1, r.개봉후사진2]} maxHeight={maxHeight} />
        </>
      )}
    </div>
  );
}

export default async function ItemCheckPhotoPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; ids?: string }>;
}) {
  const { id, ids } = await searchParams;
  const photos = await getItemCheckPhotoList();

  const batchIds = (ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const isBatch = batchIds.length > 0;
  const batchRecords = isBatch
    ? batchIds.map((bid) => photos.find((x) => x.id === bid)).filter((x): x is Record<string, string> => Boolean(x))
    : [];
  const r = !isBatch ? (id ? photos.find((x) => x.id === id) : photos[0]) : null;

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
        {isBatch ? (
          <span className="text-sm text-zinc-600 dark:text-zinc-300">{batchRecords.length}건 일괄인쇄</span>
        ) : (
          <form method="get" className="flex flex-wrap items-center gap-2">
            <select name="id" defaultValue={r?.id ?? ''} className={`${inputBase} w-auto`}>
              {photos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.지출일자} · {x.품명} · {x.사업명}
                </option>
              ))}
            </select>
            <button type="submit" className="text-sm text-brand hover:underline">선택</button>
          </form>
        )}
        <PrintButton />
      </div>

      {isBatch ? (
        batchRecords.length === 0 ? (
          <div className={card}><p className="text-sm text-zinc-500">인쇄할 검수사진을 찾을 수 없습니다.</p></div>
        ) : (
          batchRecords.map((rec, i) => (
            <PhotoDoc key={rec.id} r={rec} pageBreakAfter={i < batchRecords.length - 1} />
          ))
        )
      ) : !r ? (
        <div className={card}><p className="text-sm text-zinc-500">검수사진을 찾을 수 없습니다.</p></div>
      ) : (
        <PhotoDoc r={r} pageBreakAfter={false} />
      )}
    </div>
  );
}
