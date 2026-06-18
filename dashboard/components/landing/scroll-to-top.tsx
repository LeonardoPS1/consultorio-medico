'use client';

import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
      aria-label="Volver al inicio"
    >
      <ArrowUp className="h-3 w-3" />
      Volver arriba
    </button>
  );
}
