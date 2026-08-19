'use client';

import { useFormStatus } from 'react-dom';

// 폼 제출 중(pending)에는 버튼을 비활성화하고 문구를 바꿔서, 응답이 오기 전에 여러 번 눌러
// 중복 제출되는 것을 막는다(예: 사업구분 추가 버튼 연타). ConfirmSubmitButton과 같은 원리지만
// 확인창이 필요 없는 일반 제출 버튼(추가/저장 등)에 쓴다.
export default function SubmitButton({
  className,
  pendingLabel = '처리 중...',
  showPendingLabel = true,
  disabled = false,
  ariaLabel,
  children,
}: {
  className?: string;
  pendingLabel?: string;
  // 아이콘 전용 버튼(▲▼ 등)은 문구를 바꾸면 레이아웃이 깨지므로 비활성화만 하고 아이콘은 유지한다.
  showPendingLabel?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-label={ariaLabel} className={className}>
      {pending && showPendingLabel ? pendingLabel : children}
    </button>
  );
}
