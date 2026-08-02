'use client';

import { useCallback, useEffect, useState } from 'react';
import { PortalThemeToggle } from '@/components/portal/theme-toggle';

interface EstadoCategoria {
  categoria: string;
  estado: 'operativo' | 'degradado' | 'caido';
  ultimaActualizacion: string;
}

const SEMAFORO: Record<EstadoCategoria['estado'], { label: string; dot: string; text: string; ring: string }> = {
  operativo: {
    label: 'Operativo',
    dot: 'bg-green-500',
    text: 'text-green-500',
    ring: 'border-green-500/30 bg-green-500/5',
  },
  degradado: {
    label: 'Degradado',
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    ring: 'border-yellow-400/30 bg-yellow-400/5',
  },
  caido: {
    label: 'Caído',
    dot: 'bg-red-500',
    text: 'text-red-500',
    ring: 'border-red-500/30 bg-red-500/5',
  },
};

export default function StatusPage() {
  const [categorias, setCategorias] = useState<EstadoCategoria[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/status/public', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = (await res.json()) as EstadoCategoria[];
      setCategorias(data);
      setError(null);
    } catch {
      setError('No se pudo verificar el estado del servicio en este momento.');
    }
  }, []);

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 60_000);
    return () => clearInterval(interval);
  }, [cargar]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="relative mx-auto w-full max-w-3xl px-6 py-16">
        <div className="absolute right-6 top-6">
          <PortalThemeToggle />
        </div>
        <header className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
            <span aria-hidden>🩺</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Estado del servicio</h1>
          <p className="mt-2 text-muted-foreground">
            Estado en tiempo real de la plataforma AiCoreMed. Esta página se actualiza cada minuto.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center text-sm text-red-500">
            {error}
          </div>
        ) : !categorias ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-border/40 bg-muted/30" />
            ))}
          </div>
        ) : (
          <section aria-label="Categorías del servicio" className="space-y-4">
            {categorias.map((c) => {
              const s = SEMAFORO[c.estado];
              return (
                <article
                  key={c.categoria}
                  className={`flex items-center justify-between gap-4 rounded-xl border p-5 ${s.ring}`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`inline-block h-4 w-4 rounded-full ${s.dot} ${c.estado === 'caido' ? 'animate-pulse' : ''}`}
                      aria-hidden
                    />
                    <h2 className="text-lg font-semibold">{c.categoria}</h2>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${s.text}`}>{s.label}</span>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(c.ultimaActualizacion).toLocaleString('es-CL')}
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <footer className="mt-12 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          AiCoreMed · Sistema de gestión para consultorios médicos ·{' '}
          <a href="https://med.aicorebots.com" className="text-primary underline-offset-4 hover:underline">
            med.aicorebots.com
          </a>
        </footer>
      </div>
    </main>
  );
}
