# Task 5: Rutas API — GET turnos-disponibles, GET franjas, POST oferta ampliado

## Files
- **Create:** `dashboard/app/api/waitlist/turnos-disponibles/route.ts`
- **Create:** `dashboard/app/api/waitlist/franjas/route.ts`
- **Modify:** `dashboard/app/api/waitlist/[id]/oferta/route.ts` (23 líneas actuales, REESCRIBIR)
- **Modify:** `dashboard/lib/services/waitlist.ts` — añadir helper `turnosDisponibles(medicoId)` dentro de `waitlistService`
- **Test:** `dashboard/lib/services/__tests__/waitlist-turnos-disponibles.test.ts` (nuevo)

## Contexto del repo (leído)
- No existen tests de rutas (`app/api/**/*.test.ts` no hay ninguno). El patrón del repo: rutas finas con `apiHandler` + `requireAuth`, lógica en el service. Ejemplos reales: `app/api/waitlist/candidatos/route.ts` (20 líneas: `searchParams.get`, `waitlistService.buscarCandidato`, `success({data})`), `app/api/waitlist/route.ts` (GET/POST con zod).
- `turnosService.list()` en `lib/services/turnos.ts` tiene cache TTL 10s y acepta `(fecha?, estado?, medico?, ...)`. Puedes reutilizarlo o consultar directo — ver abajo. NO uses su cache para turnos-disponibles (debe ser fresco).

## Interfaz a producir (contrato exacto)

### 1. `waitlistService.turnosDisponibles(medicoId: string)`
`Promise<Array<{ id: string; fechaHora: Date; fecha: string; hora: string; estado: string; pacienteNombre: string; medicoId: string }>>`

- Query `db.select({ id: turnos.id, fechaHora: turnos.fechaHora, estado: turnos.estado, pacienteId: turnos.pacienteId, medicoId: turnos.medicoId }).from(turnos)` con `and(eq(turnos.medicoId, medicoId), gte(turnos.fechaHora, new Date()), inArray(turnos.estado, ['pendiente','confirmada','cancelada']), isNull(turnos.deletedAt))`, `orderBy(asc(turnos.fechaHora))`. (`isNull` ya se usa en otras queries del mismo archivo — ver `crearOferta` para el pattern exacto).
- Joinear `pacientes` (leftJoin por `turnos.pacienteId`) para `pacienteNombre` = `paciente.nombre` (+ `apellido` si lo tienes a mano, formato `'Nombre Apellido'`; si solo nombre, usar nombre).
- Formato `fecha`/`hora` igual que el resto del repo (es-CL): fecha `{day:'numeric', month:'long'}` con `Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago' })` o el helper que ya uses en waitlist.ts — MIRA cómo formatean otras funciones de waitlist.ts (notificarOfertaTurno usa fechaStr/horaStr es-CL). Hora `{hour:'2-digit', minute:'2-digit'}`.
- JSDoc público sobre la función.

### 2. GET `app/api/waitlist/turnos-disponibles/route.ts`
Patrón copiado de `candidatos/route.ts`:
```ts
'use server';
import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { waitlistService } from '@/lib/services/waitlist';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const medicoId = searchParams.get('medicoId');
  if (!medicoId) return success({ data: [] });
  const turnos = await waitlistService.turnosDisponibles(medicoId);
  return success({ data: turnos });
});
```
(No validar uuid aquí a menos que haya patrón; `candidatos` no valida.)

### 3. GET `app/api/waitlist/franjas/route.ts`
```ts
'use server';
import { NextRequest } from 'next/server';
import { apiHandler, success } from '@/lib/api-handler';
import { requireAuth } from '@/lib/api-auth';
import { proximasFranjasLibres } from '@/lib/services/waitlist';

export const GET = apiHandler(async (request: NextRequest) => {
  await requireAuth();
  const { searchParams } = new URL(request.url);
  const medicoId = searchParams.get('medicoId');
  if (!medicoId) return success({ data: [] });
  const dias = Number(searchParams.get('dias')) || 7;
  const limite = Number(searchParams.get('limite')) || 15;
  const franjas = await proximasFranjasLibres(medicoId, { dias, limite });
  return success({
    data: franjas.map((f) => ({
      fechaHora: f.fechaHora.toISOString(),
      fecha: /* es-CL */,
      hora: /* es-CL */,
      duracionMinutos: f.duracionMinutos,
    })),
  });
});
```
- `fecha`/`hora` = formateo es-CL idéntico al punto anterior (mismo helper).
- Usa el mismo formateador que `turnosDisponibles` para no duplicar lógica.

### 4. REESCRIBIR `app/api/waitlist/[id]/oferta/route.ts`
Body: `{ turnoId }` O `{ fechaHora, pacienteId, medicoId }`. Zod:
```ts
const crearOfertaSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('turno'), turnoId: z.string().uuid('turnoId debe ser UUID') }),
  z.object({
    tipo: z.literal('franja'),
    fechaHora: z.string().min(1, 'fechaHora es requerida'),
    pacienteId: z.string().uuid('pacienteId debe ser UUID'),
    medicoId: z.string().uuid('medicoId debe ser UUID'),
  }),
]);
```
Handler:
```ts
export const POST = apiHandler(async (request: NextRequest, { params: paramsPromise }) => {
  const { id } = await paramsPromise;
  await requireAuth();
  const body = await request.json();
  const parsed = crearOfertaSchema.parse(body);
  const oferta = parsed.tipo === 'turno'
    ? await waitlistService.crearOferta(id, parsed.turnoId)
    : await waitlistService.crearOferta(id, { fechaHora: new Date(parsed.fechaHora), pacienteId: parsed.pacienteId, medicoId: parsed.medicoId });
  return created(oferta);
});
```
- `crearOferta` ya acepta `string | CrearOfertaInput` (firma actual: `crearOferta(listaEsperaId, input: string | CrearOfertaInput)`).
- Mantener el comentario JSDoc de la ruta actualizado.

## Tests — `waitlist-turnos-disponibles.test.ts`

Patrón mock DB del repo (MIRA `dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts` y `waitlist-franjas.test.ts`):
- `vi.hoisted` con mocks: `mockSelect = vi.fn()`, `mockLeftJoin`, ROWS Map, `vi.mock('@/drizzle/schema')`, `vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect } }))`, `vi.mock('@/lib/api-handler', ...)` con notFound/conflict throw, `vi.mock('@/lib/logger')`.
- Tests:
  1. Devuelve turnos futuros del médico con `fecha`/`hora` formateados es-CL y `pacienteNombre` → assert forma exacta del output (fecha contiene nombre de mes, hora `'09:00'`-style, pacienteNombre `'Ana Perez'`).
  2. Excluye turnos borrados (deletedAt no null) y estados fuera de ['pendiente','confirmada','cancelada'] — el mock devuelve rows y la función los filtra con `inArray`/`where` (assert output no incluye el turno cancelado... nota: 'cancelada' ES incluido, usa un turno 'atendido' y uno deletedAt set como los excluidos).
  3. `crearOferta` case A via ruta no se testea aquí (ya cubierto en waitlist-crear-oferta.test.ts Task 2); PERO puedes añadir un test de la ruta nueva del POST si replicas `parseBody` — si es complejo, omítelo: los tests de Task 2 ya cubren `crearOferta`, y las rutas son finas. Decisión del implementer con justificación.

## Orden TDD
1. Escribir `waitlist-turnos-disponibles.test.ts` → `cd dashboard && npx vitest run lib/services/__tests__/waitlist-turnos-disponibles.test.ts` → FAIL (helper no existe).
2. Implementar `turnosDisponibles` en waitlist.ts.
3. `vitest run` → PASS.
4. Crear las 3 rutas.
5. `cd dashboard && npx vitest run lib/services/__tests__/waitlist-turnos-disponibles.test.ts lib/services/__tests__/waitlist-crear-oferta.test.ts lib/services/__tests__/waitlist-franjas.test.ts && npx tsc --noEmit && cd dashboard && npx eslint app/api/waitlist lib/services/waitlist.ts` → todo verde / tsc 0 / eslint 0.
6. Commit (4-5 archivos):
```bash
git add dashboard/app/api/waitlist/turnos-disponibles dashboard/app/api/waitlist/franjas dashboard/app/api/waitlist/\[id\]/oferta dashboard/lib/services/waitlist.ts dashboard/lib/services/__tests__/waitlist-turnos-disponibles.test.ts
git commit -m "feat(waitlist): rutas turnos-disponibles y franjas + POST oferta ampliado"
```

## Global Constraints
- Sin migraciones de DB.
- Renombrado solo en texto visible; backend naming intacto.
- Español neutro chileno en textos.
- ESLint `import/order`, Prettier single quotes + trailing commas + printWidth 100. JSDoc en funciones públicas.
- NO toques `whatsapp-waitlist.ts`, `aceptar`, `rechazar`, `pipeline`, `listar`, `proximasFranjasLibres` (solo leer/reutilizar su formato de fecha si es útil).
- Report path: `.superpowers/sdd/2026-08-09-lista-espera-v2/reports/task-5-report.md`. Reporte con Status/commits/test summary/concerns.