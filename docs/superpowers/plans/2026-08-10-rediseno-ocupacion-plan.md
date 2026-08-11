# Rediseño Ocupación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar la pestaña "Ocupación" de Reportes con heatmap semanal 7x13, panel de detalle lateral, KPIs ejecutivos, gráfico de tendencias y recomendaciones automáticas.

**Architecture:** Se extienden los tipos y el servicio backend (`ocupacion-franjas.ts`) con nuevas queries (tendencias, no-show, filtros por médico). Se crean 4 componentes nuevos (KPIs, PanelDetalle, Tendencias, Recomendaciones) y se reescribe `HeatmapFranjas` como orquestador del layout. La API route se extiende con nuevos parámetros opcionales. Todo es aditivo, sin breaking changes.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Drizzle ORM, Recharts, framer-motion, Tailwind CSS, shadcn/ui

## Global Constraints

- TypeScript strict: `strict: true`, `no-explicit-any: error`
- Todos los nuevos campos en la respuesta son opcionales — compatibilidad hacia atrás
- `useReducedMotion()` respetado en animaciones
- Celdas del heatmap con `role="gridcell"` y `aria-label` descriptivo
- Colores de ocupación: Baja=emerald, Media=amber, Alta=orange, Saturada=rose
- Copy en español neutro chileno
- El toggle Demo/Reales existente se mantiene

---

### Task 1: Extender tipos en ocupacion-grilla.ts + generador de recomendaciones

**Files:**
- Modify: `dashboard/lib/services/ocupacion-grilla.ts`

**Interfaces:**
- Consumes: (none — types-only file)
- Produces: `TendenciaSemanal`, `NoShowFranja`, `ResumenOcupacion`, `Recomendacion` types + `generarRecomendaciones()` function

- [ ] **Step 1: Add new types after existing FranjaOcupacion interface**

After the `FranjaOcupacion` interface (line 23), add:

```typescript
export interface TendenciaSemanal {
  semana: number;
  ocupacion: number;
  totalTurnos: number;
}

export interface NoShowFranja {
  dia: number;
  hora: number;
  tasaNoShow: number;
}

export interface ResumenOcupacion {
  ocupacionGeneral: number;
  franjaPico: { dia: number; hora: number; ocupacion: number };
  franjaMasFloja: { dia: number; hora: number; ocupacion: number };
  tendenciaVsAnterior: number;
}

export interface Recomendacion {
  tipo: 'promocionar' | 'abrir_cupos' | 'monitorear';
  mensaje: string;
  franja?: { dia: number; hora: number };
}

export const DIAS_LABEL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_ABREV = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const HORA_MIN = 8;
export const HORA_MAX = 20;
```

- [ ] **Step 2: Extend OcupacionReporte with new optional fields**

Replace the existing OcupacionReporte interface (line 25-37) with:

```typescript
export interface OcupacionReporte {
  franjas: FranjaOcupacion[];
  maxPorDia: { dia: number; max: number }[];
  totalTurnos: number;
  semanas: number;
  totalPorDia: { dia: number; total: number }[];
  _demo?: boolean;
  tendencias?: TendenciaSemanal[];
  noShowPorFranja?: NoShowFranja[];
  resumen?: ResumenOcupacion;
}
```

- [ ] **Step 3: Add generarRecomendaciones() function at end of file**

After `construirGrillaOcupacion()` (before the final blank line), add:

```typescript
export function generarRecomendaciones(data: OcupacionReporte): Recomendacion[] {
  const recs: Recomendacion[] = [];
  if (!data.franjas.length) return recs;

  for (const f of data.franjas) {
    if (f.ocupacion <= 0.2 && f.total > 0) {
      recs.push({
        tipo: 'promocionar',
        mensaje: `${DIAS_LABEL[f.dia]} ${f.hora.toString().padStart(2, '0')}:00 tiene solo ${Math.round(f.ocupacion * 100)}% de ocupación. Promocioná este horario.`,
        franja: { dia: f.dia, hora: f.hora },
      });
    }
    if (f.ocupacion >= 0.85) {
      recs.push({
        tipo: 'abrir_cupos',
        mensaje: `${DIAS_LABEL[f.dia]} ${f.hora.toString().padStart(2, '0')}:00 está saturado al ${Math.round(f.ocupacion * 100)}%. Considerá abrir más cupos.`,
        franja: { dia: f.dia, hora: f.hora },
      });
    }
  }

  if (data.tendencias && data.tendencias.length >= 4) {
    const recientes = data.tendencias.slice(-4);
    const primera = recientes[0].ocupacion;
    const ultima = recientes[recientes.length - 1].ocupacion;
    if (primera > 0 && (ultima - primera) / primera > 0.3) {
      recs.push({
        tipo: 'monitorear',
        mensaje: `La ocupación creció más del 30% en las últimas 4 semanas. Monitoreá la capacidad.`,
      });
    }
  }

  return recs.slice(0, 5);
}
```

- [ ] **Step 4: Verify types**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No new TS errors in ocupacion-grilla.ts

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/services/ocupacion-grilla.ts
git commit -m "feat(ocupacion): extender tipos y agregar generador de recomendaciones"
```

---

### Task 2: Extender servicio backend ocupacion-franjas.ts

**Files:**
- Modify: `dashboard/lib/services/ocupacion-franjas.ts`

**Interfaces:**
- Consumes: `FranjaOcupacion`, `OcupacionReporte`, `TendenciaSemanal`, `NoShowFranja`, `ResumenOcupacion` from `./ocupacion-grilla`
- Produces: `calcularOcupacionFranjas()` (extended), `calcularTendencias()`, `calcularNoShowPorFranja()`, `calcularResumen()`

- [ ] **Step 1: Update imports to include new types**

Replace the import section (line 16-20) with:

```typescript
import { sql } from 'drizzle-orm';
import { turnos, sucursales } from '@/drizzle/schema';
import { db } from '@/lib/db';
import { getTenantId } from '@/lib/request-context';
import { setTenantContext } from '@/lib/rls';
import type {
  TendenciaSemanal,
  NoShowFranja,
  ResumenOcupacion,
} from './ocupacion-grilla';
import { HORA_MIN, HORA_MAX } from './ocupacion-grilla';
```

- [ ] **Step 2: Replace OcupacionReporte and FranjaOcupacion interfaces with re-export**

Replace the local type definitions (lines 23-47) with re-exports from ocupacion-grilla:

```typescript
export type {
  FranjaOcupacion,
  OcupacionReporte,
  TendenciaSemanal,
  NoShowFranja,
  ResumenOcupacion,
  Recomendacion,
} from './ocupacion-grilla';
export { DIAS_LABEL, DIAS_ABREV, HORA_MIN, HORA_MAX } from './ocupacion-grilla';
```

- [ ] **Step 3: Extend calcularOcupacionFranjas() with medicoId filter and new data**

In `calcularOcupacionFranjas()`, add `medicoId` to opts destructuring:

```typescript
export async function calcularOcupacionFranjas(opts?: {
  sucursalId?: string;
  medicoId?: string;
  semanas?: number;
}): Promise<OcupacionReporte> {
  const semanas = opts?.semanas ?? SEMANAS_DEFAULT;
  const desde = new Date();
  desde.setDate(desde.getDate() - semanas * 7);

  // Resolver sucursales
  let sucursalIds: string[] | undefined;
  if (opts?.sucursalId) {
    sucursalIds = [opts.sucursalId];
  } else {
    const sucursalesTenant = await db
      .select({ id: sucursales.id })
      .from(sucursales);
    sucursalIds = sucursalesTenant.map((s) => s.id);
    if (sucursalIds.length === 0) {
      return { franjas: [], maxPorDia: [], totalTurnos: 0, semanas, totalPorDia: [] };
    }
  }

  // Build WHERE conditions
  const conditions = [
    turnos.fechaHora >= desde,
    turnos.deletedAt.isNull(),
    turnos.estado.ne('cancelada'),
    turnos.sucursalId.in(sucursalIds),
  ];
  if (opts?.medicoId) {
    conditions.push(turnos.medicoId.eq(opts.medicoId));
  }

  // Agregar turnos por (dia, hora)
  const rows = await db
    .select({
      dia: sql<number>`EXTRACT(DOW FROM ${turnos.fechaHora})::int`,
      hora: sql<number>`EXTRACT(HOUR FROM ${turnos.fechaHora})::int`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(turnos)
    .where(and(...conditions))
    .groupBy(sql`1`, sql`2`);

  const franjas: FranjaOcupacion[] = (rows as unknown as Array<{
    dia: number; hora: number; total: number;
  }>).map((r) => ({ dia: r.dia, hora: r.hora, total: Number(r.total), ocupacion: 0 }));

  const totalTurnos = franjas.reduce((acc, f) => acc + f.total, 0);
  if (totalTurnos === 0) {
    return { franjas: [], maxPorDia: [], totalTurnos: 0, semanas, totalPorDia: [] };
  }

  // Normalizar
  const maxPorDia = Array.from({ length: 7 }, (_, dia) => {
    const deDia = franjas.filter((f) => f.dia === dia);
    return { dia, max: deDia.length > 0 ? Math.max(...deDia.map((f) => f.total)) : 0 };
  });

  const totalPorDia = Array.from({ length: 7 }, (_, dia) => {
    const deDia = franjas.filter((f) => f.dia === dia);
    return { dia, total: deDia.reduce((acc, f) => acc + f.total, 0) };
  });

  const mapaMax = new Map(maxPorDia.map((m) => [m.dia, m.max]));
  for (const f of franjas) {
    f.ocupacion = mapaMax.get(f.dia) ? f.total / (mapaMax.get(f.dia) as number) : 0;
  }

  // Calcular datos extra
  const [tendencias, noShowPorFranja, resumen] = await Promise.all([
    calcularTendencias(sucursalIds, desde, opts?.medicoId),
    calcularNoShowPorFranja(sucursalIds, desde, opts?.medicoId),
    Promise.resolve(calcularResumen(franjas, maxPorDia, totalTurnos)),
  ]);

  return {
    franjas,
    maxPorDia,
    totalTurnos,
    semanas,
    totalPorDia,
    tendencias,
    noShowPorFranja,
    resumen,
  };
}
```

Note: You need to import `and` from drizzle-orm. Add `and` to the drizzle-orm import on line 16:
```typescript
import { sql, and } from 'drizzle-orm';
```

- [ ] **Step 4: Add calcularTendencias() function**

After the closing `}` of `calcularOcupacionFranjas()`, add:

```typescript
async function calcularTendencias(
  sucursalIds: string[],
  desde: Date,
  medicoId?: string,
): Promise<TendenciaSemanal[]> {
  const conditions: ReturnType<typeof turnos.fechaHora.gte>[] = [
    turnos.fechaHora >= desde,
    turnos.deletedAt.isNull(),
    turnos.estado.ne('cancelada'),
    turnos.sucursalId.in(sucursalIds),
  ];
  if (medicoId) {
    conditions.push(turnos.medicoId.eq(medicoId));
  }

  const rows = await db
    .select({
      semana: sql<number>`EXTRACT(WEEK FROM ${turnos.fechaHora})::int`,
      total: sql<number>`COUNT(*)::int`,
    })
    .from(turnos)
    .where(and(...conditions))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  if (rows.length === 0) return [];

  const semanaMin = rows[0].semana;
  const mapped: TendenciaSemanal[] = (rows as unknown as Array<{ semana: number; total: number }>).map((r) => ({
    semana: r.semana - semanaMin + 1,
    ocupacion: 0,
    totalTurnos: Number(r.total),
  }));

  // Calcular ocupación por semana: total / (dias * horas activas * max_teorico_por_franja)
  const horasActivas = HORA_MAX - HORA_MIN + 1;
  const diasPorSemana = 5; // Lun-Vie aproximado
  const capacidadTeorica = diasPorSemana * horasActivas;

  // Usar el máximo real como referencia
  const maxSemanal = Math.max(...mapped.map((m) => m.totalTurnos), 1);

  for (const m of mapped) {
    m.ocupacion = m.totalTurnos / maxSemanal;
  }

  return mapped;
}
```

- [ ] **Step 5: Add calcularNoShowPorFranja() function**

After `calcularTendencias()`, add:

```typescript
async function calcularNoShowPorFranja(
  sucursalIds: string[],
  desde: Date,
  medicoId?: string,
): Promise<NoShowFranja[]> {
  const conditionsTotal: ReturnType<typeof turnos.fechaHora.gte>[] = [
    turnos.fechaHora >= desde,
    turnos.deletedAt.isNull(),
    turnos.sucursalId.in(sucursalIds),
  ];
  if (medicoId) {
    conditionsTotal.push(turnos.medicoId.eq(medicoId));
  }

  const totales = await db
    .select({
      dia: sql<number>`EXTRACT(DOW FROM ${turnos.fechaHora})::int`,
      hora: sql<number>`EXTRACT(HOUR FROM ${turnos.fechaHora})::int`,
      total: sql<number>`COUNT(*)::int`,
      noShow: sql<number>`COUNT(*) FILTER (WHERE ${turnos.estado} = 'no_asistio')::int`,
    })
    .from(turnos)
    .where(and(...conditionsTotal))
    .groupBy(sql`1`, sql`2`);

  return (totales as unknown as Array<{ dia: number; hora: number; total: number; noShow: number }>)
    .filter((r) => r.total > 0)
    .map((r) => ({
      dia: r.dia,
      hora: r.hora,
      tasaNoShow: Number(r.noShow) / Number(r.total),
    }));
}
```

- [ ] **Step 6: Add calcularResumen() function**

After `calcularNoShowPorFranja()`, add:

```typescript
function calcularResumen(
  franjas: FranjaOcupacion[],
  _maxPorDia: { dia: number; max: number }[],
  totalTurnos: number,
): ResumenOcupacion {
  if (!franjas.length) {
    return {
      ocupacionGeneral: 0,
      franjaPico: { dia: 0, hora: 0, ocupacion: 0 },
      franjaMasFloja: { dia: 0, hora: 0, ocupacion: 0 },
      tendenciaVsAnterior: 0,
    };
  }

  const conTurnos = franjas.filter((f) => f.total > 0);
  const ocupacionGeneral = conTurnos.length > 0
    ? conTurnos.reduce((s, f) => s + f.ocupacion, 0) / conTurnos.length
    : 0;

  const pico = franjas.reduce((max, f) => (f.ocupacion > max.ocupacion ? f : max), franjas[0]);
  const floja = conTurnos.reduce((min, f) => (f.ocupacion < min.ocupacion ? f : min), conTurnos[0] || franjas[0]);

  return {
    ocupacionGeneral: Math.round(ocupacionGeneral * 100) / 100,
    franjaPico: { dia: pico.dia, hora: pico.hora, ocupacion: pico.ocupacion },
    franjaMasFloja: { dia: floja.dia, hora: floja.hora, ocupacion: floja.ocupacion },
    tendenciaVsAnterior: 0,
  };
}
```

- [ ] **Step 7: Update calcularOcupacionTenant() to accept medicoId**

Replace the function to pass through medicoId:

```typescript
export async function calcularOcupacionTenant(opts?: {
  sucursalId?: string;
  tenantId?: string;
  medicoId?: string;
  semanas?: number;
}): Promise<OcupacionReporte> {
  if (opts?.tenantId && opts.tenantId !== getTenantId()) {
    await setTenantContext(opts.tenantId);
  }
  return calcularOcupacionFranjas(opts);
}
```

- [ ] **Step 8: Update getDemoOcupacion() to include new fields**

After the existing `_demo: true` line (line 193), add before the closing `}`:

```typescript
    tendencias: Array.from({ length: semanas }, (_, i) => ({
      semana: i + 1,
      ocupacion: 0.45 + Math.sin(i * 0.8) * 0.25 + Math.round(Math.random() * 2 - 1) * 0.1,
      totalTurnos: 20 + Math.round(Math.random() * 10),
    })),
    noShowPorFranja: [],
    resumen: {
      ocupacionGeneral: 0.58,
      franjaPico: { dia: 4, hora: 10, ocupacion: 0.92 },
      franjaMasFloja: { dia: 2, hora: 14, ocupacion: 0.15 },
      tendenciaVsAnterior: 0.12,
    },
```

- [ ] **Step 9: Verify build**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors in ocupacion-franjas.ts

- [ ] **Step 10: Commit**

```bash
git add dashboard/lib/services/ocupacion-franjas.ts dashboard/lib/services/ocupacion-grilla.ts
git commit -m "feat(ocupacion): extender servicio backend con tendencias, no-show y resumen"
```

---

### Task 3: Extender API route con nuevos parámetros

**Files:**
- Modify: `dashboard/app/api/reportes/ocupacion/route.ts`

**Interfaces:**
- Consumes: Extended `calcularOcupacionFranjas()` with medicoId param
- Produces: Same endpoint, extended response

- [ ] **Step 1: Update route to accept and pass through new query params**

Replace file contents:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiHandler, ok } from '@/lib/api-handler';
import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/features';
import { calcularOcupacionFranjas, getDemoOcupacion } from '@/lib/services/ocupacion-franjas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reportes/ocupacion?demo=true|false&semanas=12&sucursalId=&medicoId=
 */
export const GET = apiHandler(async (request: NextRequest) => {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const plan = session.user?.plan ?? 'free';
  if (!canAccess(plan, 'reportes-avanzados')) {
    return NextResponse.json({ error: 'Tu plan no incluye el mapa de ocupación' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const forceDemo = searchParams.get('demo') !== 'false';
  const semanasRaw = Number(searchParams.get('semanas') ?? '12');
  const semanas = Number.isFinite(semanasRaw) && semanasRaw >= 4 && semanasRaw <= 16 ? semanasRaw : 12;
  const sucursalId = searchParams.get('sucursalId') || undefined;
  const medicoId = searchParams.get('medicoId') || undefined;

  if (forceDemo) {
    const demo = getDemoOcupacion({ semanas });
    return ok(demo);
  }

  try {
    const reporte = await calcularOcupacionFranjas({ semanas, sucursalId, medicoId });
    if (reporte.totalTurnos === 0) {
      const demo = getDemoOcupacion({ semanas });
      return ok({ ...demo, _demo: true });
    }
    return ok(reporte);
  } catch {
    const demo = getDemoOcupacion({ semanas });
    return ok({ ...demo, _demo: true });
  }
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/api/reportes/ocupacion/route.ts
git commit -m "feat(ocupacion): extender API route con filtros sucursal/medico"
```

---

### Task 4: Crear componente KPIsOcupacion

**Files:**
- Create: `dashboard/components/reportes/kpis-ocupacion.tsx`

**Interfaces:**
- Consumes: `OcupacionReporte` from `@/lib/services/ocupacion-grilla`
- Produces: React component `<KPIsOcupacion>` displaying 4 stat cards

- [ ] **Step 1: Create the file**

```typescript
'use client';

import { motion, useReducedMotion } from 'motion/react';
import { Flame, CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { DIAS_ABREV } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';

interface KPIsOcupacionProps {
  data: OcupacionReporte;
}

function indiceDia(dia: number): number {
  return dia === 0 ? 6 : dia - 1;
}

const kpiCards = [
  {
    key: 'ocupacionGeneral',
    label: 'Ocupación general',
    icon: TrendingUp,
    iconColor: 'text-emerald-500',
    format: (d: OcupacionReporte) =>
      d.resumen ? `${Math.round(d.resumen.ocupacionGeneral * 100)}%` : '—',
    subtitle: 'promedio de todas las franjas',
  },
  {
    key: 'pico',
    label: 'Hora pico',
    icon: Flame,
    iconColor: 'text-rose-500',
    format: (d: OcupacionReporte) =>
      d.resumen?.franjaPico?.ocupacion
        ? `${DIAS_ABREV[indiceDia(d.resumen.franjaPico.dia)]} ${d.resumen.franjaPico.hora.toString().padStart(2, '0')}:00`
        : '—',
    subtitle: (d: OcupacionReporte) =>
      d.resumen?.franjaPico?.ocupacion
        ? `${Math.round(d.resumen.franjaPico.ocupacion * 100)}% ocupación`
        : '',
  },
  {
    key: 'floja',
    label: 'Franja más disponible',
    icon: CalendarDays,
    iconColor: 'text-blue-500',
    format: (d: OcupacionReporte) =>
      d.resumen?.franjaMasFloja?.ocupacion !== undefined
        ? `${DIAS_ABREV[indiceDia(d.resumen.franjaMasFloja.dia)]} ${d.resumen.franjaMasFloja.hora.toString().padStart(2, '0')}:00`
        : '—',
    subtitle: (d: OcupacionReporte) =>
      d.resumen?.franjaMasFloja?.ocupacion !== undefined
        ? `${Math.round(d.resumen.franjaMasFloja.ocupacion * 100)}% ocupación`
        : '',
  },
  {
    key: 'tendencia',
    label: 'Tendencia',
    icon: (props: { positivo: boolean }) =>
      props.positivo ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-500" />,
    iconColor: '',
    format: (d: OcupacionReporte) => {
      const v = d.resumen?.tendenciaVsAnterior ?? 0;
      const positivo = v >= 0;
      return positivo ? `+${Math.round(v * 100)}%` : `${Math.round(v * 100)}%`;
    },
    subtitle: 'vs período anterior',
    valueColor: (d: OcupacionReporte) => {
      const v = d.resumen?.tendenciaVsAnterior ?? 0;
      return v >= 0 ? 'text-emerald-600' : 'text-rose-600';
    },
  },
];

export function KPIsOcupacion({ data }: KPIsOcupacionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <motion.div
            key={card.key}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: reduceMotion ? 0 : idx * 0.05 }}
            className="rounded-xl border bg-card p-4"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              {card.key === 'tendencia' ? (
                <IconComponent positivo={(data.resumen?.tendenciaVsAnterior ?? 0) >= 0} />
              ) : (
                <IconComponent className={cn('h-3.5 w-3.5', card.iconColor)} />
              )}
              {card.label}
            </div>
            <p className={cn('text-xl font-bold', card.valueColor?.(data))}>
              {card.format(data)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {typeof card.subtitle === 'function' ? card.subtitle(data) : card.subtitle}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

export default KPIsOcupacion;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/reportes/kpis-ocupacion.tsx
git commit -m "feat(ocupacion): componente KPIs ejecutivos"
```

---

### Task 5: Crear componente PanelDetalleFranja

**Files:**
- Create: `dashboard/components/reportes/panel-detalle-franja.tsx`

**Interfaces:**
- Consumes: `OcupacionReporte`, `NoShowFranja` from `@/lib/services/ocupacion-grilla`
- Produces: React component `<PanelDetalleFranja>` showing detail for selected cell

- [ ] **Step 1: Create the file**

```typescript
'use client';

import { Flame, Clock, AlertTriangle } from 'lucide-react';
import type { OcupacionReporte, NoShowFranja, Recomendacion } from '@/lib/services/ocupacion-grilla';
import { DIAS_LABEL, generarRecomendaciones } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';

interface PanelDetalleFranjaProps {
  data: OcupacionReporte;
  dia: number | null;
  hora: number | null;
}

const NIVELES = [
  { min: 0, max: 0.3, label: 'Baja', color: 'text-emerald-600 dark:text-emerald-400' },
  { min: 0.3, max: 0.6, label: 'Media', color: 'text-amber-600 dark:text-amber-400' },
  { min: 0.6, max: 0.85, label: 'Alta', color: 'text-orange-600 dark:text-orange-400' },
  { min: 0.85, max: Infinity, label: 'Saturada', color: 'text-rose-600 dark:text-rose-400' },
];

function nivelLabel(valor: number): { label: string; color: string } {
  return NIVELES.find((n) => valor > n.min && valor <= n.max) ?? NIVELES[NIVELES.length - 1];
}

function indiceDia(dia: number): number {
  return dia === 0 ? 6 : dia - 1;
}

function fmtHora(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

export function PanelDetalleFranja({ data, dia, hora }: PanelDetalleFranjaProps) {
  if (dia === null || hora === null) {
    return (
      <div className="rounded-xl border bg-card p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
        <Clock className="h-8 w-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Seleccioná una franja del heatmap para ver su detalle
        </p>
      </div>
    );
  }

  const franja = data.franjas.find((f) => f.dia === dia && f.hora === hora);
  const noShow = (data.noShowPorFranja ?? []).find((n) => n.dia === dia && n.hora === hora);
  const nivel = franja ? nivelLabel(franja.ocupacion) : { label: '—', color: 'text-muted-foreground' };
  const recs = generarRecomendaciones(data).filter(
    (r) => r.franja?.dia === dia && r.franja?.hora === hora,
  );

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-base font-semibold mb-4">
        {DIAS_LABEL[dia]} {fmtHora(hora)}
      </h3>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Turnos agendados</p>
          <p className="text-2xl font-bold">{franja?.total ?? 0}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">Nivel de ocupación</p>
          <div className="flex items-center gap-2">
            <p className={cn('text-xl font-bold', nivel.color)}>
              {franja ? `${Math.round(franja.ocupacion * 100)}%` : '—'}
            </p>
            <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted', nivel.color)}>
              {nivel.label}
            </span>
          </div>
        </div>

        {noShow && noShow.tasaNoShow > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Tasa de inasistencia
            </p>
            <p className="text-lg font-bold text-amber-600">
              {Math.round(noShow.tasaNoShow * 100)}%
            </p>
          </div>
        )}

        {recs.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Flame className="h-3 w-3 text-rose-500" />
              Recomendación
            </p>
            {recs.map((r, i) => (
              <p key={i} className="text-sm">{r.mensaje}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelDetalleFranja;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/reportes/panel-detalle-franja.tsx
git commit -m "feat(ocupacion): componente panel detalle de franja"
```

---

### Task 6: Crear componente TendenciasOcupacion

**Files:**
- Create: `dashboard/components/reportes/tendencias-ocupacion.tsx`

**Interfaces:**
- Consumes: `OcupacionReporte` from `@/lib/services/ocupacion-grilla`
- Produces: React component `<TendenciasOcupacion>` with Recharts line+bar chart

- [ ] **Step 1: Create the file**

```typescript
'use client';

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';

interface TendenciasOcupacionProps {
  data: OcupacionReporte;
}

export function TendenciasOcupacion({ data }: TendenciasOcupacionProps) {
  const tendencias = data.tendencias ?? [];

  const chartData = useMemo(() => {
    if (!tendencias.length) return [];
    return tendencias.map((t) => ({
      semana: `S${t.semana}`,
      ocupacion: Math.round(t.ocupacion * 100),
      turnos: t.totalTurnos,
    }));
  }, [tendencias]);

  const promedio = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.round(chartData.reduce((s, d) => s + d.ocupacion, 0) / chartData.length);
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          Tendencia semanal
        </h3>
        <p className="text-sm text-muted-foreground py-4 text-center">
          No hay suficientes datos para mostrar tendencias.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
        <TrendingUp className="h-4 w-4 text-primary" />
        Tendencia semanal
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Ocupación y turnos por semana · promedio {promedio}%
      </p>

      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="semana"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
              unit="%"
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--card))',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'ocupacion') return [`${value}%`, 'Ocupación'];
                return [value, 'Turnos'];
              }}
            />
            <ReferenceLine
              yAxisId="left"
              y={promedio}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Bar
              yAxisId="right"
              dataKey="turnos"
              fill="hsl(var(--primary) / 0.15)"
              radius={[4, 4, 0, 0]}
              barSize={20}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="ocupacion"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TendenciasOcupacion;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/reportes/tendencias-ocupacion.tsx
git commit -m "feat(ocupacion): componente grafico de tendencias semanales"
```

---

### Task 7: Crear componente RecomendacionesOcupacion

**Files:**
- Create: `dashboard/components/reportes/recomendaciones-ocupacion.tsx`

**Interfaces:**
- Consumes: `OcupacionReporte` from `@/lib/services/ocupacion-grilla`
- Produces: React component `<RecomendacionesOcupacion>` with recommendation cards

- [ ] **Step 1: Create the file**

```typescript
'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Lightbulb, TrendingUp, CalendarPlus, Eye } from 'lucide-react';
import { generarRecomendaciones } from '@/lib/services/ocupacion-grilla';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';

interface RecomendacionesOcupacionProps {
  data: OcupacionReporte;
}

const iconMap = {
  promocionar: CalendarPlus,
  abrir_cupos: TrendingUp,
  monitorear: Eye,
};

const colorMap = {
  promocionar: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30',
  abrir_cupos: 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30',
  monitorear: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30',
};

const iconColorMap = {
  promocionar: 'text-emerald-500',
  abrir_cupos: 'text-rose-500',
  monitorear: 'text-amber-500',
};

export function RecomendacionesOcupacion({ data }: RecomendacionesOcupacionProps) {
  const reduceMotion = useReducedMotion();

  const recs = useMemo(() => generarRecomendaciones(data), [data]);

  if (!recs.length) return null;

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Recomendaciones
      </h3>

      <div className="space-y-3">
        {recs.map((rec, idx) => {
          const Icon = iconMap[rec.tipo];
          return (
            <motion.div
              key={idx}
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: reduceMotion ? 0 : idx * 0.05 }}
              className={cn('flex items-start gap-3 rounded-lg border p-3', colorMap[rec.tipo])}
            >
              <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', iconColorMap[rec.tipo])} />
              <p className="text-sm">{rec.mensaje}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default RecomendacionesOcupacion;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/reportes/recomendaciones-ocupacion.tsx
git commit -m "feat(ocupacion): componente recomendaciones automaticas"
```

---

### Task 8: Reescribir HeatmapFranjas (orquestador)

**Files:**
- Modify: `dashboard/components/reportes/heatmap-franjas.tsx`

**Interfaces:**
- Consumes: `KPIsOcupacion`, `PanelDetalleFranja`, `TendenciasOcupacion`, `RecomendacionesOcupacion`, `OcupacionReporte`
- Produces: Full `<HeatmapFranjas>` with heatmap grid + detail panel

- [ ] **Step 1: Rewrite the file completely**

```typescript
'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Flame } from 'lucide-react';
import type { OcupacionReporte } from '@/lib/services/ocupacion-grilla';
import { DIAS_ABREV, DIAS_LABEL, HORA_MIN, HORA_MAX } from '@/lib/services/ocupacion-grilla';
import { cn } from '@/lib/utils';
import { KPIsOcupacion } from './kpis-ocupacion';
import { PanelDetalleFranja } from './panel-detalle-franja';
import { TendenciasOcupacion } from './tendencias-ocupacion';
import { RecomendacionesOcupacion } from './recomendaciones-ocupacion';

interface HeatmapFranjasProps {
  data: OcupacionReporte | null;
  loading?: boolean;
}

const DIAS_ORDER = [1, 2, 3, 4, 5, 6, 0];

const NIVELES = [
  { min: 0, max: 0.3, label: 'Baja', bg: 'bg-emerald-100 dark:bg-emerald-950', fill: 'bg-emerald-400 dark:bg-emerald-500' },
  { min: 0.3, max: 0.6, label: 'Media', bg: 'bg-amber-100 dark:bg-amber-950', fill: 'bg-amber-400 dark:bg-amber-500' },
  { min: 0.6, max: 0.85, label: 'Alta', bg: 'bg-orange-100 dark:bg-orange-950', fill: 'bg-orange-500' },
  { min: 0.85, max: Infinity, label: 'Saturada', bg: 'bg-rose-100 dark:bg-rose-950', fill: 'bg-rose-600' },
];

function nivelDe(valor: number) {
  return NIVELES.find((n) => valor > n.min && valor <= n.max) ?? NIVELES[NIVELES.length - 1];
}

function indiceDia(dia: number): number {
  return dia === 0 ? 6 : dia - 1;
}

function fmtHora(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`;
}

export function HeatmapFranjas({ data, loading }: HeatmapFranjasProps) {
  const reduceMotion = useReducedMotion();

  const horas = useMemo(
    () => Array.from({ length: HORA_MAX - HORA_MIN + 1 }, (_, i) => HORA_MIN + i),
    [],
  );

  const [selectedCell, setSelectedCell] = useState<{ dia: number; hora: number } | null>(null);

  const grilla = useMemo(() => {
    const g: Record<number, Record<number, number>> = {};
    for (const d of DIAS_ORDER) g[d] = {};
    if (data) {
      for (const f of data.franjas) {
        if (!g[f.dia]) g[f.dia] = {};
        g[f.dia][f.hora] = f.ocupacion;
      }
    }
    return g;
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2 animate-pulse">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-7 w-16 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-4 space-y-1 animate-pulse">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="flex gap-1">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="h-9 flex-1 bg-muted rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border py-12 text-center">
        <Flame className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          No hay datos suficientes para calcular la ocupación por franja.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KPIsOcupacion data={data} />

      {/* Heatmap + Panel lateral */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border bg-card p-4 overflow-x-auto">
          <h3 className="text-base font-semibold mb-4">Mapa de calor semanal</h3>

          <table className="w-full border-collapse" role="grid" aria-label="Mapa de calor de ocupacion por dia y hora">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground py-1 pr-2 w-12" />
                {DIAS_ORDER.map((d) => (
                  <th
                    key={d}
                    className="text-center text-xs font-medium text-muted-foreground py-1 px-1"
                  >
                    <span className="hidden sm:inline">{DIAS_LABEL[d].slice(0, 3)}</span>
                    <span className="sm:hidden">{DIAS_ABREV[indiceDia(d)]}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {horas.map((hora, rowIdx) => (
                <motion.tr
                  key={hora}
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: reduceMotion ? 0 : rowIdx * 0.02 }}
                >
                  <td className="text-xs font-medium text-muted-foreground py-1 pr-2 text-right tabular-nums">
                    {fmtHora(hora)}
                  </td>
                  {DIAS_ORDER.map((dia) => {
                    const valor = grilla[dia]?.[hora] ?? -1;
                    const tieneDatos = valor >= 0;
                    const nivel = tieneDatos ? nivelDe(valor) : null;
                    const f = data.franjas.find((x) => x.dia === dia && x.hora === hora);
                    const total = f?.total ?? 0;
                    const isSelected = selectedCell?.dia === dia && selectedCell?.hora === hora;

                    return (
                      <td key={dia} className="p-0.5">
                        <button
                          type="button"
                          role="gridcell"
                          aria-label={
                            tieneDatos
                              ? `${DIAS_LABEL[dia]} ${fmtHora(hora)}: ${total} turnos, ${Math.round(valor * 100)}% ocupacion`
                              : `${DIAS_LABEL[dia]} ${fmtHora(hora)}: sin datos`
                          }
                          aria-selected={isSelected}
                          onClick={() => setSelectedCell({ dia, hora })}
                          className={cn(
                            'w-full aspect-[1.4] rounded-md transition-all cursor-pointer flex items-center justify-center',
                            tieneDatos
                              ? [
                                  nivel!.fill,
                                  isSelected && 'ring-2 ring-primary ring-offset-1',
                                  'hover:opacity-80',
                                ]
                              : 'bg-muted/50 text-muted-foreground/30',
                            total === 0 && tieneDatos && 'bg-muted/30',
                          )}
                          title={tieneDatos ? `${DIAS_LABEL[dia]} ${fmtHora(hora)}\n${total} turnos · ${Math.round(valor * 100)}% · ${nivel!.label}` : `Sin datos`}
                        >
                          <span className={cn('text-[10px] font-semibold tabular-nums', tieneDatos ? 'text-white dark:text-black' : '')}>
                            {tieneDatos ? total : ''}
                          </span>
                        </button>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Leyenda inline */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
            {NIVELES.map((n) => (
              <div key={n.label} className="flex items-center gap-1.5">
                <span className={cn('h-3 w-3 rounded', n.fill)} />
                {n.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-muted/50" />
              Sin datos
            </div>
          </div>
        </div>

        <PanelDetalleFranja
          data={data}
          dia={selectedCell?.dia ?? null}
          hora={selectedCell?.hora ?? null}
        />
      </div>

      <TendenciasOcupacion data={data} />
      <RecomendacionesOcupacion data={data} />
    </div>
  );
}

export default HeatmapFranjas;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors

- [ ] **Step 3: Commit**

```bash
git add dashboard/components/reportes/heatmap-franjas.tsx
git commit -m "feat(ocupacion): rediseñar heatmap como orquestador con grid+panel+tendencias+recomendaciones"
```

---

### Task 9: Actualizar reportes-client.tsx (integración)

**Files:**
- Modify: `dashboard/app/dashboard/reportes/reportes-client.tsx`

**Interfaces:**
- Consumes: New `HeatmapFranjas` component interface (unchanged props)
- Produces: Updated Ocupacion tab integration

- [ ] **Step 1: Update the Ocupacion tab content in reportes-client.tsx**

Replace lines 522-546 (the Ocupacion TabsContent block) with:

```tsx
         {canVerOcupacion && (
           <TabsContent value="ocupacion" className="mt-4 space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
               <div>
                 <h3 className="text-lg font-semibold flex items-center gap-2">
                   <Flame className="h-5 w-5 text-primary" /> Ocupación por día y horario
                 </h3>
                 <p className="text-xs text-muted-foreground">
                   {ocupacionData
                     ? `${ocupacionData.totalTurnos} turnos analizados en las últimas ${ocupacionData.semanas} semanas`
                     : 'Cargando datos de ocupación...'}
                 </p>
               </div>
               <div className="flex items-center gap-2">
                 {ocupacionData?._demo && (
                   <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800">⚡ Demo</Badge>
                 )}
                 <div className="flex items-center rounded-lg border p-1">
                   <Button variant={!ocupacionDemo ? 'secondary' : 'ghost'} size="sm" onClick={() => setOcupacionDemo(false)}>Reales</Button>
                   <Button variant={ocupacionDemo ? 'secondary' : 'ghost'} size="sm" onClick={() => setOcupacionDemo(true)}>Demo</Button>
                 </div>
               </div>
             </div>

             <HeatmapFranjas data={ocupacionData} loading={ocupacionLoading} />
           </TabsContent>
         )}
```

- [ ] **Step 2: Verify full build**

Run: `npx tsc --noEmit` in dashboard directory

Expected: No TS errors

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/dashboard/reportes/reportes-client.tsx
git commit -m "feat(ocupacion): actualizar integracion en reportes-client"
```

---

### Task 10: Build verification y ajustes finales

**Files:**
- None (verification only)

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit` in dashboard directory

Expected: 0 errors

- [ ] **Step 2: Build**

Run: `npm run build` in dashboard directory (or `npx next build`)

Expected: Build exits 0

- [ ] **Step 3: Lint check**

Run: `npx eslint dashboard/components/reportes/kpis-ocupacion.tsx dashboard/components/reportes/panel-detalle-franja.tsx dashboard/components/reportes/tendencias-ocupacion.tsx dashboard/components/reportes/recomendaciones-ocupacion.tsx dashboard/components/reportes/heatmap-franjas.tsx`

Expected: 0 new errors (preexisting warnings allowed)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "chore(ocupacion): fix build and lint issues" || echo "No fixes needed"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```
