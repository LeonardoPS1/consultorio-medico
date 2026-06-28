/**
 * AsistenteSettings — Configuración del asistente IA.
 *
 * Panel inline con selector de modo y toggles de categorías de sugerencias.
 * Diseño compacto y claro.
 */

'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { MODOS_ASISTENTE, type ModoAsistente } from '@/lib/ia/asistente-prompts';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MessageSquare, Users, Calendar, Pill } from 'lucide-react';

interface Props {
  modo: ModoAsistente;
  onModoChange: (modo: ModoAsistente) => void;
}

const CATEGORIAS = [
  { id: 'conversaciones', label: 'Conversaciones', icon: MessageSquare, descripcion: 'Sugerir respuestas, resumir chats' },
  { id: 'pacientes', label: 'Pacientes', icon: Users, descripcion: 'Resumir historial, turnos próximos' },
  { id: 'turnos', label: 'Turnos', icon: Calendar, descripcion: 'Resumen del día, sin confirmar' },
  { id: 'recetas', label: 'Recetas', icon: Pill, descripcion: 'Por vencer, renovaciones' },
] as const;

export function AsistenteSettings({ modo, onModoChange }: Props) {
  const { toggleCategoria, silenciadas } = useAsistenteIA();

  return (
    <div className="px-4 py-3 space-y-3 text-sm">
      {/* ─── Modo selector ─────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2.5">
          Modo del asistente
        </p>
        <div className="flex gap-1.5">
          {MODOS_ASISTENTE.map((m) => {
            const activo = modo === m.id;
            return (
              <button
                key={m.id}
                onClick={() => onModoChange(m.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                  activo
                    ? 'border-indigo-500/30 bg-indigo-500/5 text-indigo-600 shadow-sm dark:text-indigo-400'
                    : 'border-border/60 bg-background text-muted-foreground/60 hover:border-muted-foreground/20 hover:text-foreground'
                }`}
              >
                <span>{m.icono}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/40 mt-1.5 leading-relaxed text-center">
          {MODOS_ASISTENTE.find((m) => m.id === modo)?.descripcion}
        </p>
      </div>

      {/* ─── Categorías de sugerencias ────────────────────── */}
      {modo !== 'silencioso' && (
        <>
          <hr className="border-border/30" />
          <div>
            <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2.5">
              Sugerencias activas
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIAS.map((cat) => {
                const Icon = cat.icon;
                const activa = !silenciadas[cat.id];
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategoria(cat.id)}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      activa
                        ? 'border-indigo-500/15 bg-indigo-500/5'
                        : 'border-border/40 bg-background text-muted-foreground/50'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        activa ? 'bg-indigo-500/10 text-indigo-500' : 'bg-muted text-muted-foreground/40'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-tight ${activa ? 'text-foreground' : ''}`}>
                        {cat.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 leading-tight truncate">
                        {cat.descripcion}
                      </p>
                    </div>
                    {/* Toggle dot */}
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
                        activa ? 'bg-indigo-500 shadow-sm shadow-indigo-500/30' : 'bg-muted-foreground/20'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ─── Atajos de teclado ─────────────────────────────── */}
      <hr className="border-border/30" />
      <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground/40">
        <kbd className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[8px]">Ctrl</kbd>
        <span>+</span>
        <kbd className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[8px]">Shift</kbd>
        <span>+</span>
        <kbd className="rounded border border-border/40 bg-muted/50 px-1.5 py-0.5 font-mono text-[8px]">I</kbd>
        <span className="ml-0.5">abrir / cerrar</span>
      </div>
    </div>
  );
}
