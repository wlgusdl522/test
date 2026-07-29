import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE, ITEM_CHECK_PHOTO_SLOTS } from '@/lib/sheets/registry';
import { btn, btnDanger, card, h1, h2, input, label, pageWide, table, td, th } from '@/lib/ui';
import { deleteItemCheckPhotoAction, saveItemCheckPhotoAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveBusinessName(budgetItemName: string, budgetItems: Record<string, string>[]): string {
  const match = budgetItems.find((b) => b.예산과목명 === budgetItemName);
  return match?.연계사업명 || budgetItemName || '';
}

export default async function ItemCheckPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ ledgerId?: string }>;
}) {
  const { ledgerId } = await searchParams;
  const [ledgerRecords, photos, budgetItems] = await Promise.all([
    getCardLedgerList(),
    getItemCheckPhotoList(),
    getKeyedList(BUDGET_ITEM_TABLE),
  ]);

  const linkedIds = new Set(photos.map((p) => p.카드사용대장ID));
  const unlinked = ledgerRecords.filter((r) => !linkedIds.has(r.id));
  const selected = ledgerId ? ledgerRecords.find((r) => r.id === ledgerId) : null;

  return (
    <main className={pageWide}>
      <h1 className={h1}>물품검수사진</h1>

      {!selected ? (
        <>
          <h2 className={h2}>사진을 등록할 카드사용대장 내역 선택</h2>
          <ul className="mb-6 flex flex-col gap-1">
            {unlinked.map((r) => (
              <li key={r.id}>
                <a href={`/expenses/photos?ledgerId=${r.id}`} className="text-sm text-brand hover:underline">
                  {r.사용일자} · {r.예산과목} · {r.사용내역} · {Number(r.사용금액 || 0).toLocaleString()}원
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <form action={saveItemCheckPhotoAction} className={`${card} grid grid-cols-2 gap-3`} encType="multipart/form-data">
          <input type="hidden" name="ledgerId" value={selected.id} />
          <label className={label}>
            사업명
            <input name="business" defaultValue={resolveBusinessName(selected.예산과목, budgetItems)} className={input} />
          </label>
          <label className={label}>
            프로그램명
            <input name="program" defaultValue={selected.사용내역} className={input} />
          </label>
          <label className={label}>
            지출일자
            <input type="date" name="date" defaultValue={selected.사용일자} className={input} />
          </label>
          <label className={label}>
            금액
            <input type="number" name="amount" defaultValue={selected.사용금액} className={input} />
          </label>
          <label className={`${label} col-span-2`}>
            품명
            <input name="itemName" className={input} />
          </label>
          {ITEM_CHECK_PHOTO_SLOTS.map((slot) => (
            <label key={slot} className={label}>
              {slot}
              <input type="file" name={slot} accept="image/*" className={input} />
            </label>
          ))}
          <div>
            <button type="submit" className={btn}>등록</button>
          </div>
        </form>
      )}

      <table className={table}>
        <thead>
          <tr>
            <th className={th}>지출일자</th><th className={th}>사업명</th><th className={th}>품명</th>
            <th className={th}>금액</th><th className={th}>사진</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {photos.map((p) => (
            <tr key={p.id}>
              <td className={td}>{p.지출일자}</td>
              <td className={td}>{p.사업명}</td>
              <td className={td}>{p.품명}</td>
              <td className={td}>{Number(p.금액 || 0).toLocaleString()}원</td>
              <td className={td}>
                <div className="flex gap-1">
                  {ITEM_CHECK_PHOTO_SLOTS.filter((slot) => p[slot]).map((slot) => (
                    <a key={slot} href={p[slot]} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
                      {slot.slice(-1)}
                    </a>
                  ))}
                </div>
              </td>
              <td className={td}>
                <form action={deleteItemCheckPhotoAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className={btnDanger}>삭제</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
