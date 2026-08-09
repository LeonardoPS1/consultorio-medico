# Lista de Espera V2 — Turno Ofrecido, Reasignación y Franjas Libres

> **Para agentic workers:** REQUIRED SUB-SKILL: Usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`) para tracking.

**Goal:** Permitir a la lista de espera ofrecer cualquier turno futuro (no solo cancelados) o crear turnos en franjas libres, renombrando la UI a "turno ofrecido" y reforzando la lógica de ofertas.

**Architecture:** Backend logic in `lib/services/waitlist.ts` (nuevos `proximasFranjasLibres`, `crearOferta` ampliado, `aceptar` reforzado) + 3 rutas API (2 GET catálogo, 1 POST ampliado). UI reescribe el modal "Asignar turno" a 2 pestañas con selector de paciente en espera. Textos WhatsApp y dashboard renombran "oferta" → "turno ofrecido".

**Tech Stack:** TypeScript estricto, Drizzle ORM, Next.js App Router, Vitest (mock de DB), Radix UI + Tailwind.

## Global Constraints

- **Sin migraciones de DB.** Schema `listaEspera`/`ofertasTurno` intacto.
- **Renombrado solo en texto visible al usuario** (UI dashboard + mensajes WhatsApp + ayuda-content). Backend (`ofertasTurno`, `ofertaId`, nombres de funciones de servicio) NO se renombra.
- Todo texto al usuario en español neutro chileno (no argentino, no "vos" → preferir "usted" neutro; usar formas neutras tipo "Respondé"→"Responde" según canal WhatsApp actual).
- ESLint `import/order`, Prettier single quotes, trailing commas, printWidth 100. JSDoc en funciones públicas.
- Tests con Vitest + patrón mock DB existente (`vi.hoisted`, `ROWS` Map, chain `then`).
- Comandos: `cd dashboard && npx tsc --noEmit && npm run test`, `cd dashboard && npx eslint <file>`, `cd dashboard && npm run build`.

---

### Task 1: `proximasFranjasLibres` en `lib/services/waitlist.ts`

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
- Para cada día `1..dias` (default 7) desde hoy: `getDiaSemana(fecha)` → horario (soporta `tipo:'partido'` con `inicio2/fin2`; pagos `[Domingo..Sábado]`).
- Excluye bloques de `bloqueosAgenda` solapados y turnos existentes (estado `notIn(['cancelada','no_asistio'])`).
- Push `{ fechaHora, duracionMinutos }` de slots futuros (`fechaHora > new Date()`), asc; corta al llegar a `limite`.

- [ ] **Step 1: Escribir test fallido**

Crea `dashboard/lib/services/__tests__/waitlist-franjas.test.ts` con el patrón mock de `whatsapp-waitlist-response.test.ts` (mocks de `@/drizzle/schema`, `@/drizzle/db` con `db.select = h.mockDb`, `@/lib/logger`). Fixtures: `medicos` con horarios lun-vie 09:00-13:00 y `duracionTurnoMinutos: 30`; `turnos` con uno a las 09:00; `bloqueosAgenda` uno 10:00-11:00. Tests:
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

---

### Task 2: `crearOferta` ampliada — turno existente o franja libre

**Files:**
- Modify: `dashboard/lib/services/waitlist.ts:147-186`
- Test: `dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts`

**Interfaces:**
- Consumes: `esCrearInput` tipado; `proximasFranjasLibres` (Task 1).
- Produces:

```ts
export type CrearOfertaInput =
  | { turnoId: string }
  | { fechaHora: Date; pacienteId: string; medicoId: string };

export async function crearOferta(
  listaEsperaId: string,
  input: CrearOfertaInput,
): Promise<OfertaCreada>
```

- `OfertaCreada = { id, listaEsperaId, turnoId, estado, notificada, fechaOferta }`.
- Valida inscripción activa (`notFound()` si no).
- Caso `turnoId`:
  - turno existe (no borrado), `turno.medicoId === inscripcion.medicoId`, `turno.fechaHora > now`, `estado` en `['pendiente','confirmada','cancelada']`.
  - Fail messages: `'El turno debe pertenecer al mismo médico del paciente en espera'`, `'El turno debe estar programado en el futuro'`.
  - No debe existir otra oferta pendiente para ese turno → `'Ese turno ya tiene una oferta pendiente'`.
  - **Límite**: máx 1 oferta `pendiente` por paciente (join `ofertasTurno`+`listaEspera` por `pacienteId`) → `'Ya existe un turno ofrecido pendiente para este paciente'`.
- Caso `fechaHora` (no `turnoId`):
  - `franjas = await proximasFranjasLibres(input.medicoId, { dias: 7, limite: 20 })`; si ninguna `f.fechaHora.getTime() === input.fechaHora.getTime()` → `fail('Franja no disponible para el médico')`.
  - Inserta turno nuevo: `estado: 'pendiente'`, `tipoConsulta: 'consulta'`, `duracionMinutos` del slot (default 30), `pacienteId` y `medicoId`, `fuente: 'web'`. Guarda el `turno.id` para la oferta.
- Expiración `new Date(Date.now() + TIEMPO_EXPIRACION_MINUTOS * 60_000)`; `db.insert(ofertasTurno).values({ listaEsperaId, turnoId, expiracion })`.
- Retorna la oferta creada.

- [ ] **Step 1: Escribir test fallido**

`dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts` (mock DB patrón existente). Tests:
1. `turnoId` pendiente → crea oferta (no exige `cancelada`).
2. `turnoId` cancelada → crea oferta.
3. turno de otro médico → rejects `'El turno debe pertenecer al mismo médico'`.
4. turno pasado → rejects `'El turno debe estar programado en el futuro'`.
5. turno con otra oferta pendiente → rejects `'Ese turno ya tiene una oferta pendiente'`.
6. segunda oferta pendiente del mismo paciente → rejects `'Ya existe un turno ofrecido pendiente'`.
7. `fechaHora` de franja libre → crea turno nuevo + oferta con ese `turnoId`.
8. `fechaHora` ocupada → rejects `'Franja no disponible para el médico'`.

- [ ] **Step 2: Correr test → FAIL**

```bash
cd dashboard && npx vitest run lib/services/__tests__/waitlist-crear-oferta.test.ts
```

- [ ] **Step 3: Implementar** (reescribe el cuerpo de `crearOferta`; segui el caso turno pero sin exigir `cancelada`, añade el límite 1-pendiente-paciente y el caso franja).

- [ ] **Step 4: Correr test → PASS** + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/services/waitlist.ts dashboard/lib/services/__tests__/waitlist-crear-oferta.test.ts
git commit -m "feat(waitlist): crearOferta soporta turno existente o franja libre + límite por paciente"
```

---

### Task 3: WhatsApp — textos "turno ofrecido" + `notificarPacienteReasignado`

**Files:**
- Modify: `dashboard/lib/whatsapp-waitlist.ts`
- Test: `dashboard/lib/__tests__/whatsapp-waitlist-texts.test.ts`

> ⚠️ Este task corre ANTES de Task 4 (aceptar) porque `aceptar` consume `notificarPacienteReasignado`.

**Interfaces:**
- Produce (exportadas):

```ts
export async function notificarPacienteReasignado(
  turno: { pacienteId: string; fechaHora: Date; medicoId: string },
  pacienteAnteriorId: string,
): Promise<boolean>
```

- [ ] **Step 1: Escribir test fallido**

`dashboard/lib/__tests__/whatsapp-waitlist-texts.test.ts` (mock `sendWhatsApp` en `@/lib/whatsapp`). Mocks de `turnos`/`pacientes`/`medicos`. Tests:
1. `notificarOfertaTurno` envía mensaje contiene `'Te ofrecemos un turno disponible'`, `'ACEPTAR'`, `'RECHAZAR'`, nombre médico.
2. `notificarPacienteReasignado` envía mensaje contiene `'reasignado'`.

- [ ] **Step 2: run → FAIL**

```bash
cd dashboard && npx vitest run lib/__tests__/whatsapp-waitlist-texts.test.ts
```

- [ ] **Step 3: Implementar los textos nuevos en `whatsapp-waitlist.ts`**:

`notificarOfertaTurno`:
```
🎯 Te ofrecemos un turno disponible con el Dr. {medico}:

📅 {fecha}
⏰ {hora}

⏳ Tenés 15 minutos para responder.

👉 Respondé "ACEPTAR" para confirmar.
👉 Respondé "RECHAZAR" si no te sirve.

Si no respondés, se lo ofreceremos a otro paciente.
```
`notificarConfirmacionReasignacion`: `✅ Turno confirmado — {fecha} a las {hora}. Te esperamos.`
`notificarMedicoReasignacion`: `🔄 Dr. {medico}, un turno cancelado fue reasignado correctamente.`
`notificarPacienteReasignado` (nueva):
```
📢 Estimado {pacienteNombre}, tu turno con el Dr. {medico} el {fecha} a las {hora} fue reasignado a otro paciente. Si necesitás otro horario, podemos agendarlo en la lista de espera.
```
`handleWaitlistResponse`: sin oferta pendiente → `'Hola {nombre}, no encontré un turno ofrecido pendiente para vos.'`; oferta expirada → `'Ese turno ofrecido ya expiró.'`.

- [ ] **Step 4: run → PASS** + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/whatsapp-waitlist.ts dashboard/lib/__tests__/whatsapp-waitlist-texts.test.ts
git commit -m "feat(waitlist): textos WhatsApp turno ofrecido + notificarPacienteReasignado"
```

---

### Task 4: `aceptar` reforzado + notificación paciente reasignado

**Files:**
- Modify: `dashboard/lib/services/waitlist.ts:191-241` (aceptar)
- Test: `dashboard/lib/services/__tests__/waitlist-aceptar.test.ts`

**Interfaces:**
- Consumes: `notificarPacienteReasignado` (Task 3), `turnos, ofertasTurno, listaEspera`.
- Produces: `aceptar(ofertaId)` — retorna `{ oferta, turno }`, ahora con:
  - Chequea oferta pendiente y no expirada (igual actual).
  - **Nuevo:** verifica que el turno NO tenga otra oferta pendiente activa (otra `ofertasTurno` con mismo `turnoId` y `estado:'pendiente'` distinto id) → `conflict('Ese turno ya tiene una oferta pendiente')`.
  - Captura `turno.pacienteId` ANTES de actualizar.
  - UPDATE `turnos` (`pacienteId = inscripcion.pacienteId`, `estado='pendiente'`, `updatedAt`); oferta aceptada + `respondedAt`; listaEspera `'cumplida'`.
  - Si `pacienteAnterior && pacienteAnterior !== inscripcion.pacienteId` → `void import('@/lib/whatsapp-waitlist').then(m => m.notificarPacienteReasignado(turnoActualizado, pacienteAnterior))` fire-and-forget (catch opcional).

- [ ] **Step 1: Escribir test fail**

`dashboard/lib/services/__tests__/waitlist-aceptar.test.ts`:
1. turno con otra oferta pendiente → rejects `'Ese turno ya tiene una oferta pendiente'`.
2. aceptar oferta válida → turno paciente === inscripcion.pacienteId, oferta `aceptada`, listaEspera `'cumplida'`.
3. si turno tenía otro paciente → `notificarPacienteReasignado` llamado (mock en `@/lib/whatsapp-waitlist` con `vi.mock`).

- [ ] **Step 2: run → FAIL**

```bash
cd dashboard && npx vitest run lib/services/__tests__/waitlist-aceptar.test.ts
```

- [ ] **Step 3: Implementar**

Añade el chequeo extra antes del `UPDATE` de turnos y la notificación condicional tras aceptar (usando import dinámico para evitar ciclo import).

- [ ] **Step 4: run → PASS** + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add dashboard/lib/services/waitlist.ts dashboard/lib/services/__tests__/waitlist-aceptar.test.ts
git commit -m "feat(waitlist): aceptar valida turno sin otra oferta y notifica paciente reasignado"
```

---

### Task 5: Rutas API — `GET turnos-disponibles`, `GET franjas`, POST oferta ampliado

**Files:**
- Create: `dashboard/app/api/waitlist/turnos-disponibles/route.ts`
- Create: `dashboard/app/api/waitlist/franjas/route.ts`
- Modify: `dashboard/app/api/waitlist/[id]/oferta/route.ts` (23 líneas, reescribir)
- Modify: `dashboard/lib/services/waitlist.ts` — añadir `turnosDisponibles(medicoId)` helper (puede reutilizar `turnosService.list` con estado filter) — alternativa: query directa en la route.

**Interfaces:**

`GET /api/waitlist/turnos-disponibles?medicoId=<uuid>` → `{ data: [{ id, fechaHora, fecha, hora, estado, pacienteNombre, medicoId }] }`
- Turnos `fechaHora > now`, estados `['pendiente','confirmada','cancelada']`, no borrados del médico.

`GET /api/waitlist/franjas?medicoId=<uuid>&dias=7&limite=15` → `{ data: [{ fechaHora, fecha, hora, duracionMinutos }] }`
- `fecha`/`hora` como formato de turnos (ej. `30/05/2026`, `09:00`).

`POST /api/waitlist/[id]/oferta` body `{ turnoId }` O `{ fechaHora, pacienteId, medicoId }` → `created(oferta)`.
- Zod: `z.discriminatedUnion('tipo', [...] )` o `.superRefine` que exige exactamente una de membros; `fechaHora` como ISO string aceptado por `new Date()`.

- [ ] **Step 1: Escribir test de ruta**

`dashboard/app/api/waitlist/franjas/route.test.ts` y `turnos-disponibles/route.test.ts` siguiendo el patrón de tests de rutas del repo (mock `requireAuth`, `apiHandler`). Cheques: query inválida → 400; válida → `data` array.

- [ ] **Step 2: run → FAIL**

```bash
cd dashboard && npx vitest run app/api/waitlist
```

- [ ] **Step 3: Implementar las 3 rutas** con `apiHandler` + `requireAuth` + zod. La ruta `[id]/oferta` reescribe con el nuevo zod union y llama `crearOferta(id, parsed)`.

- [ ] **Step 4: run → PASS + tsc**

```bash
cd dashboard && npx vitest run app/api/waitlist && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/app/api/waitlist dashboard/lib/services/waitlist.ts
git commit -m "feat(waitlist): rutas turnos-disponibles y franjas + POST oferta ampliado"
```

---

### Task 6: Renombrado UI "turno ofrecido" + KPI + ayuda

**Files:**
- Modify: `dashboard/app/dashboard/lista-espera/lista-espera-client.tsx` (textos)
- Modify: `dashboard/app/dashboard/lista-espera/page.tsx` (KPI label 'Sin oferta activa' → 'Sin turno ofrecido')
- Modify: `dashboard/lib/ayuda-content.ts` (sección 'lista-espera': pasos[1] 'Ofertas automáticas' → 'Turnos ofrecidos automáticamente'; tips)

**Replacements (respetar pluralidad):**

| Actual | Nuevo |
|---|---|
| `Ofertas` | `Turnos ofrecidos` |
| botón `Crear oferta` | `Ofrecer turno` |
| KPI `Sin oferta activa` | `Sin turno ofrecido` |
| badge estado `pendiente` | `Pendiente de confirmación` |
| `Sin ofertas registradas.` | `Sin turnos ofrecidos registrados.` |
| descripción modal cont. 'elegí un turno cancelado...' | 'elaborá un turno disponible para ofrecer...' |
| empty state 'cuando un turno se cancele... oferta vía WhatsApp' | 'Cuando un turno se libere... te va a aparecer el botón para ofrecer un turno disponible por WhatsApp' |
| `aria-label="Ver ofertas"` | `Ver turnos ofrecidos` |

- [ ] **Step 1: Aplicar reemplazos de texto en los 3 archivos** (no reestructurar HTML aún).

```bash
cd dashboard && rg -n -i "oferta" app/dashboard/lista-espera lib/ayuda-content.ts
```

- [ ] **Step 2: tsc + lint**

```bash
cd dashboard && npx tsc --noEmit && npx eslint app/dashboard/lista-espera/lista-espera-client.tsx lib/ayuda-content.ts
```

- [ ] **Step 3: Commit**

```bash
git add dashboard/app/dashboard/lista-espera dashboard/lib/ayuda-content.ts
git commit -m "ui: renombra oferta a turno ofrecido en lista de espera y ayuda"
```

---

### Task 7: UI — Modal "Asignar turno" 2 pestañas + selector de paciente en espera

**Files:**
- Modify: `dashboard/app/dashboard/lista-espera/lista-espera-client.tsx` (reescribir la Dialog de "Asignar turno", líneas ~443-508)

**Design:**
- En el `Dialog` de cada item (`solo si item.estado === 'activa'`), reemplazar la lista única de turnos cancelados por `Tabs` Radix con 2 pestañas:
  - **"Turno existente"**: GET `/api/waitlist/turnos-disponibles?medicoId=` sobre `item.medicoId` → lista ascendente con fecha · hora · paciente actual · estado; botón por turno **"Ofrecer"**.
  - **"Franja libre"**: GET `/api/waitlist/franjas?medicoId=&dias=7&limite=15` → lista fecha · hora · duración; botón **"Ofrecer en este horario"**.
- Encima de las pestañas: **selector de paciente en espera** del mismo médico (los `items` ya contienen todos los esperando del médico; usar `Select`/`Combobox` mostrando `pacienteNombre + pacienteApellido`), default = item fila.
- Preview del destino (`turnoDisponibles`→muestra paciente actual y estado; franja→fecha/hora) tras elegir paciente, antes de confirmar.
- POST:
  - turno existente: `{ turnoId }`
  - franja: `{ fechaHora: ISO, pacienteId, medicoId }` (usar el paciente seleccionado)
- `handleAsignarTurno` actual → reescribir a `handleOfrecerTurno(destino)` manteniendo `setAsignando`, toast success 'Turno ofrecido y notificado por WhatsApp' y error desde `json.error` si aplica; luego `handleRefresh()`.
- Estados de carga de cada pestaña independientes; toggle de pestaña recarga su lista (una sola fetch por apertura con `cache` en estado).

- [ ] **Step 1: Localizar componente de combobox/select existente**

```bash
cd dashboard && rg -l "PacienteSearchCombobox|Select" components app/dashboard/lista-espera
```

- [ ] **Step 2: Implementar el modal** según Design arriba.

- [ ] **Step 3: tsc + lint + build parcial**

```bash
cd dashboard && npx tsc --noEmit && npx eslint app/dashboard/lista-espera/lista-espera-client.tsx
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/app/dashboard/lista-espera/lista-espera-client.tsx
git commit -m "feat(waitlist): modal asignar turno con 2 pestañas y selector de paciente en espera"
```

---

### Task 8: Verificación final

- [ ] **Step 1: Suite completa**

```bash
cd dashboard && npx tsc --noEmit && npm run test
```
0 TS errors; todos los tests pass (24+ exist + 4 nuevos, sin regresiones).

- [ ] **Step 2: Lint archivos tocados**

```bash
cd dashboard && npx eslint app/dashboard/lista-espera lib/services/waitlist.ts lib/whatsapp-waitlist.ts lib/ayuda-content.ts app/api/waitlist lib/__tests__ lib/services/__tests__
```

- [ ] **Step 3: Build producción**

```bash
cd dashboard && npm run build
```
0 errores.

- [ ] **Step 4: Verificar criterios de aceptación de la spec** (5) uno por uno.

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat(waitlist): lista de espera v2 — turno ofrecido, reasignación y franjas libres"
```

---

## Self-Review Checklist

- [ ] **Spec coverage**: Task 1 → 4.2; Task 2 → 4.1 + 4.4 (límite 1 pendiente/paciente); Task 3 → 4.8 (textos); Task 4 → 4.3 + 4.9 (paciente reasignado); Task 5 → 4.5 (rutas); Task 6 → 4.7 (renombrado); Task 7 → 4.6 (modal); Task 8 → criterios aceptación.
- [ ] **Placeholders**: Tasks 3/4/5 tienen tests concretos; ya no hay "Paso X: Implementar" vacíos.
- [ ] **Type consistency**: `IFranjaLibre`, `proximasFranjasLibres(medicoId, {dias, limite})`, `CrearOfertaInput`, `OfertaCreada`, `notificarPacienteReasignado(turno, pacienteAnteriorId)` nombrados idénticos en todas las tasks.
- [ ] **Orden de dependencias**: Task 3 (whatsapp) precede a Task 4 (aceptar la consume); Task 1 precede a Task 2.