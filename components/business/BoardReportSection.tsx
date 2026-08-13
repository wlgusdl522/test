import { getReportPeriod, type BoardPlanEntry, type BoardReportType } from '@/lib/mutate/boardPlan';
import { setReportPeriodAction } from '@/app/(portal)/business-summary/boardPlanActions';
import BoardReportTableClient from './BoardReportTableClient';
import { btnSecondary, card, inputBase } from '@/lib/ui';

// 행 추가 시 무슨 내용을 어떻게 채우면 되는지 감이 오도록, 실제로 참고했던 이사회 자료 예시를
// 옅은 예시 텍스트(placeholder)로 넣어둔다 — 값이 아니라 안내용이라 저장되지는 않는다.
const EXAMPLES: Record<BoardReportType, { 사업명: string; 실시월일: string; 내용: string; 성과: string }> = {
  사업보고: {
    사업명: '예: 효도 나들이',
    실시월일: '예: 5/7(목)',
    내용: '예:\n- 장소 : 온양민속박물관, 현충사\n- 참여인원 : 복지관 이용 어르신 293명\n- 내용 : 민속박물관 및 현충사 관람, 점심식사 등\n- 집행예산 : 14,000,000원',
    성과: '예: 참여자의 소속감을 높이고 정서적 지지를 통해 삶의 질 향상을 도모',
  },
  사업계획: {
    사업명: '예: 역사모금데이',
    실시월일: '예: 6/4(목) ~ 6/30(화)',
    내용: '예:\n- 장소 : 온라인(네이버해피빈)\n- 대상 : 국가유공자 및 유족 어르신 50명\n- 내용 : 네이버해피빈 모금 및 생필품 지원\n- 목표 모금액 : 9,000,000원',
    성과: '예: 지역사회 내 국가유공자에 대한 관심 증진 및 나눔참여문화 확산',
  },
};

export default async function BoardReportSection({
  index,
  구분,
  ym,
  entries,
}: {
  index: number;
  구분: BoardReportType;
  ym: string;
  entries: BoardPlanEntry[];
}) {
  const period = await getReportPeriod(구분, ym);
  const columnLabel = 구분 === '사업보고' ? '성과' : '기대효과';

  return (
    <div className={card}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-[13px] font-bold text-brand-dark dark:text-brand">{index}. {구분}</h2>
        <form action={setReportPeriodAction} className="flex items-center gap-1.5">
          <input type="hidden" name="구분" value={구분} />
          <input type="hidden" name="년월" value={ym} />
          <span className="text-xs text-zinc-400">(</span>
          <input
            name="기간텍스트" defaultValue={period} placeholder="예: 2026. 6. 4. ~ 2026. 8. 5."
            className={`${inputBase} w-64`}
          />
          <span className="text-xs text-zinc-400">)</span>
          <button type="submit" className={btnSecondary}>기간 저장</button>
        </form>
      </div>
      <BoardReportTableClient 구분={구분} ym={ym} columnLabel={columnLabel} initialRows={entries} examples={EXAMPLES[구분]} />
    </div>
  );
}
