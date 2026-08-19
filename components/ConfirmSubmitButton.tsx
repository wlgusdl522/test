'use client';

import { useFormStatus } from 'react-dom';

// 폼 제출 중(pending)에는 버튼을 비활성화하고 문구를 바꿔서, 응답이 오기 전에 여러 번
// 눌러 중복 제출되는 것을 막는다. useFormStatus는 이 컴포넌트를 감싸는 <form>의 제출
// 상태를 알려주므로 별도 상태 관리 없이 모든 사용처에 동일하게 적용된다.
export default function ConfirmSubmitButton({
  confirmMessage,
  className,
  title,
  children,
}: {
  confirmMessage: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? '처리 중...' : children}
    </button>
  );
}
