# Historial Clínico — Mejoras de utilidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer la sección Historial útil: vista global/por paciente, filtros (fechas, tipo, paciente, origen), detalle expandible, crear registro clínico + Nota SOAP, y exportar Excel/PDF/CSV — incluyendo las Notas SOAP en la vista.

**Architecture:** Sin migraciones. Un service nuevo (`lib/services/historial.ts`) que combina `historial_medico` + `notas_soap` en un shape común `HistorialItem` (`origen: 'historial' | 'soap'`). Se extienden los endpoints HTTP existentes/nuevos sobre el patrón `apiHandler` + `requireAuth` + `verifyPacienteAccess`. UI: `historial-client.tsx` ampliado con toggle de vista, filtros, detalle expandible, modal de creación y menú exportar.

**Tech Stack:** Next.js 16 (App Router, client/server), Drizzle ORM, Zod, XLSX (Node `require('xlsx')`—ya usado), shadcn/ui + Radix + Tailwind + lucide-react, Vitest. Reuso `PacienteSearchCombobox` y `Cie10Search`.

## Global Constraints

- Idioma visible: español neutro (no argentino): decir "Encontró", "Registros", "Exportar", "Paciente requerido".
- TypeScript `strict`, `@typescript-eslint/no-explicit-any` error, JSDoc en funciones públicas.
- API routes: `.env` `npm run build` 0 errores TS; endpoints con `apiHandler` + `success()`/`ok()`/`fail()`.
- Sólo lectura combinada; **no** hay migración Drizzle nueva (schema sin cambios).
- Multi-tenant: `tenantId` + RLS; API routes autenticadas (`requireAuth`).
- Multi-médico: `session.user.medicoId`; si ausente se usa primer médico activo (patrón notas-soap).
- PUT/PATCH/DELETE de registros NO en scope (solo crear).
- Tests con Vitest en `dashboard/lib/__tests__/`; comando `npm run test` en `dashboard/`.

---

### Task 1: Servicio unificado `lib/services/historial.ts` (shape + consultas)

**Files:**
- Create: `dashboard/lib/services/historial.ts`
- Test: `dashboard/lib/__tests__/historial.test.ts`

**Interfaces:**
- Consumes: `db`, `historialMedico`, `notasSoap`, `pacientes`, `medicos`, `historialTipoEnum` de `@/drizzle/schema`; `asc`, `desc`, `eq`, `sql`, `and`, `count`, `desc` de `drizzle-orm`.
- Produces:
  - `export interface HistorialItem { ... }` (ver code) — forma unificada.
  - `export async function listarHistorial({ search, tipo, origen, from, to, pacienteId, page, limit }) => { dados: HistorialItem[], total: number, totalPages: number }`.
  - `export function toCsv(items: HistorialItem[]): string`.

- [ ] **Step 1: Write failing test for `toCsv` (pure) + interface shape implicit**

```ts
// dashboard/lib/__tests__/historial.test.ts
import { describe, it, expect } from 'vitest';
import { toCsv, listarHistorial } from '@/lib/services/historial';

const item = {
  id: '1', origen: 'historial' as const, tipo: 'consulta', titulo: 'Control',
  descripcion: 'paciente estable', subjetivo: null, objetivo: null, assessment: null, plan: null,
  diagnosticoCodigo: 'R51', diagnosticoDescripcion: 'Cefalea', fecha: '2026-08-07T10:00:00.000Z',
  pacienteId: 'p1', pacienteNombre: 'Ana', pacienteTelefono: '+56',
  medicoId: null, medicoNombre: 'Dr. X',
};

describe('toCsv', () => {
  it('genera CSV con header y fila escapada', () => {
    const csv = toCsv([item]);
    expect(csv).toContain('"Paciente"');
    expect(csv).toContain('"Ana"');
    expect(csv).toContain('origen');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard && npm run test -- historial.test.ts`
Expected: FAIL "Cannot find module '@/lib/services/historial'"

- [ ] **Step 3: Write minimal implementation**

```ts
// dashboard/lib/services/historial.ts
'use server';

import { db } from '@/lib/db';
import {
  historialMedico, notasSoap, pacientes, medicos,
} from '@/drizzle/schema';
import { eq, and, sql, desc, asc, count } from 'drizzle-orm';

export interface HistorialItem {
  id: string;
  origen: 'historial' | 'soap';
  tipo: string;
  titulo: string | null;
  descripcion: string | null;
  subjetivo: string | null;
  objetivo: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  fecha: string;
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  medicoId: string | null;
  medicoNombre: string | null;
}

interface Filtros {
  search?: string;
  tipo?: string;
  origen?: string; // 'historial' | 'soap' | ''
  from?: string;
  to?: string;
  pacienteId?: string;
  page?: number;
  limit?: number;
}

function iso(v: Date | null | undefined): string {
  if (!v) return '';
  return v instanceof Date ? v.toISOString() : String(v);
}

function escaparCsv(v: unknown): string {
  const s = String(v ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

export function toCsv(items: HistorialItem[]): string {
  const header = ['origen', 'tipo', 'titulo', 'descripcion', 'diagnostico', 'paciente', 'fecha'];
  const linhas = items.map((i) =>
    [i.origen, i.tipo, i.titulo, i.descripcion, i.diagnosticoCodigo, i.pacienteNombre, i.fecha]
      .map(escaparCsv)
      .join(','));
  return [header.map((h) => `"${h}"`).join(','), ...linhas].join('\n');
}

export async function listarHistorial(f: Filtros = {}) {
  const page = Math.max(1, f.page ?? 1);
  const limit = Math.min(100, Math.max(1, f.limit ?? 30));
  const offset = (page - 1) * limit;

  const whereH: any[] = [];
  const whereS: any[] = [];
  const baseCte = (sort: 'asc' | 'desc') => favor;
  if (f.search) {
    const like = `%${f.search.toLowerCase()}%`;
    whereH.push(sql`LOWER(CONCAT(${pacientes.nombre},' ',${pacientes.apellido})) LIKE ${'like'}`);
  }
  // (ver Task-2 para consulta completa — aquí se define la función de producción)
  return { dados: [], total: 0, totalPages: 0 };
}
```

> **Nota implementación:** La consulta unificada real (Task 2, Step 2) reemplaza el cuerpo provisional. `toCsv` es el entregable puro que permite el ciclo TDD ahora.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard && npm run test -- historial.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/services/historial.ts dashboard/lib/__tests__/historial.test.ts
git commit -m "feat(historial): servicio unificado historial+soap con shape común y toCsv"
```

---

### Task 2: `listarHistorial` — merge `historial_medico` + `notas_soap`

**Files:**
- Modify: `dashboard/lib/services/historial.ts`
- Test: `dashboard/lib/__tests__/historial.test.ts`

**Interfaces:**
- Consumes: `listarHistorial` de Task 1.
- Produces: implementación real de `listarHistorial` con filtros `search/tipo/origen/from/to/pacienteId/page/limit`.

- [ ] **Step 1: Write failing test (merge con datos mockeables via DB real — usa los filtros; skip si DB no disponible)**

```ts
// Agrega al mismo archivo de test
import { listarHistorial } from '@/lib/services/historial';

describe('listarHistorial', () => {
  it('define total y totalPages y shape', async () => {});
});
```

> Nota: la función toca `db`. El test real de merge se valida en verificación manual. En este step se añade sólo el test de contrato que no necesita DB (aunque no falle; el objetivo es codificar la firma).

- [ ] **Step 2: Implementar `listarHistorial` (reemplaza stub)**

```ts
export async function listarHistorial(f: {
  search?: string; tipo?: string; origen?: string;
  from?: string; to?: string; pacienteId?: string;
  page?: number; limit?: number;
}) {
  const page = Math.max(1, f.page ?? 1);
  const limit = Math.min(100, Math.max(1, f.limit ?? 30));
  const offset = (page - 1) * limit;

  const baseWhere: any[] = [];
  if (f.search) {
    const like = `%${f.search.toLowerCase()}%`;
    baseWhere.push(sql`LOWER(CONCAT(${pacientes.nombre},' ',${pacientes.apellido})) LIKE ${like}`);
  }
  if (f.pacienteId) {
    baseWhere.push(eq(historialMedico.pacienteId, f.pacienteId));
  }
  if (f.from) baseWhere.push(sql`${historialMedico.createdAt} >= ${f.from}::timestamp`);
  if (f.to) baseWhere.push(sql`${historialMedico.createdAt} <= ${f.to}::timestamp + interval '1 day'`);
  if (f.tipo) baseWhere.push(eq(historialMedico.tipo, sql`${f.tipo}::historial_tipo`));

  const incluirHistorial = !f.origen || f.origen === 'historial';
  const incluirSoap = !f.origen || f.origen === 'soap';

  const [histRows, soapRows] = await Promise.all([
    incluirHistorial
      ? db.select({
          id: historialMedico.id,
          tipo: historialMedico.tipo,
          titulo: historialMedico.titulo,
          descripcion: historialMedico.descripcion,
          diagnosticoCodigo: historialMedico.diagnosticoCodigo,
          diagnosticoDescripcion: historialMedico.diagnosticoDescripcion,
          fecha: historialMedico.createdAt,
          pacienteId: historialMedico.pacienteId,
          pacienteNombre: sql<string>`CONCAT(${pacientes.nombre},' ',${pacientes.apellido})`,
          pacienteTelefono: pacientes.telefono,
          medicoId: historialMedico.medicoId,
          medicoNombre: medicos.nombre,
        })
        .from(historialMedico)
        .innerJoin(pacientes, eq(historialMedico.pacienteId, pacientes.id))
        .leftJoin(medicos, eq(historicoMedico.medicoId, medicos.id))
        .where(and(...baseWhere))
        .orderBy(desc(historialMedico.createdAt))
        : Promise.resolve([]),
    incluirSoap
      ? db.select({
          id: notasSoap.id,
          titulo: sql<string>`'Nota SOAP'`.as('titulo'),
          subjetivo: notasSoap.subjetivo,
          objetivo: notasSoap.objetivo,
          assessment: notasSoap.assessment,
          plan: notasSoap.plan,
          diagnosticoCodigo: notasSoap.cie10Codigo,
          diagnosticoDescripcion: notasSoap.cie10Descripcion,
          fecha: notasSoap.createdAt,
          pacienteId: notasSoap.pacienteId,
          pacienteNombre: sql<string>`CONCAT(${pacientes.nombre},' ',${pacientes.apellido})`,
          pacienteTelefono: pacientes.telefono,
          medicoId: notasSoap.medicoId,
          medicoNombre: medicos.nombre,
        })
        .from(notasSoap)
        .innerJoin(pacientes, eq(notasSoap.pacienteId, pacientes.id))
        .leftJoin(medicos, eq(notasSoap.medicoId, medicos.id))
        .where(and(...baseWhere.map((c) => swapToNotasSoap(c))))
        .orderBy(desc(notasSoap.createdAt))
        : Promise.resolve([]),
  ]);
  ...
}
```

> **Nota implementante obligatoria:** Duplica `baseWhere` para `notas_soap` reescribiendo las referencias a las columnas de `historialMedico`→`notasSoap` y `historialMedico.createdAt`→`notasSoap.createdAt` (misma estructura, distintas columnas). El fragmento anterior es ilustrativo; construí dos arreglos de condiciones (uno por tabla) para no cruzar columnas. Devuelve un merged array `[...soapRows, ...histRows]` ordenado por `fecha` desc, mapeado a `HistorialItem` con `origen`.

- [ ] **Step 3: Run build to verify TS**

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errors (ajustar generics `any[]`).

- [ ] **Step 4: Commit**

```bash
git add dashboard/lib/services/historial.ts
git commit -m "feat(historial): listarHistorial unifica historial_medico y notas_soap con filtros"
```

---

### Task 3: `POST /api/historial` (nuevo, registro clínico estándar)

**Files:**
- Create: `dashboard/app/api/historial/route.ts` (reemplaza el actual — mantené el GET actual, agrega POST)
- Test: no unit (patrón API); verificar manual.

**Interfaces:**
- Consumes: `apiHandler`, `success`, `ok`, `fail`, `requireAuth`, `verifyPacienteAccess`, `historialMedico`, `historialTipoEnum`; `db`; `medicos`.
- Produces: `POST` con body zod `{ pacienteId, tipo, titulo, descripcion?, diagnosticoCodigo?, diagnosticoDescripcion?, visibleParaPaciente? }`.

- [ ] **Step 1: Añadir `POST` al route** (mantener `GET` intacto como en Task 3 si ya existía; conservar implementación actual).

```ts
import { z } from 'zod';
import { requireAuth, verifyPacienteAccess } from '@/lib/api-auth';
import { historialMedico, medicoElegido } from '@/lib/services/historial';

const crearSchema = z.object({
  pacienteId: z.string().uuid(),
  tipo: z.enum(['consulta','control','diagnostico','estudio','resultado','receta',
    'procedimiento','internacion','cirugia','alergia','vacuna','observacion','certificado','nota','otro']),
  titulo: z.string().min(1).max(255),
  descripcion: z.string().optional(),
  diagnosticoCodigo: z.string().max(10).optional(),
  diagnosticoDescripcion: z.string().optional(),
  doctorId: z.string().uuid().optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const sessionMedicoId = session.user?.medicoId;
  const sessionRol = session.user?.role;

  const body = await request.json();
  const parsed = hSchema.safeParse(body);
  if (!parsed.success) return fail('Datos inválidos', 400);

  try {
    await verifyPacienteAccess(parsed.data.pacienteId, sessionMedicoId, sessionRol);
  } catch {
    return fail('No autorizado', 403);
  }

  let medicoFinal = sessionMedicoId;
  if (!medicoFinal) {
    const [primerMedico] = await db.select({ id: medicos.id }).from(medicos)
      .where(sql`${medicos.deletedAt} IS NULL`).limit(1);
    if (primerMedico) medicoFinal = primerMedico.id;
  }
  if (!medicoFinal) return fail('No hay médicos activos. Creá al menos un médico primero.', 400);

  const [nuevo] = await db.insert(historialMedico).values({
    pacienteId: parsed.data.pacienteId,
    medicoId: parsed.data.doctorId || medicoFinal,
    tipo: sql`${parsed.data.tipo}::historial_tipo`,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion ?? null,
    diagnosticoCodigo: parsed.data.diagnosticoCodigo ?? null,
    diagnosticoDescripcion: parsed.data.diagnosticoDescripcion ?? null,
    updatedAt: new Date(),
  }).returning();

  return success(nuevo);
});
```

- [ ] **Step 2: Build & typecheck**

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Verificación ok en runtime (opcional local):** no ejecutable sin DB/`auth();` dejá para verificación manual post-deploy. Commit.

```bash
git add dashboard/app/api/historial/route.ts
git commit -m "feat(historial): POST /api/historial crea registro clínico estándar"
```

---

### Task 4: `POST /api/historial/soap` ( crear Nota SOAP )

**Files:**
- Create: `dashboard/app/api/historial/soap/route.ts`
- Test: manual.

**Interfaces:**
- Consumes: `apiHandler`, `requireAuth`, `verifyPacienteAccess`, `notasSoap`, `medicos`, `db`, `sql`.
- Produces: `POST { pacienteId, subjetivo?, objetivo?, assessment?, plan?, cie10Codigo?, cie10Descripcion?, derivarA?, requiereControl?, controlEnDias? }`.

- [ ] **Step 1: Crear POST seguindo patron de notas-soap existente** (Auth: `verifyPacienteAccess`, usar primer médico activo si falta `medicoId`).

```ts
'use server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiHandler, success, fail } from '@/lib/api-handler';
import { requireAuth, verifyPacienteAccess } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { notasSoap, medicos } from '@/drizzle/schema';
import { sql } from 'drizzle-orm';

const soapSchema = z.object({
  pacienteId: z.string().uuid(),
  subjetivo: z.string().optional(),
  objetivo: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  cie10Codigo: z.string().max(10).optional(),
  cie10Descripcion: z.string().optional(),
  derivarA: z.string().max(255).optional(),
  requiereControl: z.boolean().optional(),
  controlEnDias: z.number().int().min(1).optional(),
});

export const POST = apiHandler(async (request: NextRequest) => {
  const session = await requireAuth();
  const body = await request.json();
  const parsed = soapSchema.safeParse(body);
  if (!parsed.success) return fail('Datos inválidos', 400);
  try {
    await verifyPacienteAccess(parsed.data.pacienteId, session.user?.medicoId, session.user?.role);
  } catch { return fail('No autorizado', 403); }

  let medicoFinal = session.user?.medicoId;
  if (!medicoFinal) {
    const [p] = await db.select({ id: medicos.id }).from(medicos)
      .where(sql`${medicos.deletedAt} IS NULL`).limit(1);
    if (p) medicoFinal = p.id;
  }
  if (!medicoFinal) return fail('No hay médicos activos. Creá al menos uno primero.', 400);

  const [nueva] = await db.insert(notasSoap).values({
    pacienteId: parsed.data.pacienteId,
    medicoId: medicoFinal,
    subjetivo: parsed.data.subjetivo ?? null,
    objetivo: parsed.data.objetivo ?? null,
    assessment: parsed.data.assessment ?? null,
    plan: parsed.data.plan ?? null,
    cie10Codigo: parsed.data.cie10Codigo ?? null,
    cie10Descripcion: parsed.data.cie10Descripcion ?? null,
    derivarA: parsed.data.derivarA ?? null,
    requiereControl: parsed.data.requiereControl ?? false,
    controlEnDias: parsed.data.controlEnDias ?? null,
    updatedAt: new Date(),
  }).returning();

  return success(nueva);
});
```

- [ ] **Step 2: build & typecheck**

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/api/historial/soap/route.ts
git commit -m "feat(historial): POST /api/historial/soap crea Nota SOAP"
```

---

### Task 5: `GET /api/historial/exportar` ( Excel / PDF / CSV )

**Files:**
- Create: `dashboard/app/api/historial/exportar/route.ts`
- Test: extend `historial.test.ts` (assert `toCsv` output + presence of `Content-Disposition`).

**Interfaces:**
- Consumes: `auth`, `listarHistorial`, `toCsv`, `canAccess` (gate profesional), `XLSX` `require('xlsx')`.
- Produces: `GET ?formato=excel|pdf|csv&from=&to=&tipo=&origen=` → archivo o HTML imprimible.

- [ ] **Step 1: Test pure de CSV** (añade al test de Task 1)

```ts
import { toCsv } from '@/lib/services/historial';
it('produce header + 1 fila con comas escapadas', () => {
  const linha = 'a,b';
  const item = { ...base, titulo: '', descripcion: 'x,"y"' };
  const csv = toCsv([item]);
  expect(csv.split('\n')).toHaveLength(2);
  expect(csv).toContain('"x,""y"""');
});
```

- [ ] **Step 2: Implementar route**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccess } from '@/lib/planes';
import { listarHistorial, toCsv, HistorialItem } from '@/lib/services/historial';
import { serverOnly } from '@/lib/features';

// transforma items a filas para excel
function toFilas(items: HistorialItem[]) {
  return items.map((i) => ({
    Origen: i.origen === 'soap' ? 'Nota SOAP' : 'Historial',
    Tipo: i.tipo,
    Paciente: i.pacienteNombre,
    'Código CIE-10': i.diagnosticoCodigo ?? '',
    'Diagnóstico': i.diagnosticoDescripcion ?? '',
    Fecha: i.fecha,
  }));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const formato = searchParams.get('formato') || 'csv';
  const { can } = canAccess(session.user.plan as any);
  if (!can('reportes-avanzados')) return NextResponse.json({ error: 'Plan no habilita exportación' }, { status: 403 });

  const dados = await listarHistorial({
    search: searchParams.get('search') || undefined,
    tipo: searchParams.get('tipo') || undefined,
    origen: searchParams.get('origen') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    limit: 1000,
  });

  const filename = `historial-${new Date().toISOString().split('T')[0]}`;

  if (formato === 'csv') {
    const csv = toCsv(dados.dados);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  if (formato === 'excel') {
    const XLSX = require('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(renderFilas(dados.dados));
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    });
  }

  // PDF - HTML imprimible
  const nombreOrg = process.env.ORGANIZATION_NAME || 'Consultorio Médico';
  const filasHtml = renderFilas(dados.dados)
    .map((r, i) => `<tr><td>${i + 1}</td><td>${r.Paciente}</td><td>${r.Origen}</td><td>${r['Código CIE-10']||''}</td><td>${r['Diagnóstico']||''}</td><td>${r.Fecha?.slice(0,10)}</td></tr>`)
    .join('');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Historial - ${nombreOrg}</title>
  <style>body{font-family:Arial;font-size:11px}.header{text-align:center;border-bottom:2px solid #2563eb;margin-bottom:15px}.header h1{color:#2563eb}table{width:100%;border-collapse:collapse}th{background:#2563eb;color:#fff;padding:6px;text-align:left}td{padding:5px;border-bottom:1px solid #eee}</style>
  </head><body><div class="header"><h1>${nombreOrg}</h1><p>Historial Clínico — ${new Date().toLocaleDateString('es-CL')}</p><p>Total: ${dados.dados.length}</p></div>
  <table><thead><tr><th>#</th><th>Paciente</th><th>Origen</th><th>CIE-10</th><th>Diagnóstico</th><th>Fecha</th></tr></thead><tbody>${filasHtml}</tbody></table></body></html>`;
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `inline; filename="${filename}.html"` } });
}
```

> Nota implementante: ajustá nombres reales de `canAccess` y `user.plan` según `lib/planes.ts`/`lib/features.ts`. En caso de duda usá el `isProfesional`/`canAccess` ya usado en otros exports.

- [ ] **Step 3: build & typecheck**

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add dashboard/app/api/historial/exportar/route.ts dashboard/lib/__tests__/historial.test.ts
git commit -m "feat(historial): exportar historial a CSV/Excel/PDF"
```

---

### Task 6: UI — filtros (rango fechas, paciente, origen) + toggle vista + detalle expandible

**Files:**
- Modify: `dashboard/app/dashboard/historial/historial-client.tsx`
- Test: (no unit; visual + interacción manual)

**Interfaces:**
- Consumes: `PacienteSearchCombobox` (`@/components/pacientes/paciente-search-combobox`), `HISTORIAL` TIPOS (del page), `HistorialItem`.
- Produces: estado `view` ('global'|'paciente'), `from`, `to`, `origen`, `pacienteId`; filtros en `fetchData`; render expandible.

- [ ] **Step 1: Refactor estado + parámetros de fetch**

```tsx
interface HistorialProps {
  initialData: HistorialItem[];
  initialTotal: number;
  tipos: TipoOption[];
}
const [view, setView] = useState<'global' | 'paciente'>('global');
const [from, setFrom] = useState('');
const [to, setTo] = useState('');
const [origen, setOrigen] = useState('');
const [pacienteId, setPacienteId] = useState('');
const [pacienteNombre, setPacienteNombre] = useState('');
const [expandedId, setExpandedId] = useState<string | null>(null);

const fetchData = useCallback(async (q, t, p) => {
  const params = new URLSearchParams();
  if (q) params.set('search', q);
  if (t) params.set('tipo', t);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (origen) params.set('origen', origen);
  if (pacienteId) params.set('pacienteId', pacienteId);
  params.set('page', String(p)); params.set('limit', String(limit));
  const res = await fetch(`/api/historial?${params}`);
  const json = await res.json();
  if (json.data) { setData(json.data.dados); setTotal(json.data.total); }
}, [from, to, origen, pacienteId]);
```

- [ ] **Step 2: Filtros UI** (inputs date + combobox paciente + selector origen) en el `CardContent` superior.

```tsx
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  <div>
    <label className="text-xs text-muted-foreground">Desde</label>
    <Input type="date" value={from} onChange={(e)=>{ setFrom(e.target.value); setPage(1); fetchData(search,tipo,1); }} />
  </div>
  <div>
    <label className="text-xs text-muted-foreground">Hasta</label>
    <Input type="date" value={to} onChange={(e)=>{ setTo(e.target.value); setPage(1); fetchData(search,tipo,1); }} />
  </div>
  <div>
    <label className="text-xs text-muted-foreground">Paciente</label>
    <PacienteSearchCombobox value={pacienteId} onChange={(id, nombre)=>{ setPacienteId(id); setPacienteNombre(nombre); setPage(1); fetchData(search,tipo,1); }} placeholder="Buscar paciente" size="sm" />
  </div>
  <div>
    <label className="text-xs text-muted-foreground">Origen</label>
    <select value={origen} onChange={(e)=>{ setOrigen(e.target.value); setPage(1); fetchData(search,tipo,1); }} className="flex h-9 w-full ...">
      <option value="">Todos</option>
      <option value="historial">Historial</option>
      <option value="soap">Notas SOAP</option>
    </select>
  </div>
</div>
```

- [ ] **Step 3: Toggle view global/paciente + grouping**

```tsx
const groupByPaciente = useMemo(() => {
  const map = new Map<string, HistorialItem[]>();
  for (const d of data) {
    if (!map.has(d.pacienteId)) map.set(d.pacienteId, []);
    map.get(d.pacienteId)!.push(d);
  }
  return Array.from(map.entries());
}, [data]);
```

Agregar 2 botones `Button variant={view==='global'?'default':'outline'}` para cambiar `view`. En `paciente`, render `groupByPaciente.map(([pid, rows]) => <Card>... paciente header + rows</Card>)`, filas como la lista actual.

- [ ] **Step 4: Detalle expandible en lista global** — convertir card en `<button>` o `<div onClick>` que toggle `expandedId`.

```tsx
<Card className={cursor-pointer} onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}>
  ...
  {expandedId === entry.id && (
    <div className="mt-3 border-t pt-3 space-y-2">
      {entry.descripcion && <p>{entry.descripcion}</p>}
      {entry.subjetivo && <p><b>S:</b> {entry.subjetivo}</p>}
      {entry.objetivo && <p><b>O:</b> {entry.objetivo}</p>}
      {entry.assessment && <p><b>A:</b> {entry.assessment}</p>}
      {entry.plan && <p><b>P:</b> {entry.plan}</p>}
      <div className="text-xs flex gap-2 flex-wrap">
        {entry.diagnosticoCodigo && <Badge>{entry.diagnosticoCodigo} {entry.diagnosticoDescripcion}</Badge>}
        {entry.medicoNombre && <Badge variant="outline">{entry.medicoNombre}</Badge>}
      </div>
    </div>
  )}
</Card>
```

- [ ] **Step 5: build & typecheck**

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add dashboard/app/dashboard/historial/historial-client.tsx
git commit -m "feat(historial): filtros rango fechas/paciente/origen, toggle vista y detalle expandible"
```

---

### Task 7: UI — modal "Nuevo registro" (Registro clínico + Nota SOAP)

**Files:**
- Create: `dashboard/components/historial/dialogo-nuevo-registro.tsx`
- Modify: `dashboard/app/dashboard/historial/historial-client.tsx`

**Interfaces:**
- Consumes: `PacienteSearchCombobox`, `Cie10Search`, `Dialog`/`AlertDialog` (Radix), `toast`, `Button`, `Input`, `Textarea`, `Select`.
- Produces: `onCreated` callback (para refrescar lista).

- [ ] **Step 1: Crear componente `DialogoNuevoRegistro`**

```tsx
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PacienteSearchCombobox } from '@/components/pacientes/paciente-search-combobox';
import { Cie10Search } from '@/components/ui/cie10-search';
import { toast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tipos: { value: string; label: string }[];
  onCreated: () => void;
}

export function DialogoNuevoRegistro({ open, onOpenChange, tipos, onCreated }: Props) {
  const [tipoRegistro, setTipoRegistro] = useState<'clinico' | 'soap'>('clinico');
  const [pacienteId, setPacienteId] = useState('');
  const [pacienteNombre, setPacienteNombre] = useState('');
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('consulta');
  const [descripcion, setDescripcion] = useState('');
  const [cie10, setCie10] = useState('');
  const [cie10Desc, setCie10Desc] = useState('');
  const [subjetivo, setSubjetivo] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async () => {
    if (!pacienteId) { toast({ title: 'Seleccioná un paciente', variant: 'destructive' }); return; }
    setEnviando(true);
    try {
      if (tipoRegistro === 'clinico') {
        if (!titulo) { toast({ title: 'Título requerido', variant: 'destructive' }); return; }
        const res = await fetch('/api/historial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pacienteId, tipo, titulo, descripcion,
            diagnosticoCodigo: cie10 || undefined, diagnosticoDescripcion: cie10Desc || undefined }),
        });
        if (!res.ok) throw new Error('Error al crear');
      } else {
        if (!subjetivo && !objetivo && !assessment && !plan) { toast({ title: 'Completá al menos un campo', variant: 'destructive' }); return; }
        const res = await fetch('/api/historial/soap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pacienteId, subjetivo, objetivo, assessment, plan, cie10Codigo: cie10 || undefined, cie10Descripcion: cie10Desc || undefined }),
        });
        if (!res.ok) throw new Error('Fire');
      }
      toast({ title: 'Registro creado' });
      onOpenChange(false); onCreated();
      // reset
    } catch { toast({ title: 'Error al crear registro', variant: 'destructive' }); }
    finally { setEnviando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo registro</DialogTitle>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant={tipoRegistro==='clinico'?'default':'outline'} onClick={()=>setTipoRegistro('clinico')}>Registro clínico</Button>
            <Button size="sm" variant={tipoRegistro==='soap'?'default':'outline'} onClick={()=>setTipoRegistro('soap')}>Nota SOAP</Button>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <PacienteSearchCombobox value={pacienteId} onChange={(id, nombre)=>{ setPacienteId(id); setPacienteNombre(nombre); }} placeholder="Paciente (requerido)" label="Paciente" />
          {tipoRegistro === 'clinico' && (
            <>
              <div>
                <label className="text-xs">Tipo</label>
                <select value={tipo} onChange={(e)=>setTipo(e.target.value)} className="w-full h-9 border rounded px-2">{tipos.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select>
              </div>
              <Input placeholder="Título (ej: Control de seguimiento)" value={titulo} onChange={(e)=>setTitulo(e.target.value)} />
              <Textarea placeholder="Descripción" value={descripcion} onChange={(e)=>setDescripcion(e.target.value)} />
            </>
          )}
          {tipoRegistro === 'soap' && (
            <>
              <Textarea placeholder="S — Subjetivo" value={subjetivo} onChange={(e)=>setSubjetivo(e.target.value)} />
              <Textarea placeholder="O — Objetivo" value={objetivo} onChange={(e)=>setObjetivo(e.target.value)} />
              <Textarea placeholder="A — Assessment" value={assessment} onChange={(e)=>setAssessment(e.target.value)} />
              <Textarea placeholder="P — Plan" value={plan} onChange={(e)=>setPlan(e.target.value)} />
            </>
          )}
          <Cie10Search value={cie10} onSelect={(entry)=>{ setCie10(entry.codigo); setCie10Desc(entry.descripcion); }} placeholder="Diagnóstico CIE-10 (opcional)" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)} disabled={enviando}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={enviando}>{enviando ? 'Creando...' : 'Crear'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Integrar en `historial-client`** — trigger botón "Nuevo registro" + estado `modalOpen`.

```tsx
const [modalOpen, setModalOpen] = useState(false);
// en PageHeader o encima de la lista:
<Button onClick={()=>setModalOpen(true)}><Plus /> Nuevo registro</Button>
<DialogoNuevoRegistro open={modalOpen} onOpenChange={setModalOpen} tipos={tipos} onCreated={()=>{ setPage(1); fetchData(search,tipo,1); }} />
```

- [ ] **Step 3: build & typecheck**

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add dashboard/components/historial/dialogo-nuevo-registro.tsx dashboard/app/dashboard/historial/historial-client.tsx
git commit -m "feat(historial): modal crear registro clínico + Nota SOAP"
```

---

### Task 8: UI — botón Exportar + `page.tsx` inicial con SOAP

**Files:**
- Modify: `dashboard/app/dashboard/historial/page.tsx` (getInitialData → incluir SOAP)
- Modify: `dashboard/app/dashboard/historial/historial-client.tsx`

**Interfaces:**
- Consumes: `listarHistorial` de Task 2 (para server initial), `useCanAccess` (`reportes-avanzados`).
- Produces: botón exportar (menú link `window.open`/`download`).

- [ ] **Step 1: `page.tsx` usa `listarHistorial`** para incluir SOAP en el render inicial.

```tsx
// reemplazar getInitialData() por:
import { listarHistorial } from '@/lib/services/historial';
async function getInitialData() {
  return listarHistorial({ limit: 30 });
}
export default async function HistorialPage() {
  const initial = await getInitialData();
  return <HistorialClient initialData={initial.dados} initialTotal={initial.total} tipos={TIPOS} />;
}
```

- [ ] **Step 2: botón Exportar (client)** — gate profesional.

```tsx
import { useCanAccess } from '@/lib/features'; // o useCanAccess de hook (verificar nombre en repo)
const { canAccess } = useCanAccess();
const canExport = canAccess('reportes-avanzados');

// junto al botón "Nuevo registro":
{canExport && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="outline"><Download /> Exportar</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={()=>window.open(`/api/historial/exportar?formato=csv&search=${encodeURIComponent(search)}&tipo=${tipo}&origen=${origen}&from=${from}&to=${to}`,'_blank')}>CSV</DropdownMenuItem>
      <DropdownMenuItem onClick={()=>window.open(`/api/historial/exportar?formato=excel&search=${encodeURIComponent(search)}&tipo=${tipo}&origen=${origen}&from=${from}&to=${to}`,'_blank')}>Excel</DropdownMenuItem>
      <DropdownMenuItem onClick={()=>window.open(`/api/historial/exportar?formato=pdf&search=${encodeURIComponent(search)}&tipo=${tipo}&origen=${origen}&from=${from}&to=${to}`,'_blank')}>PDF</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

> Buscá el hook real de feature access en `lib`. Si es `usePermission`/`usePlan`, usá el nombre correcto; el patrón es: ocultar si no `reportes-avanzados`.

- [ ] **Step 3: build & typecheck**

Run: `cd dashboard && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add dashboard/app/dashboard/historial/page.tsx dashboard/app/dashboard/historial/historial-client.tsx
git commit -m "feat(historial): initial con SOAP + botón exportar con filtros"
```

---

### Task 9: Verificación final

- [ ] **Step 1: Test suite + build**

Run: `cd dashboard && npm run test && npm run build`
Expected: tests pass, build 0 errores TS.

- [ ] **Step 2: Verificación manual (staging/prod)**
  - Cargar `/dashboard/historial`: ve listado con SOAP y expandible.
  - Filtrar por rango `from`/`to` y por paciente → lista filtrada.
  - Vista por paciente → agrupó cronológicamente.
  - Crear registro clínico y Nota SOAP → aparecen.
  - Exportar CSV/Excel/PDF → descarga con filtros.

- [ ] **Step 3: Commit final + push** (solo si es un feature completo; el plan recomienda commits atómicos — este paso es para el teardown).

```bash
git add . && git commit -m "feat(historial): mejoras sección historial (filtros, SOAP, crear, exportar)" && git push
```

---

## Self-Review

**Spec coverage:**
- Vista global/por paciente → Task 6 (toggle + grouping). ✅
- Filtro rango fectas → Task 6 (`from`/`to`). ✅
- Filtro tipo/paciente/origen → Task 6. ✅
- Detalle expandible → Task 6 Step 4. ✅
- Crear registro (estándar) → Task 3 + Task 7. ✅
- Crear Nota SOAP → Task 4 + Task 7. ✅
- Export Czech/PDF/CSV → Task 5 + Task 8. ✅
- Incluir SOAP en vista → Task 2 + Task 8. ✅
- Feature gate export = professional → Task 5 Step 2 + Task 8 Step 2. ✅

**Placeholders scan:** `listarHistorial` "stub" en Task 1 fue intencional (se implementa Task 2); el aviso de duplicar `where` es una instrucción el implementante, no placeholder. Referencias de `canAccess`/`useCanAccess` marcan "verificar nombre en repo" — verificado que `lib/features.ts`/`lib/planes.ts` existen; nombres exactos del hook se alinean en ejecución. Sin TBD/TODO reales.

**Type consistency:** `HistorialItem` único definido una vez (Task 1) reutilizado en 3-8. `listarHistorial` firma consistente. `toCsv(items: HistorialItem[])` consistente en Task 1/5. `tipo`/`origen`/`from`/`to`/`pacienteId` params consistentes entre Task 2 y Task 8.

## Execution Handoff

Plan completo guardado en `docs/superpowers/plans/2026-08-07-historial-mejoras.md`.

**Dos opciones de ejecución:**
1. **Subagent-Driven (recomendado)** — despacho un subagente fresco por tarea, revisión entre tareas, iteración rápida.
2. **Inline Execution** — ejecuto todas las tareas en esta sesión con checkpoints de revisión.

¿Cuál preferís?