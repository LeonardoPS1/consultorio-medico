/**
 * AsistenteSettings — Configuración del asistente IA.
 *
 * Panel inline con selector de modo y toggles de categorías de sugerencias.
 * Diseño compacto y claro.
 */

'use client';

import { MODOS_ASISTENTE, type ModoAsistente } from '@/lib/ia/asistente-prompts';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MessageSquare, Users, Calendar, Pill, Volume2, VolumeX } from 'lucide-react';

interface Props {
  modo: ModoAsistente;
  onModoChange: (modo: ModoAsistente) => void;
  onClose: () => void;
}

const CATEGORIAS = [
  { id: 'conversaciones', label: 'Conversaciones', icon: MessageSquare, descripcion: 'Sugerir respuestas, resumir chats' },
  { id: 'pacientes', label: 'Pacientes', icon: Users, descripcion: 'Resumir historial, turnos próximos' },
  { id: 'turnos', label: 'Turnos', icon: Calendar, descripcion: 'Resumen del día, sin confirmar' },
  { id: 'recetas', label: 'Recetas', icon: Pill, descripcion: 'Por vencer, renovaciones' },
] as const;

export function AsistenteSettings({ modo, onModoChange, onClose }: Props) {
  const { toggleCategoria, silenciadas } = useAsistenteIA();

  return (
    <div className="px-4 py-3 space-y-3 text-sm">
      {/* ─── Modo selector ─────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
          Modo del asistente
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {MODOS_ASISTENTE.map((m) => {
            const activo = modo === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onModoChange(m.id)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all ${
                  activo
                    ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-600 shadow-sm dark:text-indigo-400'
                    : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/20 hover:bg-accent'
                }`}
              >
                <span className="text-lg leading-none">{m.icono}</span>
                <span className="text-[10px] font-semibold leading-tight">{m.label}</span>
                {activo && (
                  <span className="mt-0.5 h-1 w-6 rounded-full bg-indigo-500/50" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 leading-relaxed">
          {MODOS_ASISTENTE.find((m) => m.id === modo)?.descripcion}
        </p>
      </div>

      {/* ─── Categorías de sugerencias ────────────────────── */}
      {modo !== 'silencioso' && (
        <>
          <hr className="border-border/40" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">
              <Volume2 className="h-3 w-3 inline mr-1 -mt-0.5" />
              Sugerencias activas
            </p>
            <div className="space-y-1">
              {CATEGORIAS.map((cat) => {
                const Icon = cat.icon;
                const activa = !silenciadas[cat.id]; // true = no silenciada
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategoria(cat.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${
                      activa
                        ? 'border-primary/15 bg-primary/5'
                        : 'border-border/60 bg-background text-muted-foreground/60'
                    }`}
                  >
                    {/* Icono */}
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        activa
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground/50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-medium ${
                          activa ? 'text-foreground' : 'text-muted-foreground/70'
                        }`}
                      >
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50 truncate">
                        {cat.descripcion}
                      </p>
                    </div>

                    {/* Toggle switch */}
                    <div
                      className={`relative h-5 w-8 shrink-0 rounded-full transition-colors ${
                        activa ? 'bg-primary' : 'bg-muted-foreground/20'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          activa ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ─── Atajos de teclado ─────────────────────────────── */}
      <hr className="border-border/40" />
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/50">
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Ctrl</kbd>
        <span>+</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Shift</kbd>
        <span>+</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">I</kbd>
        <span className="ml-0.5">abrir / cerrar</span>
      </div>
    </div>
  );
}
