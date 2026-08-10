# Task 2 — `crearOferta` ampliada: turno existente o franja libre

## Contexto del proyecto

Estamos implementando "Lista de Espera V2" en el módulo de lista de espera del dashboard. La Task 1 ya agregó `proximasFranjasLibres(medicoId, {dias?, limite?}): Promise<IFranjaLibre[]>` a `dashboard/lib/services/waitlist.ts`, donde `IFranjaLibre = { fechaHora: Date; duracionMinutos: number }`. Esta task amplía `crearOferta` para que además de aceptar un `turnoId` existente (cancelado), también acepte una `fechaHora` de franja libre y cree un turno nuevo.

## Archivos

- Modify: `dashboard/lib/services/waitlist.ts` (función `crearOferta`, actualmente líneas 175-214)
- Test: `dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts` (create)

## Interface contract

```ts
export type CrearOfertaInput =
  | { turnoId: string }
  | { fechaHora: Date; pacienteId: string; medicoId: string };

export async function crearOferta(
  listaEsperaId: string,
  input: CrearOfertaInput,
): Promise<OfertaCreada>
```

`OfertaCreada = { id, listaEsperaId, turnoId, estado, notificada, fechaOferta }` (el row completo de `ofertasTurno` devuelto por `.returning()`).

> ⚠️ **Esta es una firma NUEVA.** Antes era `crearOferta(listaEsperaId: string, turnoId: string)`. Los callers existentes (`ejecutarPipeline`, `turnosService.update`, la ruta `app/api/waitlist/[id]/oferta/route.ts`) llaman con el segundo argumento como string — tras esta task deben seguir compilando: `turnoId: string` es un subtipo válido de `CrearOfertaInput` (a `{turnoId}` le falta la propiedad `turnoId`? No: `{ turnoId: string }` es válido). NO cambies los callers en esta task; solo la firma de la función.

## Comportamiento

Valida inscripción activa primero (igual que hoy: `notFound('Inscripción en lista de espera no encontrada o no activa')` si no existe con `estado: 'activa'`).

### Caso A: `input` tiene `turnoId`

1. Query turno: `{ id, estado, medicoId, fechaHora, deletedAt }` donde `eq(turnos.id, input.turnoId)` y `sql\`${turnos.deletedAt} IS NULL\``, limit 1. Si no existe → `notFound('Turno no encontrado')`.
2. Validaciones (usar `conflict(...)` de `@/lib/api-handler`):
   - `turno.medicoId === inscripcion.medicoId` — si no → `conflict('El turno debe pertenecer al mismo médico del paciente en espera')`.
   - `new Date(turno.fechaHora) > new Date()` — si no → `conflict('El turno debe estar programado en el futuro')`.
   - `turno.estado` en `['pendiente', 'confirmada', 'cancelada']` — si no → `conflict('El turno no está disponible para ser ofrecido')`.
3. Sin otra oferta pendiente para ese turno: query `ofertasTurno.id` donde `eq(turnoId)` y `eq(estado, 'pendiente')`, limit 1. Si hay → `conflict('Ese turno ya tiene una oferta pendiente')`.
4. Límite 1 oferta pendiente por paciente: query con join. Buscar si existe alguna `ofertasTurno` pendiente cuyo `listaEsperaId` apunta a una inscripción del MISMO paciente (`inscripcion.pacienteId`) distinta de esta `listaEsperaId`:
   - `db.select({ id: ofertasTurno.id }).from(ofertasTurno).innerJoin(listaEspera, eq(ofertasTurno.listaEsperaId, listaEspera.id)).where(and(eq(ofertasTurno.estado, 'pendiente'), eq(listaEspera.pacienteId, inscripcion.pacienteId), not(eq(ofertasTurno.listaEsperaId, listaEsperaId)))).limit(1)`.
   - Si existe → `conflict('Ya existe un turno ofrecido pendiente para este paciente')`.

### Caso B: `input` tiene `fechaHora` (no `turnoId`)

1. `franjas = await proximasFranjasLibres(input.medicoId, { dias: 7, limite: 20 })` (función de Task 1, ya importable desde el mismo archivo).
2. Si ninguna franja tiene `f.getTime() === input.fechaHora.getTime()` → `conflict('Franja no disponible para el médico')` (usar `fail`? no — `conflict`).
3. Inserta turno nuevo:
   ```ts
   const duracion = franja.duracionMinutos || medicos.duracionTurnoMinutos || 30; // la franja ya trae duracionMinutos
   const [turnoNuevo] = await db
     .insert(turnos)
     .values({
       pacienteId: input.pacienteId,
       medicoId: input.medicoId,
       fechaHora: input.fechaHora,
       duracionMinutos: franja.duracionMinutos,
       estado: 'pendiente',
       tipoConsulta: 'consulta',
       fuente: 'web',
     })
     .returning({ id: turnos.id });
   ```
   (`turnos.tipoConsulta` es enum `turnoTipoEnum` default `'consulta'`; `fuente` columna varchar(20) existe.)
4. `turnoId = turnoNuevo.id`.

### Común

- Verificar que no haya otra oferta pendiente para el turno (solo aplica al caso A; en caso B el turno es nuevo, no hay). Para diagramar: en caso B saltarse el paso A-3.
- Para el límite por paciente (A-4): también aplica en caso B (mismo chequeo).
- Expiración `new Date(Date.now() + TIEMPO_EXPIRACION_MINUTOS * 60_000)` (TIEMPO_EXPIRACION_MINUTOS = 15).
- `db.insert(ofertasTurno).values({ listaEsperaId, turnoId, expiracion }).returning()` → retorna la oferta creada (return de la función).

## Test (TDD — escribir primero, verlo fallar, luego implementar)

Crea `dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts` con el **mismo patrón mock** de `dashboard/lib/__tests__/whatsapp-waitlist-response.test.ts`:

- `vi.hoisted` definiendo mocks: `mockSelect = vi.fn()`, `mockInsert = vi.fn()` (SE NECESITA mockInsert NUEVO — el patrón de respuesta-solo-mockea select; para esta task el test debe mockear `db.insert`). Adicionalmente mockear `db.innerJoin`? No — innerJoin es parte de la chain de select. Mockear la **chain de insert**: `{ values: () => ({ returning: () => Promise.resolve([row]) }) }`.
- ROWS Map `Map<object, unknown[]>` donde `planos = { turnos: SchemaTable, ofertasTurno: ..., listaEspera: ... }`.
- vi.mock de `@/drizzle/schema` → propaga `{ listaEspera, ofertasTurno, turnos }` (tablas). También `medicos` si lo usas.
- vi.mock de `@/lib/db` → `{ db: { select: mockSelect, insert: mockInsert } }`.
- vi.mock de `@/lib/api-handler` → `{ notFound: vi.fn(), conflict: vi.fn() }` (real: lanzan; para el test, mockear como funciones que `throw new Error(msg)`).
- vi.mock de `@/lib/logger`.

Nota de fixture para `inscripcion`: la query de inscripción usa `.select().from(listaEspera).where(and(eq(listaEspera.id,...), eq(listaEspera.estado,'activa'))).limit(1)`. La chain mock debe resolver del Map.

Tests (8):

1. `turnoId` en estado `pendiente` → crea oferta (NO exige `cancelada`). Assert: `mockInsert` llamado con objeto que contiene `turnoId` y `listaEsperaId`; resultado `estado === 'pendiente'`.
2. `turnoId` en estado `cancelada` → crea oferta (compatibilidad).
3. turno de OTRO médico (medicoId distinto de inscripcion.medicoId) → rechaza con `'El turno debe pertenecer al mismo médico del paciente en espera'`.
4. turno pasado (fechaHora < now) → rechaza `'El turno debe estar programado en el futuro'`.
5. turno con otra oferta pendiente (existe ofertasTurno pendiente para ese turnoId) → rechaza `'Ese turno ya tiene una oferta pendiente'`.
6. segunda oferta pendiente del mismo paciente (existe oferta pendiente de otra inscripción del mismo paciente) → rechaza `'Ya existe un turno ofrecido pendiente para este paciente'`.
7. `fechaHora` de franja libre → inserta turno nuevo + oferta con ese turnoId. (Mockear `proximasFranjasLibres` para devolver una franja con esa fechaHora exacta, o mockear mediante la chain de select que cargue `medicos` y generar franjas reales; recomiendo mockear la funcion via `vi.mock('@/lib/...')`? Dado que es el mismo archivo, mapear via `vi.spyOn`? Mejor: mockear como parte de module — en el test, mockear `@/lib/services/waitlist` NO es viable porque son el código bajo test. En su lugar, mockear la chain de DB para que `proximasFranjasLibres` (que corre queries) devuelva lo que queremos: cargar en ROWS `medicos`, `turnos` (vacío), `bloqueosAgenda` (vacío) y setear `vi.setSystemTime`. Esto ejercita la función real. Alternativa más simple: usar `vi.mock('@/lib/services/waitlist')` NO. → **Decisión: mockear las queries DB que alimentan proximasFranjasLibres: ROWS con `medicos` con horarios que cubran la fechaHora de test, `turnos` vacío, `bloqueosAgenda` vacío, y `vi.setSystemTime` a un horario antes de la franja.**)
8. `fechaHora` ocupada (proximasFranjasLibres devuelve franjas que NO incluyen esa fechaHora) → rechaza `'Franja no disponible para el médico'`.

## Comandos de verificación

```bash
cd dashboard && npx vitest run lib/services/__tests__/waitlist-crear-oferta.test.ts
cd dashboard && npx tsc --noEmit
cd dashboard && npx eslint lib/services/waitlist.ts lib/services/__tests__/waitlist-crear-oferta.test.ts
```

## Restricciones globales del plan

- **Sin migraciones de DB.** Schema `listaEspera`/`ofertasTurno` intacto.
- Renombrado solo en texto visible al usuario (esta task NO toca texto visible de UI).
- Textos de error en español neutro. ESLint `import/order`, Prettier single quotes/trailing commas/printWidth 100. JSDoc en funciones públicas.
- NO cambies callers existentes en esta task (solo `crearOferta` y su firma). `crearOferta(listaEsperaId, input)` — acepta `CrearOfertaInput`.

## Reporte

Escribe tu reporte completo en `D:\OPENCODE\consultorio-medico\.superpowers\sdd\2026-08-09-lista-espera-v2\reports\task-2-report.md`. Devuelve solo: status, commits, resumen de tests (X/Y pass), y concerns.