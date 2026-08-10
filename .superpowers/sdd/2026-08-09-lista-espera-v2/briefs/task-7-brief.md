# Task 7: UI — Modal "Asignar turno" 2 pestañas + selector de paciente en espera

## Files
- **Modify:** `dashboard/app/dashboard/lista-espera/lista-espera-client.tsx` (reescribir la Dialog de "Asignar turno", actualmente alrededor de las líneas 443-508; verifica re-leyendo el archivo antes de editar)

> NOTA: Task 6 renombró los textos visibles. El modal actual tiene DialogTitle 'Asignar turno (turno ofrecido)', botón 'Ofrecer turno', botón toggle 'Turnos ofrecidos'. Mantén esa nomenclatura. NO toques `changelog-data.ts` ni `planes.ts`.

## Architecture (consumió Tasks 1-5, ya en el backend)
- GET `/api/waitlist/turnos-disponibles?medicoId=<uuid>` → `{data:[{id, fechaHora, fecha, hora, estado, pacienteNombre, medicoId}]}` (advanced: turnos futuros del médico, estados pendiente/confirmada/cancelada).
- GET `/api/waitlist/franjas?medicoId=<uuid>&dias=7&limite=15` → `{data:[{fechaHora: ISO string, fecha, hora, duracionMinutos}]}`.
- POST `/api/waitlist/[id]/oferta` body `{tipo:'turno', turnoId}` O `{tipo:'franja', fechaHora: ISO, pacienteId, medicoId}` → `created(oferta)`.

## Design requerido

En el `Dialog` de cada item de la lista (SOLO si `item.estado === 'activa'`), reemplazar la lista actual de turnos por un `Tabs` Radix con 2 pestañas:

1. **"Turno existente"** — GET `/api/waitlist/turnos-disponibles?medicoId=${item.medicoId}` → lista ascendente de botones con `t.fecha · t.hora · t.pacienteNombre · estado`. Cada uno tiene botón **"Ofrecer"**.
2. **"Franja libre"** — GET `/api/waitlist/franjas?medicoId=${item.medicoId}&dias=7&limite=15` → lista de botones con `f.fecha · f.hora · (duración: f.duracionMinutos min)` . Cada uno tiene botón **"Ofrecer en este horario"**.

**Selector de paciente en espera**: encima de las pestañas, un `Select`/Combobox con los pacientes en espera del MISMO médico. Los `items` de la vista ya contienen todos los pacientes esperando (filtra `items.filter(i => i.medicoId === turnoDialogFor.medicoId && i.estado === 'activa')`). Mostrar `pacienteNombre pacienteApellido`. Valor por defecto = id del item de la fila actual.

**Preview del destino**: tras seleccionar tabla+paciente y marcar un turno/franja, mostrar antes de confirmar un preview (pequeño bloque) con el destino: para turno existente → `Turno de {pacienteActual} · {fecha} {hora} · {estado}`; para franja → `Franja {fecha} {hora} ({duracionMinutos} min)`.

**POST**:
- turno existente: `body { tipo:'turno', turnoId }`
- franja: `body { tipo:'franja', fechaHora: <ISO string del slot>, pacienteId: <paciente seleccionado>, medicoId: turnoDialogFor.medicoId }`

**handler**: reescribir `handleAsignarTurno` → `handleOfrecerTurno(destino: {tipo, turnoId?} | {tipo, fechaHora, ...})` manteniendo `setAsignando`; toast success `'Turno ofrecido y notificado por WhatsApp'`; si `json.error` → toast error con ese mensaje; al éxito cerrar dialog + `handleRefresh()`.

**Estados de carga**: cada pestaña con su loading independiente (`loadingTurnosDisponibles`, `loadingFranjas`), `cache` en estado (una sola fetch por apertura del dialog; por ejemplo cargar ambas al abrir, o lazy por tab con memo del resultado). No hacer fetch en cada render.

**Identificadores internos**: NO renombres `ofertasAbiertas`/`ofertasPorItem`/`cargarOfertas`/`formatOfertaFecha`/`estadoOfertaBadge` ni las rutas — solo lo necesario para el modal nuevo.

## Pasos
1. Lee el archivo completo (595 líneas) y ubica el Dialog actual y los handlers (`handleAsignarTurno`, `cargarTurnosCancelados`, estado `turnosCancelados`/`turnoSeleccionadoId`).
2. Localiza el componente de Select/Combobox existente (pista: `PacienteSearchCombobox` o `Select` de shadcn en `components/`).
3. Implementa según Design (Tabs Radix + Select paciente + preview + 2 botones POST + handleOfrecerTurno + caching por apertura).
4. Verificación:
   - `cd dashboard && npx tsc --noEmit` → exit 0.
   - `cd dashboard && npx eslint app/dashboard/lista-espera/lista-espera-client.tsx` → 0 errores NUEVOS (hay 2 PREEXISTENTES en línea 10 y 148; si comitear, usar `--no-verify` documentando el precedente, como las tasks anteriores).
   - `cd dashboard && npx vitest run lib/services/__tests__/waitlist-turnos-disponibles.test.ts lib/services/__tests__/waitlist-crear-oferta.test.ts lib/services/__tests__/waitlist-franjas.test.ts lib/__tests__/whatsapp-waitlist-response.test.ts lib/__tests__/whatsapp-waitlist-texts.test.ts` → todo verde (no hay tests de UI para este modal; el gate es compilación + lint + no-regresión).
5. Commit:
```bash
git add dashboard/app/dashboard/lista-espera/lista-espera-client.tsx
git commit -m "feat(waitlist): modal asignar turno con 2 pestañas y selector de paciente en espera"
```
(incluye el archivo y, si lo creaste, el nuevo componente de select)

## Global Constraints (recordatorio)
- Sin migraciones de DB.
- Renombrado ya aplicado en textos visibles — mantén "turno ofrecido"/"Turnos ofrecidos"/"Ofrecer turno".
- Español neutro chileno (preferir "usted"/neutro; evita voseo nuevo — el voseo preexistente 'Agregá pacientes'/'Elegí un turno' queda fuera de alcance, no lo empeores).
- ESLint `import/order`, Prettier single quotes + trailing commas + printWidth 100. JSDoc en funciones públicas nuevas.
- Toasts: success exacto `'Turno ofrecido y notificado por WhatsApp'`.

## Report
Escribe el report en `D:\OPENCODE\consultorio-medico\.superpowers\sdd\2026-08-09-lista-espera-v2\reports\task-7-report.md` con: Status, commits, test summary (comandos + salida), concerns.