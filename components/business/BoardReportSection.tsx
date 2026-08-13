import { getReportPeriod, type BoardPlanEntry, type BoardReportType } from '@/lib/mutate/boardPlan';
import { setReportPeriodAction } from '@/app/(portal)/business-summary/boardPlanActions';
import BoardReportTableClient from './BoardReportTableClient';
import { btnSecondary, card, inputBase } from '@/lib/ui';

// 사업명/실시월일/성과는 옅은 예시 텍스트(placeholder)로 감만 잡게 하고, 내용은 실제로 참고했던
// 이사회 자료의 항목 제목(장소/대상/예산 등)만 미리 채워 넣는다 — placeholder는 뭘 입력하든
// 통째로 사라지지만, 이건 실제 값이라 필요 없는 줄만 지우거나 새 줄을 더 추가하면 된다.
const EXAMPLES: Record<BoardReportType, { 사업명: string; 실시월일: string; 성과: string }> = {
  사업보고: {
    사업명: '예: 효도 나들이',
    실시월일: '예: 5/7(목)',
    성과: '예: 참여자의 소속감을 높이고 정서적 지지를 통해 삶의 질 향상을 도모',
  },
  사업계획: {
    사업명: '예: 역사모금데이',
    실시월일: '예: 6/4(목) ~ 6/30(화)',
    성과: '예: 지역사회 내 국가유공자에 대한 관심 증진 및 나눔참여문화 확산',
  },
};

const CONTENT_TEMPLATES: Record<BoardReportType, string> = {
  사업보고: '- 장소 : \n- 참여인원 : \n- 내용 : \n- 집행예산 : ',
  사업계획: '- 장소 : \n- 대상 : \n- 내용 : \n- 목표 금액 : ',
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
      <BoardReportTableClient
        구분={구분} ym={ym} columnLabel={columnLabel} initialRows={entries}
        examples={EXAMPLES[구분]} contentTemplate={CONTENT_TEMPLATES[구분]}
      />
    </div>
  );
}
