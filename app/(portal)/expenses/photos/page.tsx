import { getCardLedgerList } from '@/lib/mutate/cardLedger';
import { getItemCheckPhotoList } from '@/lib/mutate/itemCheckPhoto';
import { getKeyedList } from '@/lib/mutate/keyedTable';
import { BUDGET_ITEM_TABLE, ITEM_CHECK_PHOTO_SLOTS } from '@/lib/sheets/registry';
import { isAccountingViewer } from '@/lib/auth-helpers';
import { btn, btnDanger, btnSecondary, card, h2, input, label, table, tableWrap, td, th, trZebraHover } from '@/lib/ui';
import { deleteItemCheckPhotoAction, saveItemCheckPhotoAction, setItemCheckPhotoPrintedAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function resolveBusinessName(budgetItemName: string, budgetItems: Record<string, string>[]): string {
  const match = budgetItems.find((b) => b.예산과목명 === budgetItemName);
  return match?.연계사업명 || budgetItemName || '';
}

export default async function ItemCheckPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ ledgerId?: string; editId?: string }>;
}) {
  const { ledgerId, editId } = await searchParams;
  const [ledgerRecords, photos, budgetItems, canCheckAccounting] = await Promise.all([
    getCardLedgerList(),
    getItemCheckPhotoList(),
    getKeyedList(BUDGET_ITEM_TABLE),
    isAccountingViewer(),
  ]);

  const linkedIds = new Set(photos.map((p) => p.카드사용대장ID));
  const unlinked = ledgerRecords.filter((r) => !linkedIds.has(r.id));
  const selected = ledgerId ? ledgerRecords.find((r) => r.id === ledgerId) : null;
  const editingPhoto = editId ? photos.find((p) => p.id === editId) : null;

  return (
    <>
      {editingPhoto ? (
        <form action={saveItemCheckPhotoAction} className={`${card} grid grid-cols-2 gap-3`} encType="multipart/form-data">
          <input type="hidden" name="id" value={editingPhoto.id} />
          <input type="hidden" name="ledgerId" value={editingPhoto.카드사용대장ID} />
          <label className={label}>
            사업명
            <input name="business" defaultValue={editingPhoto.사업명} className={input} />
          </label>
          <label className={label}>
            프로그램명
            <input name="program" defaultValue={editingPhoto.프로그램명} className={input} />
          </label>
          <label className={label}>
            지출일자
            <input type="date" name="date" defaultValue={editingPhoto.지출일자} className={input} />
          </label>
          <label className={label}>
            금액
            <input type="number" name="amount" defaultValue={editingPhoto.금액} className={input} />
          </label>
          <label className={`${label} col-span-2`}>
            품명
            <input name="itemName" defaultValue={editingPhoto.품명} className={input} />
          </label>
          {ITEM_CHECK_PHOTO_SLOTS.map((slot) => (
            <label key={slot} className={label}>
              {slot} {editingPhoto[slot] && <a href={editingPhoto[slot]} target="_blank" rel="noreferrer" className="text-brand hover:underline">(기존 사진 보기)</a>}
              <input type="file" name={slot} accept="image/*" className={input} />
              <span className="text-xs text-zinc-400">비워두면 기존 사진 유지</span>
            </label>
          ))}
          <div className="flex items-center gap-3">
            <button type="submit" className={btn}>저장</button>
            <a href="/expenses/photos" className="text-xs text-zinc-500 hover:underline">취소</a>
          </div>
        </form>
      ) : !selected ? (
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

      <div className={tableWrap}><table className={table}>
        <thead>
          <tr>
            <th className={th}>지출일자</th><th className={th}>사업명</th><th className={th}>품명</th>
            <th className={th}>금액</th><th className={th}>사진</th><th className={th}>회계확인</th><th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {photos.map((p) => {
            const checked = !!p.인쇄일시;
            return (
              <tr key={p.id} className={trZebraHover}>
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
                  {canCheckAccounting ? (
                    <form action={setItemCheckPhotoPrintedAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="printed" value={String(!checked)} />
                      <button type="submit" title="회계확인 표시 토글">{checked ? '✅' : '☐'}</button>
                    </form>
                  ) : (
                    <span>{checked ? '✅' : '☐'}</span>
                  )}
                </td>
                <td className={`${td} flex gap-1.5`}>
                  <a href={`/expenses/photos?editId=${p.id}`} className={btnSecondary}>수정</a>
                  <a href={`/print/item-check-photo?id=${p.id}`} target="_blank" className={btnSecondary}>인쇄</a>
                  <form action={deleteItemCheckPhotoAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className={btnDanger}>삭제</button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
    </>
  );
}
