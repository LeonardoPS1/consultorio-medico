# Task 3: WhatsApp — textos "turno ofrecido" + `notificarPacienteReasignado`

## Files
- **Modify:** `dashboard/lib/whatsapp-waitlist.ts`
- **Test:** `dashboard/lib/__tests__/whatsapp-waitlist-texts.test.ts` (nuevo)

> ⚠️ Este task corre ANTES de Task 4 (`aceptar`) porque `aceptar` consume `notificarPacienteReasignado`.

## Interfaces

Exportar además (nueva función pública):

```ts
export async function notificarPacienteReasignado(
  turno: { pacienteId: string; fechaHora: Date; medicoId: string },
  pacienteAnteriorId: string,
): Promise<boolean>
```

## Textos nuevos (verbatim — reemplazos EXACTOS)

### `notificarOfertaTurno` (líneas 96-102 actuales) → nuevo mensaje:

```
🎯 Te ofrecemos un turno disponible con el Dr. {medico}:

📅 {fecha}
⏰ {hora}

⏳ Tenés 15 minutos para responder.

👉 Respondé "ACEPTAR" para confirmar.
👉 Respondé "RECHAZAR" si no te sirve.

Si no respondés, se lo ofreceremos a otro paciente.
```

Se mantiene la estructura de consultas existente (turno → inscripcion → paciente → medico), los checks (`!paciente || !paciente.telefono || !paciente.consentimientoWhatsapp` return), y el update de `notificada`/`notificadaAt` si enviado. Solo cambia el `mensaje` y el uso de `fechaStr`/`horaStr` (formato es-CL: `{day:'numeric', month:'long'}` y `{hour:'2-digit', minute:'2-digit'}`). Subtítulo del JSDoc actualizar a "turno disponible (de una cancelación o franja libre)".

### `notificarConfirmacionReasignacion` (línea 197-200 actuales) → nuevo mensaje:

```
✅ Turno confirmado — {fecha} a las {hora}. Te esperamos.
```

(un solo renglón; ejecuta `enviarWhatsApp(paciente.telefono, mensaje, conversationId)` igual que ahora)

### `notificarMedicoReasignacion` (líneas 155-159 actuales) → nuevo mensaje:

```
🔄 Dr. {medico}, un turno cancelado fue reasignado correctamente.
```

Mantener consultas actuales (turno → medico whatsapp → paciente nombre/apellido para construcción) pero el mensaje final es el renglón único de arriba (no el bloque multi-línea actual con 👤 y 📅). `medico` = nombre del médico.

### NEW `notificarPacienteReasignado(turno, pacienteAnteriorId): Promise<boolean>`

Patrón idéntico a las otras notificaciones (try/catch + safeError). Flujo:
1. fetch turno confirmado: no es necesario re-leer turnos — `turno` ya viene con `{pacienteId, fechaHora, medicoId}`.
2. `pacienteAnterior` = fetch paciente por `pacienteAnteriorId` (`{ nombre, telefono }`, deletedAt IS NULL). Si no hay paciente o no tiene telefono → return false.
3. `medico` = fetch medico por `turno.medicoId` (`{ nombre }`, deletedAt IS NULL). Si no → return false.
4. formatear `fechaStr`/`horaStr` es-CL desde `turno.fechaHora` (asegurar Date: `turno.fechaHora instanceof Date ? turno.fechaHora : new Date(turno.fechaHora)`).
5. mensaje:

```
📢 Estimado {pacienteAnterior.nombre}, tu turno con el Dr. {medico.nombre} el {fecha} a las {hora} fue reasignado a otro paciente. Si necesitás otro horario, podemos agendarlo en la lista de espera.
```

6. `return await enviarWhatsApp(pacienteAnterior.telefono, mensaje)`.

JSDoc: "Notifica al paciente desplazado que su turno fue reasignado a otro paciente de la lista de espera."

### `handleWaitlistResponse` (textos solos, líneas 255-272)
- Sin oferta pendiente (actual línea 259): → `'Hola {nombre}, no encontré un turno ofrecido pendiente para vos.'` donde `{nombre}` = nombre del paciente (requiere fetch del paciente por `pacienteId` con `{ nombre }` antes de este mensaje; si no se encuentra, usar el mensaje sin nombre `'No encontré un turno ofrecido pendiente para vos.'`).
- Oferta expirada (actual línea 268): → `'Ese turno ofrecido ya expiró.'`

Puedes simplificar: si el fetch del nombre se complica con el patrón mock, usa los textos sin nombre; pero el plan exige `Hola {nombre}` → implementa el fetch condicional como describí.

## Tests — `dashboard/lib/__tests__/whatsapp-waitlist-texts.test.ts`

Usa el patrón mock de `dashboard/lib/__tests__/whatsapp-waitlist-response.test.ts`:
- `vi.hoisted` con mocks: `mockSelect = vi.fn()`, tabla ROWS Map (`mockSelect`), mocks de `@/drizzle/schema` (turnos/pacientes/medicos/ofertasTurno/listaEspera con `{id:'turnos'}` etc.), `@/lib/whatsapp` → `sendWhatsApp: vi.fn().mockResolvedValue(true)`, `@/lib/logger` → safeLog/safeWarn/safeError, `@/lib/db` → `{ db: { select: h.mockSelect } }`. NO mockees `@/lib/services/waitlist` salvo que el test lo necesite (handleWaitlistResponse no se testea aquí — solo los textos).
- `beforeEach`: `mockSelect.mockClear()`, `sendWhatsApp.mockClear()`, ROWS.clear().
- Fixtures: turnos `[{id:'t1', fechaHora: new Date('2026-08-10T09:00:00')}]`, listaEspera `[{id:'le1', pacienteId:'p1', medicoId:'m1'}]`, pacientes `[{id:'p1', nombre:'Ana', telefono:'+56911111111', consentimientoWhatsapp:true, apellido:'Perez'}]`, medicos `[{id:'m1', nombre:'García', whatsapp:'+56922222222'}]`, ofertasTurno `[{id:'o1', ...}]`.

Tests:
1. **`notificarOfertaTurno` envía mensaje nuevo** — call `notificarOfertaTurno('o1','t1','le1')`; await; assert `sendWhatsApp` called once con `to:'+56911111111'` y `body` contiene `'Te ofrecemos un turno disponible con el Dr. García'`, `'ACEPTAR'`, `'RECHAZAR'`.
2. **`notificarPacienteReasignado` envía mensaje con 'reasignado'** — call `notificarPacienteReasignado({pacienteId:'p2', fechaHora:new Date('2026-08-10T09:00:00'), medicoId:'m1'}, 'pX')`; para que el fetch del paciente anterior resuelva, ROWS de `pacientes` debe incluir el row del anterior; assert `sendWhatsApp` called y `body` contiene `'reasignado'` y `'Dr. García'`.

Opcional (recomendado): test 3 `notificarConfirmacionReasignacion` envía `'Turno confirmado'`.

## Orden TDD
1. Escribir el test (con fixtures arriba) → `cd dashboard && npx vitest run lib/__tests__/whatsapp-waitlist-texts.test.ts` → FAIL (función no exportada / textos viejos).
2. Implementar los cambios en `whatsapp-waitlist.ts`.
3. `cd dashboard && npx vitest run lib/__tests__/whatsapp-waitlist-texts.test.ts` → PASS.
4. `cd dashboard && npx tsc --noEmit` (exit 0) + `cd dashboard && npx eslint lib/whatsapp-waitlist.ts lib/__tests__/whatsapp-waitlist-texts.test.ts` → 0 errores.
5. Commit solo estos 2 archivos:
```bash
git add dashboard/lib/whatsapp-waitlist.ts dashboard/lib/__tests__/whatsapp-waitlist-texts.test.ts
git commit -m "feat(waitlist): textos WhatsApp turno ofrecido + notificarPacienteReasignado"
```

## Global Constraints (recordatorio)
- Sin migraciones de DB.
- Renombrado solo en texto visible. Backend (`ofertasTurno`, `ofertaId`, funciones) NO se renombra.
- Español neutro chileno: usar "Tenés"/"Respondé"/"necesitás" tal como ya usa el archivo (el plan lo permite explícitamente para el canal WhatsApp).
- ESLint `import/order`, Prettier single quotes + trailing commas + printWidth 100. JSDoc en funciones públicas.
- NO toques `waitlistService.aceptar/rechazar` ni el flujo del pipeline en esta task.