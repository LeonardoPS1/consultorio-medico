'use client';

/**
 * PulseLine — Línea de pulso/signos vitales (identidad del portal).
 */
export function PulseLine({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`portal-pulse-line h-3 w-6 text-portal-primary ${className}`}
      aria-hidden="true"
    >
      <path d="M0 6h4l2-4 3 8 2-6 1.5 4H24" className="animate-pulse-line" />
    </svg>
  );
}