import { getSupabaseServerClient } from './server';

// 홈 화면 인사말 아래 위로 문구 — 시트 없이 Supabase 테이블(인사문구)이 원본이다(당직과 동일한 예외 패턴).
// 테이블 스키마/시드 데이터는 계획 문서 참고 — Supabase SQL 편집기에서 수동으로 1회 생성해야 한다.

export type GreetingMessage = { 문구: string; 요일: string | null };

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function table() {
  return getSupabaseServerClient().from('인사문구') as any;
}

export async function getGreetingMessages(): Promise<GreetingMessage[]> {
  const { data, error } = await table().select('문구, 요일').order('정렬순서', { ascending: true });
  if (error) throw new Error(`인사문구 조회 실패: ${error.message}`);
  return (data ?? []) as GreetingMessage[];
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

// 평일(월~금)이면 그 요일 전용 문구를 항상 고정으로 보여주고, 주말이거나 매칭되는 문구가 없으면
// 일반 문구(요일 없음) 중 연중 일수 기준으로 하나를 결정적으로 골라 날짜가 바뀔 때마다 자연히 순환시킨다.
export function pickGreetingMessage(messages: GreetingMessage[], date: Date): string {
  if (messages.length === 0) return '';
  const todayLabel = WEEKDAY_LABELS[date.getDay()];
  const weekdayMatch = messages.find((m) => m.요일 === todayLabel);
  if (weekdayMatch) return weekdayMatch.문구;

  const general = messages.filter((m) => !m.요일);
  if (general.length === 0) return messages[0].문구;
  const idx = dayOfYear(date) % general.length;
  return general[idx].문구;
}
