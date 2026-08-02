export default function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m3 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V7h12zM10 11v6M14 11v6"
      />
    </svg>
  );
}
