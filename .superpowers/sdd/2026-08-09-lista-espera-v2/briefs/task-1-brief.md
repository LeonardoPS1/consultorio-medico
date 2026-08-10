# Task 1: `proximasFranjasLibres` en `lib/services/waitlist.ts`

**Files:**
- Modify: `dashboard/lib/services/waitlist.ts`
- Test: `dashboard/lib/services/__tests__/waitlist-franjas.test.ts`

**Interfaces:**
- Consumes: `db`, `medicos`, `turnos`, `bloqueosAgenda` de `@/drizzle/schema`; `eq, and, gte, lte, inArray, sql` de `drizzle-orm`.
- Produces:

```ts
export interface IFranjaLibre {
  fechaHora: Date;
  duracionMinutos: number;
}

export async function proximasFranjasLibres(
  medicoId: string,
  opts: { dias?: number; limite?: number } = {},
): Promise<IFranjaLibre[]>
```

Comportamiento (adaptar `slotsDisponibles` de `dashboard/lib/services/portal-booking.ts:111-244` SIN `servicioId`):
- Lee `medicos` (row por `medicoId`, campo `horarios`/`horariosAtencion` jsonb, `duracionTurnoMinutos` default 30).
- Para cada día `1..dias` (default 7) desde hoy: `getDiaSemana(fecha)` → horario (soporta `tipo:'partido'` con `inicio2/fin2`; días `[Domingo..Sábado]`).
- Excluye bloques de `bloqueosAgenda` solapados y turnos existentes (estado `notIn(['cancelada','no_asistio'])`).
- Push `{ fechaHora, duracionMinutos }` de slots futuros (`fechaHora > new Date()`), asc; corta al llegar a `limite`.

## Global Constraints (aplican a este task)

- **Sin migraciones de DB.** Schema `listaEspera`/`ofertasTurno` intacto.
- Renombrado solo en texto visible al usuario; backend NO se renombra.
- Todo texto al usuario en español neutro chileno.
- ESLint `import/order`, Prettier single quotes, trailing commas, printWidth 100. JSDoc en funciones públicas.
- Tests con Vitest + patrón mock DB existente (`vi.hoisted`, `ROWS` Map, chain `then`).

## Pasos

- [ ] **Step 1: Escribir test fallido**

Crea `dashboard/lib/services/__tests__/waitlist-franjas.test.ts` con el patrón mock de `dashboard/lib/__tests__/whatsapp-waitlist-response.test.ts` (mocks de `@/drizzle/schema`, `@/drizzle/db` con `db.select = h.mockDb`, `@/lib/logger`). Fixtures: `medicos` con horarios lun-vie 09:00-13:00 y `duracionTurnoMinutos: 30`; `turnos` con uno a las 09:00; `bloqueosAgenda` uno 10:00-11:00. Tests:
1. Devuelve slots respetando horario, excluyendo turnos ocupados y bloques.
2. Respeta `limite` y `dias`.
3. No devuelve franjas en el pasado (si hoy ya pasó la franja, saltar al día siguiente).

- [ ] **Step 2: Correr test → FAIL**

```bash
cd dashboard && npx vitest run lib/services/__tests__/waitlist-franjas.test.ts
```
Expected: FAIL — función no exportada.

- [ ] **Step 3: Implementar**

Copiar y adaptar la lógica de generación de slots de `portal-booking.ts` (sin parte de `servicioId`/precio). Exportar `IFranjaLibre` y `proximasFranjasLibres`.

- [ ] **Step 4: Correr test → PASS**

```bash
cd dashboard && npx vitest run lib/services/__tests__/waitlist-franjas.test.ts
```

- [ ] **Step 5: tsc + commit**

```bash
cd dashboard && npx tsc --noEmit
git add dashboard/lib/services/waitlist.ts dashboard/lib/services/__tests__/waitlist-franjas.test.ts
git commit -m "feat(waitlist): proximasFranjasLibres calcula franjas libres del médico"
```