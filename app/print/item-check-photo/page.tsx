import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { driveThumbUrl } from '@/lib/drive/thumbUrl';
import PrintButton from '@/components/print/PrintButton';
import { card, input, inputBase, table, td, th } from '@/lib/ui';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function PhotoGroup({ urls }: { urls: string[] }) {
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
        maxWidth: single ? 380 : 480,
        justifyItems: 'center',
      }}
    >
      {filled.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={driveThumbUrl(url, 1000)} alt="" style={{ width: '100%', border: '1px solid #333' }} />
      ))}
    </div>
  );
}

export default async function ItemCheckPhotoPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const photos = await getItemCheckPhotoList();
  const r = id ? photos.find((x) => x.id === id) : photos[0];

  const lbl = { width: 100, fontWeight: 600, background: '#eef1f5' } as const;

  return (
    <div className="p-6">
      <div className={`${card} print:hidden flex flex-wrap items-center gap-4`}>
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
        <PrintButton />
      </div>

      {!r ? (
        <div className={card}><p className="text-sm text-zinc-500">검수사진을 찾을 수 없습니다.</p></div>
      ) : (
        <div className="bg-white" style={{ width: 700, margin: '0 auto' }}>
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

          {[r.개봉전사진1, r.개봉전사진2].some(Boolean) && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>개봉 전</div>
              <PhotoGroup urls={[r.개봉전사진1, r.개봉전사진2]} />
            </>
          )}
          {[r.개봉후사진1, r.개봉후사진2].some(Boolean) && (
            <>
              <div style={{ fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>개봉 후</div>
              <PhotoGroup urls={[r.개봉후사진1, r.개봉후사진2]} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
