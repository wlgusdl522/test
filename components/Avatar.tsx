export default function Avatar({ initial, className = 'h-7 w-7 text-xs' }: { initial: string; className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-tint font-semibold text-brand ${className}`}
    >
      {initial}
    </span>
  );
}
