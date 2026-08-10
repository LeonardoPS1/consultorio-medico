# Task 2 — `crearOferta` ampliada: turno existente o franja libre

## Status: DONE

## Commits

- `7bbfd13` — `feat(waitlist): crearOferta soporta turno existente o franja libre + límite por paciente`

## Qué se implementó

`dashboard/lib/services/waitlist.ts` — `waitlistService.crearOferta` ahora acepta `input: string | CrearOfertaInput`:

- `CrearOfertaInput = { turnoId: string } | { fechaHora: Date; pacienteId: string; medicoId: string }` (exportado).
- `OfertaCreada = InferSelectModel<typeof ofertasTurno>` (exportado).
- **Caso A (`turnoId`)**: valida turno existe (id + `deletedAt IS NULL`), mismo médico que la inscripción, fecha futura, estado en `['pendiente','confirmada','cancelada']`, y que no exista oferta pendiente para ese turno.
- **Caso B (`fechaHora`)**: llama `proximasFranjasLibres(medicoId, {dias:7, limite:20})`; si la fechaHora no coincide con una franja → conflict `'Franja no disponible para el médico'`; si coincide, inserta turno nuevo (estado `pendiente`, tipo `consulta`, fuente `web`, `duracionMinutos` de la franja) y usa su id.
- **Común**: límite de 1 oferta pendiente por paciente vía innerJoin `ofertasTurno`→`listaEspera` (excluye la inscripción actual) con `not(eq(...))`; expiración 15 min; insert de oferta con `.returning()`.
- Mensajes de error en español neutro (verbatim del brief). Callers existentes SIN cambios (`string` sigue compilando como subtipo del parámetro).

## Tests

- Archivo: `dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts` (8 tests, patrón mock `vi.hoisted` + ROWS Map + insert chain).
- Comando: `cd dashboard && npx vitest run lib/services/__tests__/waitlist-crear-oferta.test.ts`
- Resultado: **8/8 pass** (además `waitlist-franjas.test.ts` 3/3 sigue green tras los cambios).
- TDD: primero se corrió el test contra la firma vieja → 8 FAIL (confirmó ejercicio). Tras implementar → 8 PASS.
- Verificación: `npx tsc --noEmit` **exit 0**; `npx eslint lib/services/waitlist.ts lib/services/__tests__/waitlist-crear-oferta.test.ts` **0 errors** (76 warnings preexistentes en otros métodos, exit 0). Pre-commit hook (eslint --fix + prettier + vitest related) completó OK.

## Concerns

1. **Desviación de firma vs brief**: el brief declara `input: CrearOfertaInput` y afirma que los callers pasando `string` "siguen compilando", pero `string` NO es asignable a `CrearOfertaInput` (`{ turnoId: string }` sí lo es, el string plano no). Los 3 callers (`ejecutarPipeline`, `turnosService.update` en lib/services/turnos.ts:445, ruta `app/api/waitlist/[id]/oferta/route.ts`) pasan `string`. Para cumplir el requisito duro "NO cambies callers + deben compilar", el parámetro se declaró `string | CrearOfertaInput` y se normaliza a objeto internamente. `npx tsc --noEmit` exit 0 confirma. Si el plan exige la firma literal `input: CrearOfertaInput`, habría que actualizar los callers (fuera del alcance de esta task).
2. El insert del turno nuevo usa `duracionMinutos: franja.duracionMinutos` directo; la variable `duracion = franja.duracionMinutos || medicos.duracionTurnoMinutos || 30` del brief se omitió por ser código muerto (referenciaba la columna `medicos`, siempre truthy, y el valor ya lo trae la franja) — evitaría `no-unused-vars`.
3. `ProximasFranjasLibres` se ejercita real (no mockeada) en tests B, cubriendo la integración con Task 1.

---

## Fix round 1 — turno huérfano en Caso B por límite por paciente

### Qué cambió

`dashboard/lib/services/waitlist.ts` (`crearOferta`): el chequeo "máximo 1 oferta pendiente por paciente" (innerJoin `ofertasTurno`→`listaEspera` con `not(eq(listaEsperaId))`) se movió de después del split de casos (~272-282) a **inmediatamente después de la validación de inscripción activa** (~210), ANTES del `if ('turnoId' in objetivo)`. El `conflict('Ya existe un turno ofrecido pendiente para este paciente')` ahora se dispara antes de persistir el turno nuevo de Caso B, eliminando la ventana en la que quedaba un `turnos` huérfano (`estado: 'pendiente'`, sin oferta que lo referencie) que bloqueara la franja en `proximasFranjasLibres` y apareciera como turno fantasma en agenda/KPIs. En Caso A no hay cambio funcional de validaciones (mismo orden de checks, ahora uno antes). Callers intactos.

### Covering tests

- Archivo: `dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts` (8)
- Comando: `cd dashboard && npx vitest run lib/services/__tests__/waitlist-crear-oferta.test.ts`
- Resultado: **8/8 pass** (test 6 sigue cubriendo el rechazo por límite por paciente; query de join ahora corre antes que en la versión previa). Comando: `npx vitest run lib/services/__tests__/waitlist-crear-oferta.test.ts` → 1 file, 8 tests passed.

### Verificación

- `npx tsc --noEmit` → **exit 0**.
- `npx eslint lib/services/waitlist.ts lib/services/__tests__/waitlist-crear-oferta.test.ts` → **0 errors** (73 warnings preexistentes, exit 0).

### Commit

- `fix(waitlist): evitar turno huérfano al rechazar oferta por límite por paciente`