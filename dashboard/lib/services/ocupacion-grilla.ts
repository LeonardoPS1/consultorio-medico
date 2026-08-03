// ============================================================
// ocupacion-grilla.ts — Lógica cliente-SAFE del mapa de calor
// ============================================================
// Separado de `ocupacion-franzas.ts` (fetch server/DB con drizzle +
// postgres) para que componentes cliente puedan importar tipos y
// utilidades puros sin arrastrar `postgres` (Node `tls`/`net`) al
// bundle del browser. Patrón RSC de Next.js: nada de código server
// (db, drizzle, Node built-ins) dentro de la importación de un
// Client Component.
// ============================================================

// ─── Tipos ──────────────────────────────────────────────

export interface FranjaOcupacion {
  /** Día de semana 0=Domingo ... 6=Sábado (EXTRACT DOW) */
  dia: number;
  /** Hora exacta 0-23 */
  hora: number;
  /** Cantidad de turnos agendados en esa franja (excluye cancelados) */
  total: number;
  /** Tasa de ocupación 0-1 normalizada al máximo histórico del mismo día */
  ocupacion: number;
}

export interface OcupacionReporte {
  /** Franjas con al menos 1 turno en la ventana */
  franjas: FranjaOcupacion[];
  /** Máximo histórico por día (para normalización en front) */
  maxPorDia: { dia: number; max: number }[];
  /** Total de turnos considerados en la ventana */
  totalTurnos: number;
  /** Semanas analizadas (default 12) */
  semanas: number;
  /** Turnos por día (para contextualizar el heatmap) */
  totalPorDia: { dia: number; total: number }[];
  _demo?: boolean;
}

// ─── Constantes ─────────────────────────────────────────

export const SEMANAS_DEFAULT = 12;
export const DIAS_IGNORADOS = ['cancelada'];

// ─── Funciones puras (cliente-safe) ────────────────────

/**
 * Genera un dataset de ocupación demo realista (para que la UI se vea
 * completa incluso sin datos reales). Mismo contrato que el servicio real.
 * @param opts
 * @param opts.semanas
 */
export function getDemoOcupacion(opts?: { semanas?: number }): OcupacionReporte {
  const semanas = opts?.semanas ?? SEMANAS_DEFAULT;
  const porDia: Record<number, Array<{ hora: number; total: number }>> = {};
  const horasLaborales = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  for (let dia = 1; dia <= 6; dia++) {
    porDia[dia] = horasLaborales.map((hora) => {
      let base = 2;
      if (dia === 6) base = 1; // sábado flojo
      if (hora === 9 || hora === 10 || hora === 16 || hora === 17) base += 4; // picos
      if (hora === 13) base += 2; // mediodía
      if (hora === 8 || hora === 19) base -= 1;
      return { hora, total: Math.max(0, base + Math.round(Math.random() * 2 - 1)) };
    });
  }

  const franjas: FranjaOcupacion[] = [];
  for (const dia of Object.keys(porDia)) {
    const d = Number(dia);
    const items = porDia[d];
    const max = Math.max(...items.map((i) => i.total), 1);
    for (const item of items) {
      franjas.push({ dia: d, hora: item.hora, total: item.total, ocupacion: item.total / max });
    }
  }

  const maxPorDia = Array.from({ length: 7 }, (_, dia) => ({
    dia,
    max: porDia[dia] ? Math.max(...porDia[dia].map((i) => i.total)) : 0,
  }));
  const totalPorDia = Array.from({ length: 7 }, (_, dia) => ({
    dia,
    total: porDia[dia] ? porDia[dia].reduce((acc, i) => acc + i.total, 0) : 0,
  }));

  return {
    franjas,
    maxPorDia,
    totalTurnos: franjas.reduce((acc, f) => acc + f.total, 0),
    semanas,
    totalPorDia,
    _demo: true,
  };
}

/**
 * Genera una grilla completa 7 días × 24 horas para el heatmap,
 * completando con ocupación 0 las franjas sin turnos.
 * El front recibe esta grilla para renderizar sin lógica extra.
 * @param reporte
 */
export function construirGrillaOcupacion(reporte: OcupacionReporte): number[][] {
  const grilla: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const f of reporte.franjas) {
    grilla[f.dia][f.hora] = f.ocupacion;
  }
  return grilla;
}
