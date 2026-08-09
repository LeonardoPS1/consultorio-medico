# Lista de Espera v2 — Reasignar turnos, turno ofrecido y franjas libres

**Fecha:** 09/08/2026
**Estado:** Aprobado
**Versión objetivo:** 1.37.0
**Autor:** OpenCode (sesión con Leonardo)

---

## 1. Contexto y Problema

La lista de espera actual (`/dashboard/lista-espera`) tiene tres limitaciones que este diseño resuelve:

1. **Solo se pueden ofrecer turnos cancelados.** El modal "Asignar turno" carga únicamente
   `/api/turnos?estado=cancelada` y `crearOferta()` valida `estado === 'cancelada'`. Cuando no hay
   turnos cancelados, el admin no puede aprovechar un turno pendiente/confirmado ni agendar en un
   horario libre.
2. **Terminología confusa.** Se usa "oferta"/"ofertas" en la UI y mensajes de WhatsApp; es poco
   descriptivo para el usuario final.
3. **Poco flexible:** el turno se ofrece solo al paciente de la fila, no permite elegir entre los
   candidatos en espera del mismo médico, ni crear un turno nuevo en una franja libre.

Lo que el usuario quiere (respuestas a preguntas de brainstorming):

- **Ambos**: poder reasignar un turno existente futuro *y* crear un turno nuevo en franja libre.
- Termino visible: **"turno ofrecido"** (aplica a UI dashboard + WhatsApp; backend/DB/schema igual).
- Crear turno nuevo: **franjas libres automáticas** (el admin elige de una lista de franjas libres del
  médico); la confirmación ocurre vía WhatsApp ACEPTAR/RECHAZAR.
- ¿Reasignar turno existente? Elegir entre **pacientes en espera** del mismo médico.
- Ajustar textos de WhatsApp al paciente (manteniendo verbos ACEPTAR/RECHAZAR).
- Texto visible en español neutro chileno.

---

## 2. Objetivos

- Permitir ofrecer **cualquier turno futuro** del médico (estado pendiente/confirmada/cancelada) al
  paciente en espera, incluyendo reasignación de turnos con otro paciente.
- Permitir **crear turno nuevo** en la próxima franja libre del médico, ofreciéndolo vía WhatsApp.
- Renombrar **"oferta" → "turno ofrecido"** en toda la superficie visible (UI + WhatsApp), sin tocar
  el schema ni los nombres internos (`ofertasTurno`, `ofertaId`, servicios).
- Mejorar la lógica de cálculos: límite de ofertas pendientes por paciente, validaciones de
  disponibilidad en `aceptar()`, franjas libres de 7 días.

---

## 3. Arquitectura y Flujo

```
Admin (lista de espera)
  │  "Asignar turno" modal → 2 pestañas:
  │   A) Turno existente  → GET /api/waitlist/turnos-disponibles?medicoId=
  │   B) Turno nuevo      → GET /api/waitlist/franjas?medicoId=&dias=7
  ▼
waitlistService
  │  crearOferta(listaEsperaId, { turnoId } | { fechaHora, pacienteId, medicoId })
  ▼
ofertasTurno (DB) + turnos (nuevo si aplica)
  ▼
notificarOfertaTurno() → WhatsApp al paciente (ACEPTAR/RECHAZAR)
  ▼
handleWaitlistResponse / pipeline: aceptar() / rechazar() / expirar()
```

### Componentes

| Unidad | Responsabilidad | Depende de |
|--------|-----------------|------------|
| `waitlistService.crearOferta` | Crear oferta desde turno existente o crear turno nuevo | turnos, ofertasTurno |
| `waitlistService.proximasFranjasLibres` | Listar franjas libres de un médico a 7 días | horariosAtencion, bloqueosAgenda, turnos |
| `waitlistService.aceptar` | Reasignar turno al paciente + marcas | ofertasTurno, listaEspera, turnos |
| `GET /api/waitlist/turnos-disponibles` | Listar turnos futuros elegibles de un médico | waitlistService |
| `GET /api/waitlist/franjas` | Listar franjas libres próximas | waitlistService |
| `POST /api/waitlist/[id]/oferta` | Crear oferta (turnoId o fechaHora) | waitlistService |
| Modal "Asignar turno" | UX con 2 pestañas + selector de paciente en espera | APIs `turnos-disponibles`, `franjas`, oferta |
| `whatsapp-waitlist.ts` | Textos "turno ofrecido" | — |

---

## 4. Detalle por sección

### 4.1 Backend — turnos existentes elegibles

`crearOferta(listaEsperaId, input)` :

- Input: `{ turnoId?: string, fechaHora?: string }` (exactamente uno).
- Si `turnoId`:
  - Turno debe existir (no borrado), ser futuro (`fechaHora > now`), y `medicoId` igual al
    `medicoId` de lazos inscripción.
  - Estado permitido: `pendiente`, `confirmada`, `cancelada`.
  - No debe existir oferta pendiente activa para ese turno.
- Si `fechaHora`:
  - Valida que la franja esté libre (via `proximasFranjasLibres` o chequeo directo).
  - Crea el turno (estado `pendiente`, `tipoConsulta: 'consulta'`), asignando el paciente que el admin
    eligió (el concepto del modal). No previene la creación.
- Calcula expiración `+15 min`, inserta oferta, retorna la fila.

### 4.2 Backend — franjas libres

`proximasFranjasLibres(medicoId, opt: { dias?: number, limite?: number })`:

- Adaptación de `slotsDisponibles()` de `lib/services/portal-booking.ts` **sin `servicioId`**:
  - Usa `medicos.duracionTurnoMinutos` (o 30 min) como duración del slot.
  - Respeta `horariosAtencion` (incl. tipo partido), `bloqueosAgenda` y turnos existentes
    (excluye canceladas/no_asistio).
- Recorre los próximos `dias` (default 7) hábiles y devuelve las primeras `limite` (default 8)
  franjas libres, ordenadas por fecha ascendente. Solo franjas futuras (ignora horario ya pasado hoy).
- Formato: `{ fechaHora: ISO, fecha, hora, duracionMinutos }`.

### 4.3 Backend — aceptar (validaciones reforzadas)

`aceptar(ofertaId)`:

- Chequea que la oferta esté `pendiente` y no expirada.
- Chequea que el turno no tenga otra oferta pendiente activa (evita doble asignación).
- Actualiza `turnos.pacienteId = inscripcion.pacienteId`, `turnos.estado = 'pendiente'`, `updatedAt`.
- Marca oferta `aceptada` + `respondedAt`.
- Cambia `listaEspera.estado = 'cumplida'`.
- Retorna `{ oferta, turno }` (incluye datos para notificación).

### 4.4 Endurecimiento — límites

- Un paciente de lista de espera puede tener **como máximo 1 oferta `pendiente`** a la vez.
  `crearOferta` lo valida y rechaza con mensaje claro ("Ya existe un turno ofrecido pendiente para
  este paciente").
- Con el paciente que rechazó: `ejecutarPipeline` puede reofrecer el mismo turno a otro candidato
  (comportamiento actual inalterado).

### 4.5 API nuevas/URI

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| GET | `/api/waitlist/turnos-disponibles?medicoId=..&sucursalId=..` | — | `[{id,fechaHora,fecha,hora,estado,pacienteNombre,medicoId}]` |
| GET | `/api/waitlist/franjas?medicoId=..&dias=7&limite=15` | — | `[{fechaHora,fecha,hora,duracionMinutos}]` |
| POST | `/api/waitlist/[id]/oferta` | `{turnoId}` **o** `{fechaHora, pacienteId, medicoId}` | oferta creada |

Ambas GET con `apiHandler` + `requireAuth()`, validación zod, y flujo auth existente (medicoId
scoping si aplica en tenant).

### 4.6 UI — Modal "Asignar turno" (lista-espera-client.tsx)

- El diálogo actual se refactoriza a un **Dialog de 2 pestañas** (Tabs/Toggle):
  - **"Turno existente"**: `PacienteSearchCombobox`? no — lista de turnos emitidos del médico
    (GET `turnos-disponibles`, muestra fecha/hora/paciente actual/estado, ordenados ascendente).
    Botón por turno: **"Ofrecer"**.
  - **"Franja libre"**: lista de franjas libres (GET `franjas`, muestra fecha + hora + duración).
    Botón por franja: **"Ofrecer en este horario"**.
- En ambas pestañas, un **selector de pacientes en espera** del mismo médico (combobox con búsqueda
  por nombre) — el admin elige qué paciente recibe la oferta, no solo el de la fila.
- Confirma: deselección de paciente → POST oferta → cerrar modal → recargar lista + ofertas.
- Preview del destino (turno elegido o franja + paciente) antes de confirmar.
- Solo se muestra para estados `activa`.

### 4.7 Textos visibles renombre "turno ofrecido"

Reemplazos en `lista-espera-client.tsx`:

| Actual | Nuevo |
|---|---|
| "Ofertas" | "Turnos ofrecidos" |
| "Crear un oferta" | "Ofrecer turno" |
| "sin oferta activa" | "Sin turno ofrecido" |
| Badge "pendiente" | "Pendiente de confirmación" (o "Pendiente") |
| Empty state "cuando un turno se cancele... oferta vía WhatsApp" | "Cuando un turno se libere, se le ofrecere un turno disponible por WhatsApp" |

En `ayuda-content.ts` (sección lista de espera): refraseos "turno ofrecido".

### 4.8 WhatsApp — mensajes

`whatsapp-waitlist.ts`:

- `notificarOfertaTurno(...)`: nuevo texto conplaceholder de fecha/hora/médico:
  `🎯 *Te ofrecemos un turno*\n\nDr. {médico}\n📅 {fecha} ⏰ {hora}\n\nRespondé *
  ACEPTAR* para aceptar o *RECHAZAR*.\nSi no respondes en {N} minutos, se lo ofrecemos a otro
  paciente.`
- `notificarConfirmacionReasignacion`: "✅ *Turno confirmado* — {fecha/hora}".
- `notificarMedicoReasignacion`: texto nuevo "🔄 Un turno fue ofrecido/reasignado..." (matching flow).
- `handleWaitlistResponse`: inicio detecta ACEPTAR/OK/SI/CONFIRMAR y RECHAZAR/NO; texto "no
  encontré turno" → "No encontré un turno ofrecido pendiente para vos"; expirada → "ese turno
  ofrecido ya expiró".
- Flujo ACEPTAR/RECHAZAR + comodines IDENTICO al actual (no rompe nada).

### 4.9 Notificación al paciente desplazado

- Cuando se ofrece un turno existente que tenía otro paciente confirmado, al **aceptar** (flujo
  manual) se notifica al paciente original:
  `⚠️ Tu turno con {médico} el {fecha} fue reassignado a otro paciente. Si necesitás otro
  horario, agendamos en la lista de espera o portal.` (voa `notificarPacienteReasignado`).
- Dispone el turno queda para el nuevo paciente. Solo aplica al flujo manual con paciente distinto.

### 4.10 Testing

Unit tests (`dashboard/lib/__tests__/`):

1. `waitlist-franjas.test.ts` — franjas libres: sin turnos → franjas completas; con turno ocupa
   bloquea slot; bloqueos de agenda; horario partido; límites default 7 días/15 franjas; no lista
   horarios ya pasados hoy.
2. `waitlist-crear-oferta.test.ts` — crearOferta con `turnoId` en estados pendiente/confirmada/
   cancelada OK; con fechaAhora libre → crea turno nuevo `pendiente`; duplicado pendiente rechazado;
   turno pasado rechazado; medico diferente rechazado; límite de 1 oferta pendiente/paciente.
3. `waitlist-aceptar.test.ts` — aceptar oferta libre OK; turno con otra oferta pendiente → error; ya
   expirada → error.
4. `whatsapp-waitlist-texts.test.ts` — textos "turno ofrecido" presentes; ACEPTAR/RECHAZAR intacto.

No migraciones DB necesarias (schema existente `ofertasTurno`/`listaEspera` sirve; se agregar
campos en turnos si hace falta `fuente='waitlist_manual'` — a evaluar).

---

## 5. Fuera de alcance

- Portal del paciente (no cambia).
- Cambios de schema DB (ofertasTurno/listaEspera sin alterar) — salvo el detalle `fuente` si se
  decide.
- Cambios en n8n (mantiene flujos existentes).
- Renombro de servicios/columnas backend "oferta"→"turno_ofrecido" (solo capa de presentación).

---

## 6. Criterios de aceptación

1. En la lista de espera, el modal "Asignar turno" ofrece turnos **futuros en cualquier estado** y
   **franjas libres** para crear turno nuevo.
2. El admin puede elegir **qué paciente en espera** recibe el ofertado (no solo el de la fila).
3. La terminología visible es **"turno ofrecido"** (dashboard + WhatsApp), sin romper APIs.
4. `tsc --noEmit` exit 0, tests new pass, build OK.
5. No regresión en flujos existentes (cancelación → pipeline automático, ACEPTAR/RECHAZAR).