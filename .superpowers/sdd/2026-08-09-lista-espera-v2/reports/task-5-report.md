# Task 5 Report — Rutas API (GET turnos-disponibles, GET franjas, POST oferta ampliado)

**Status:** DONE
**Commit:** `82b86ea` — `feat(waitlist): rutas turnos-disponibles y franjas + POST oferta ampliado`

## What was implemented

### 1. `waitlistService.turnosDisponibles(medicoId)` — `dashboard/lib/services/waitlist.ts`
- Query en `turnos` con `leftJoin(pacientes, eq(turnos.pacienteId, pacientes.id))` y WHERE
  `and(eq(medicoId), gte(fechaHora, new Date()), inArray(estado, ['pendiente','confirmada','cancelada']), sql deletedAt IS NULL)`,
  `orderBy(asc(turnos.fechaHora))`.
- Devuelve `{ id, fechaHora, fecha, hora, estado, pacienteNombre, medicoId }` con `fecha` ("10 de agosto")
  y `hora` ("09:00") es-CL y `pacienteNombre` como `'Nombre Apellido'` (o solo nombre si no hay apellido).
- JSDoc público completo.

### 2. `formatearFechaHora(fecha)` — helper exportado (mismo archivo)
- Formateador es-CL compartido usado por `turnosDisponibles` y por `GET /api/waitlist/franjas` (DRY).
- Detalle: `es-CL` por defecto produce "09:00 a. m." (12h); se pasó `hour12: false` para obtener `"09:00"`,
  que es el formato que el brief y los tests esperan para la UI.

### 3. Rutas
- **`GET /api/waitlist/turnos-disponibles?medicoId=`** (nuevo) — patrón copiado de `candidatos/route.ts` (thin, `apiHandler` + `requireAuth`, `success({ data })`, `[]` sin medicoId).
- **`GET /api/waitlist/franjas?medicoId=&dias=&limite=`** (nuevo) — llama `proximasFranjasLibres(medicoId, { dias, limite })`
  (defaults 7/15), mapea con `formatearFechaHora` y `fechaHora.toISOString()`, incluye `duracionMinutos`.
- **`POST /api/waitlist/[id]/oferta`** (reescrito) — zod `discriminatedUnion('tipo')`:
  - `{ tipo: 'turno', turnoId }` → `crearOferta(id, turnoId)` (string).
  - `{ tipo: 'franja', fechaHora, pacienteId, medicoId }` → `crearOferta(id, { fechaHora: new Date(fechaHora), pacienteId, medicoId })`.
  - JSDoc de la ruta actualizado.

## Tests (TDD)
1. Escribí `waitlist-turnos-disponibles.test.ts` primero → `vitest run` → FAIL (3/3, "turnosDisponibles is not a function").
2. Implementé el helper → PASS (3/3).

**Nota de diseño del test:** `and()` de drizzle devuelve un objeto SQL opaco (no evaluable por un mock de cadena),
así que el mock envuelve `drizzle-orm` vía `vi.mock` + `importOriginal` para capturar `inArray`/`gte`/`sql`
y **simula la DB** filtrando rows por estados capturados + `IS NULL`, replicando el SQL real.

- T1: formato exacto (fecha contiene 'agosto', hora '09:00', pacienteNombre 'Ana Perez').
- T2: excluye 'atendido' y deletedAt; incluye 'cancelada'; asserts la query construida (inArray states, gte Date, IS NULL).
- T3: `mockSelect` llamado una vez (thin query).
- Decisión sobre la ruta POST (brief punto 3 optional): **omitida** — las rutas son finas (~30 líneas,
  delegan todo a `crearOferta` ya cubierto por `waitlist-crear-oferta.test.ts` Task 2, 8 tests). Añadir mock de
  `request.json()`/`created` duplicaría infra sin ganancia; consistente con el repo (0 tests de rutas).

## Verification
- `npx vitest run waitlist-turnos-disponibles.test.ts waitlist-crear-oferta.test.ts waitlist-franjas.test.ts` → **14/14 PASS**.
- `npx tsc --noEmit` → exit 0.
- `npx eslint <5 archivos tocados>` → **0 errors** (84 warnings pre-existentes JSDoc en waitlist.ts).
  - Nota: `npx eslint app/api/waitlist` (directorio completo) reporta 6 errores PRE-EXISTENTES en
    `candidatos/route.ts`, `pipeline/route.ts`, `reasignar/route.ts` — archivos que el brief prohíbe tocar. No son míos.

## Constraints
- Sin migraciones DB. No toqué `whatsapp-waitlist.ts`, `aceptar`, `rechazar`, `pipeline`, `listar` ni la lógica de `proximasFranjasLibres` (solo la reutilicé).
- Commit solo los 5 archivos del brief (`.superpowers/` quedó fuera del commit).

## Concerns
- Ninguno bloqueante. Los 6 errores eslint del directorio `app/api/waitlist` son pre-existentes y están en archivos fuera de scope; sugiero un fix separado.