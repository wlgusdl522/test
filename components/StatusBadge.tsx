import { badgeBase, badgeTone } from '@/lib/ui';

const TONE_MAP: Record<string, keyof typeof badgeTone> = {
  재직: 'green', 승인: 'green', 완료: 'green',
  결재중: 'amber', 대기: 'amber', 휴직: 'amber', 미완료: 'amber', 사업비: 'amber',
  반려: 'red', 퇴사: 'red',
  수기결재: 'gray', 미사용: 'gray', 사용: 'blue',
  전자결재: 'blue', 공통비: 'blue',
};

export default function StatusBadge({ status }: { status: string }) {
  const tone = TONE_MAP[status] ?? 'gray';
  return <span className={`${badgeBase} ${badgeTone[tone]}`}>{status}</span>;
}
