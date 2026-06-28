/**
 * AsistenteSettings — Configuración del asistente IA.
 *
 * Se muestra como panel colapsable dentro del AsistentePanel.
 * Permite cambiar modo y silenciar categorías de sugerencias.
 */

'use client';

import { MODOS_ASISTENTE, type ModoAsistente } from '@/lib/ia/asistente-prompts';
import { useAsistenteIA } from '@/lib/hooks/use-asistente-ia';
import { MessageSquare, Users, Calendar, Pill } from 'lucide-react';

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
      {/* Modo selector */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Modo del asistente</p>
        <div className="grid grid-cols-3 gap-1.5">
          {MODOS_ASISTENTE.map((m) => (
            <button
              key={m.id}
              onClick={() => onModoChange(m.id)}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-colors ${
                modo === m.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:bg-accent'
              }`}
            >
              <span className="text-base">{m.icono}</span>
              <span className="text-[10px] font-medium leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {MODOS_ASISTENTE.find((m) => m.id === modo)?.descripcion}
        </p>
      </div>

      <hr className="border-border/50" />

      {/* Categorías de sugerencias */}
      {modo !== 'silencioso' && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Sugerencias</p>
          <div className="space-y-2">
            {CATEGORIAS.map((cat) => {
              const Icon = cat.icon;
              const activa = !silenciadas[cat.id]; // true = no silenciada → activa
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategoria(cat.id)}
                  className={`flex items-center gap-2.5 w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                    activa
                      ? 'border-primary/20 bg-primary/5'
                      : 'border-border bg-background opacity-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${activa ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${activa ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {cat.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate">{cat.descripcion}</p>
                  </div>
                  {/* Toggle indicator */}
                  <div
                    className={`h-4 w-7 rounded-full transition-colors relative ${
                      activa ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                        activa ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <hr className="border-border/50" />

      {/* Atajos */}
      <div>
        <p className="text-[10px] text-muted-foreground/60 text-center">
          <kbd className="rounded border bg-muted px-1 font-mono text-[9px]">Ctrl</kbd>
          {' + '}
          <kbd className="rounded border bg-muted px-1 font-mono text-[9px]">Shift</kbd>
          {' + '}
          <kbd className="rounded border bg-muted px-1 font-mono text-[9px]">I</kbd>
          {' para abrir/cerrar'}
        </p>
      </div>
    </div>
  );
}
