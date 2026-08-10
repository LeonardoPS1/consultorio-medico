# Task 4: `aceptar` reforzado + notificación paciente reasignado

## Files
- **Modify:** `dashboard/lib/services/waitlist.ts` — función `aceptar` (actualmente líneas 307-357)
- **Test:** `dashboard/lib/services/__tests__/waitlist-aceptar.test.ts` (nuevo)

> ⚠️ Consume `notificarPacienteReasignado` de Task 3 (ya commiteada, disponible en `@/lib/whatsapp-waitlist`). Usa **import dinámico** para evitar ciclo de imports (waitlist.ts ya no importa whatsapp-waitlist estéticamente; el file whatsapp-waitlist.ts SÍ importa `waitlistService`).

## Interfaces
- Produce: `aceptar(ofertaId: string)` — retorna `{ oferta, turno }` (igual que ahora), con lógica reforzada.
- Firmas existentes consumidas: `notificarPacienteReasignado(turno: {pacienteId, fechaHora, medicoId}, pacienteAnteriorId: string): Promise<boolean>`.

## Cambios requeridos en `aceptar` (waitlist.ts:307-357)

### Estado actual (leído)
```ts
async aceptar(ofertaId: string) {
  const [oferta] = await db.select({ id, estado, expiracion, listaEsperaId, turnoId })
    .from(ofertasTurno).where(eq(ofertasTurno.id, ofertaId)).limit(1);
  if (!oferta) notFound('Oferta no encontrada');
  if (oferta.estado !== 'pendiente') conflict('La oferta ya fue ' + oferta.estado);
  if (new Date() > new Date(oferta.expiracion)) conflict('La oferta ha expirado');
  const [inscripcion] = await db.select({ pacienteId }).from(listaEspera)
    .where(eq(listaEspera.id, oferta.listaEsperaId)).limit(1);
  const [turnoActualizado] = await db.update(turnos)
    .set({ pacienteId: inscripcion.pacienteId, estado: 'pendiente', updatedAt: new Date() })
    .where(eq(turnos.id, oferta.turnoId)).returning();
  await db.update(ofertasTurno).set({ estado: 'aceptada', respondedAt: new Date() })
    .where(eq(ofertasTurno.id, ofertaId));
  await db.update(listaEspera).set({ estado: 'cumplida' })
    .where(eq(listaEspera.id, oferta.listaEsperaId));
  return { oferta: { ...oferta, estado: 'aceptada' }, turno: turnoActualizado };
}
```

### Nueva lógica (1) — chequeo turno sin otra oferta pendiente (después del bloque de expiración)
```ts
const [otraOferta] = await db
  .select({ id: ofertasTurno.id })
  .from(ofertasTurno)
  .where(and(eq(ofertasTurno.turnoId, oferta.turnoId), eq(ofertasTurno.estado, 'pendiente'), not(eq(ofertasTurno.id, ofertaId))))
  .limit(1);
if (otraOferta) conflict('Ese turno ya tiene una oferta pendiente');
```

### Nueva lógica (2) — capturar `turno.pacienteId` ANTES del UPDATE
Insertar justo antes del `db.update(turnos)`:
```ts
const [turnoAnterior] = await db
  .select({ pacienteId: turnos.pacienteId })
  .from(turnos)
  .where(eq(turnos.id, oferta.turnoId))
  .limit(1);
```
(No hace falta `notFound` — el turno ya fue validado en `crearOferta`; si falta, `turnoAnterior` es undefined y se compara con cuidado.)

### Nueva lógica (3) — notificar paciente desplazado (después del `return { ... }`, ó antes del return)
```ts
const pacienteAnterior = turnoAnterior?.pacienteId;
if (pacienteAnterior && pacienteAnterior !== inscripcion.pacienteId) {
  // fire-and-forget, import dinámico evita ciclo
  void import('@/lib/whatsapp-waitlist').then((m) => m.notificarPacienteReasignado(turnoActualizado, pacienteAnterior));
}
```
Colocarlo después del `await db.update(listaEspera)...` y antes del `return`. `turnoActualizado` ya tiene `{ pacienteId, fechaHora, medicoId }` (returning() devuelve toda la fila) — encaja con la firma de `notificarPacienteReasignado`.
- Opcional: envolver en try/catch silencioso para que un fallo de notificación no rompa el aceptar (recomendado: `.catch(() => undefined)` tras el `.then` para cumplir fire-and-forget limpio).

### NO tocar
- `crearOferta`, `rechazar`, pipeline, `buscarCandidato*`, `listar*`, `proximasFranjasLibres`.

## Tests — `dashboard/lib/services/__tests__/waitlist-aceptar.test.ts`

Usa el patrón mock de `dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts` (mock DB chain `{from, leftJoin, where, orderBy, limit, then}` + `update` chain `{set, where, returning, then}`). Exigencies del mock:
- `vi.mock('@/drizzle/schema')`, `vi.mock('@/lib/db', () => ({ db: { select: h.mockSelect, update: h.mockUpdate } }))`, `vi.mock('@/lib/api-handler')` (notFound/conflict throw), `vi.mock('@/lib/logger')` (safeLog/safeWarn/safeError).
- **`vi.mock('@/lib/whatsapp-waitlist', () => ({ notificarPacienteReasignado: h.mockNotificar }))`** — con `h.mockNotificar = vi.fn().mockResolvedValue(true)` en vi.hoisted. Como el código usa import dinámico `import('@/lib/whatsapp-waitlist')`, el mock de vi.mock resuelve ese módulo — el test verifica `h.mockNotificar` llamado con los args correctos.
- ROWS Map (mockSelect `then` devuelve `ROWS.get(tabla) ?? []`). Tablas: `ofertasTurno`, `listaEspera`, `turnos`. mockUpdate/mockUpdate set usa chain y devuelve `[{...}]` configurado por test.

Fixtures base (función helper `setupAceptar()`):
- ofertasTurno: `[{ id:'o1', estado:'pendiente', expiracion: new Date(Date.now()+60_000), listaEsperaId:'le1', turnoId:'t1' }]`
- listaEspera: `[{ id:'le1', pacienteId:'pNuevo' }]`
- turnos (para `turnoAnterior`): `[{ id:'t1', pacienteId:'pViejo' }]`

Tests:
1. **turno con otra oferta pendiente → rejects `'Ese turno ya tiene una oferta pendiente'`** — mockSelect para la query `otraOferta` devuelve row `[{ id:'o2' }]`. La forma de distinguir: la query de `otraOferta` es la única con `leftJoin`? NO — usa `and` con `not`. En el patrón mock, `where` recibe la condición; el mock no la inspecciona. Para testear que el conflict se dispara, configurar `ROWS.get(ofertasTurno)` = `[{id:'o2'}]` en el momento de esa query... Problema: la PRIMERA query (`oferta`) también lee ofertasTurno. Solución: usar un mock por-fase (ej. setear ROWS.of€rtasTurno con los dos rows `[oferta, otraOferta]` y confiar en que la query también coge la oferta). Alternativa más controlada: mockear `h.mockSelect` con un `mockImplementation` que devuelve `oferta` en la primera llamada y `[]`/`[otra]` según llamada. **Recomendado:** mockSelect.mockImplementation con un arreglo de respuestas secuenciales (primera=oferta, segunda=inscripcion, tercera=turnoAnterior, cuarta=otraOferta) y verificar que la segunda query de ofertasTurno (con and/not) devuelve el row. Si es demasiado frágil, alternativa simple: para test 1 setear `ROWS.set(ofertasTurno, [oferta, {id:'o2'}])` y el código solo hará el conflict en la 2ª select; el test assert rejects.
2. **aceptar válido** (sin otra oferta): `notificarPacienteReasignado` NO llamado si pNuevo === pViejo (mismo paciente) → oferta aceptada, turno paciente = pNuevo, listaEspera cumplida. Assert específico en `h.mockUpdate` set values o en el return.
3. **turno con otro paciente → `notificarPacienteReasignado` llamado** con `({...turnoActualizado}, 'pViejo')` — setear turnos `[{id:'t1', pacienteId:'pViejo'}]` vs inscripcion `pacienteId:'pNuevo'`; assert `h.mockNotificar` called once.

(Nota: el patrón real del test de crear-oferta calibra la cadena mock; replicarlo fielmente. Si el `crear-oferta.test.ts` usa `ROWS_JOIN` para innerJoin, el de aceptar no usa join → no hacer falta.)

## Orden TDD
1. Escribir el test → `cd dashboard && npx vitest run lib/services/__tests__/waitlist-aceptar.test.ts` → FAIL.
2. Implementar los 3 cambios en `aceptar`.
3. `cd dashboard && npx vitest run lib/services/__tests__/waitlist-aceptar.test.ts` → PASS. Importante: correr también los tests de task previas para no romper nada: `cd dashboard && npx vitest run lib/services/__tests__/waitlist-crear-oferta.test.ts lib/services/__tests__/waitlist-franjas.test.ts`.
4. `cd dashboard && npx tsc --noEmit` (exit 0) + `cd dashboard && npx eslint lib/services/waitlist.ts lib/services/__tests__/waitlist-aceptar.test.ts` → 0 errores.
5. Commit solo los 2 archivos:
```bash
git add dashboard/lib/services/waitlist.ts dashboard/lib/services/__tests__/waitlist-aceptar.test.ts
git commit -m "feat(waitlist): aceptar valida turno sin otra oferta y notifica paciente reasignado"
```

## Global Constraints (recordatorio)
- Sin migraciones de DB. Renombrado solo en texto visible (backend no).
- Español neutro; ESLint import/order + Prettier single quotes + trailing commas + printWidth 100; JSDoc en funciones públicas.
- NO toques `whatsapp-waitlist.ts` (ya implementado en Task 3). Si el import dinámico lanza en el hook lint-staged (vitest related), verifica primero que sí estás usando el import dinámico como pide el brief.