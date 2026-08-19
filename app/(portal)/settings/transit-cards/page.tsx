import { getTransitCardList } from '@/lib/mutate/transitCard';
import { btn, btnDanger, h1, input, inputBase, pageFluid } from '@/lib/ui';
import FormToggle from '@/components/FormToggle';
import { addTransitCardAction, deleteTransitCardAction, updateTransitCardAction } from './actions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function TransitCardsSettingsPage() {
  const cards = await getTransitCardList();

  return (
    <main className={pageFluid}>
      <h1 className={`${h1} mb-5`}>설정 &gt; 교통카드목록</h1>

      <FormToggle label="교통카드 등록">
        <form action={addTransitCardAction} className="flex flex-wrap gap-2 mb-6">
          <input name="cardId" placeholder="카드ID (예: C006)" required className={input} />
          <input name="cardName" placeholder="카드명" className={input} />
          <input name="initBalance" type="number" placeholder="초기잔액" className={input} />
          <button type="submit" className={btn}>추가</button>
        </form>
      </FormToggle>

      <ul className="flex flex-col gap-2">
        {cards.map((c) => (
          <li key={c.카드ID} className="flex flex-wrap items-center gap-2">
            <form action={updateTransitCardAction} className="flex flex-1 flex-wrap gap-2 min-w-[240px]">
              <input type="hidden" name="oldCardId" value={c.카드ID} />
              <input name="cardId" defaultValue={c.카드ID} className={`${inputBase} w-28`} />
              <input name="cardName" defaultValue={c.카드명} className={`${input} flex-1`} />
              <input name="initBalance" type="number" defaultValue={c.초기잔액} className={`${inputBase} w-32`} />
              <button type="submit" className={btn}>저장</button>
            </form>
            <form action={deleteTransitCardAction}>
              <input type="hidden" name="cardId" value={c.카드ID} />
              <button type="submit" className={btnDanger}>삭제</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
