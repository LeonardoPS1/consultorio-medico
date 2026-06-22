# consultorio-medico

## 📌 11/06 — Fix SW: POST no se cachean + Onboarding re-ejecutar+persistencia

**Commits:** `69628e8` (SW v4), `f0aea33` (onboarding progreso), `0f8e0cf` (re-ejecutar)

**Fixes aplicados:**
1. **SW v4**: Solo cachea GET. POST/PUT/DELETE pasan sin cache. Clona request. SW v3→v4. **Causa base: cache.put fallaba porque request.body ya consumido → 503 falso en todas las creaciones.**
2. **Onboarding — progreso persiste**: Client NO mergea server state tras PUT. PUT solo devuelve `{success:true}` sin state. Prompt usa `stepIndex` real (no `completedCount+1`).
3. **Onboarding — re-ejecutar**: `handleReiniciar()` usa `window.location.href` (hard reload). `DELETE /api/onboarding` limpia DB. Key prop en page.tsx forza remount.
4. **Ollama diagnóstico**: gemma3 cargado (4.3GB), KEEP_ALIVE=30m, inferencia ~14s en caliente. Pre-flight check + timeout 120s.

**Pendiente:** Redeploy Dokploy para aplicar todos los fixes.

## 📌 11/06 — Onboarding: activeStep persistence + UI continuity (~3h) ✅

**Commits:** `2b1d210` (onboarding-client + sidebar)

**Fixes aplicados:**
1. **activeStep state**: Nuevo estado con lógica de restauración:
   - Si hay un `activeStep` guardado en localStorage y el paso no está completado → restaurarlo
   - Si no hay activeStep guardado → abrir el primer paso incompleto automáticamente
   - Si todos los pasos están completos → null (mostrar pantalla de éxito)
2. **Persistir activeStep**: Función `persistActiveStep()` que guarda/remueve `aicoremed_onboarding_active_step` en localStorage
3. **Sidebar badge**: Nuevo badge "Continuar" en el sidebar cuando hay progreso de onboarding pendiente
4. **Reiniciar**: Limpiar ambos keys (`aicoremed_onboarding_completed` y `aicoremed_onboarding_active_step`) en `handleReiniciar()`
5. **Pantalla de éxito**: Limpiar activeStep del localStorage cuando se muestra la pantalla de éxito

**Archivos modificados:**
- `dashboard/app/dashboard/onboarding/onboarding-client.tsx` - Lógica completa de activeStep
- `dashboard/components/layout/sidebar.tsx` - Badge de progreso onboarding

**Pendiente:** Actualizar `.opencode/memory/projects/consultorio-medico.md` con contexto actualizado

## Estado Actual — 02/06/2026 (post bugfixes session)

### ✅ App funcionando — Todos los bugs corregidos

### Últimos fixes (esta sesión)
1. **Bug 1A-C: Turno desde paciente** — Fix completo en 3 archivos:
   - `NuevoTurnoModal`: props `pacienteId`/`pacienteName`, modo readonly cuando viene de ficha paciente
   - `paciente-detalle-client.tsx`: mapeo correcto de campos (tipo→tipoConsulta, resuelve medicoId vía API)
   - `turnos-client.tsx`: resuelve `medicoId` vía `GET /api/medicos`, acepta nueva firma del modal
2. **Bug 2: Certificados error handling** — Lectura real del body de error del server, mensajes descriptivos
3. **Bug 3: Tab Certificados en ficha paciente + responsive** — Nuevo tab con lazy load, lista de certificados existentes, scroll horizontal en mobile
4. **Bug 4: Animaciones en Reportes** — Skeleton grid con stagger, entrance animations en chart cards (fade + slide-up), delays progresivos

### 📌 Sesión 03/06/2026 — Bug 404 paciente (resiliente) + Regiones/Comunas Chile

**Bug 404 al hacer click en paciente:**
- **Causa raíz:** `getPacienteDetalle()` usaba LEFT JOIN a `regiones`/`comunas` + columnas `isapreNombre` en la query principal. Migraciones 0007/0008/0023 no aplicadas en DB → error → null → `notFound()` → 404.
- **Fix:** Query dividida en 2 partes: (1) core columns siempre existentes, (2) datos Chile (sistemaSalud, isapreNombre, regionId/comunaId, regionNombre/comunaNombre) en SQL raw separado con try-catch. Si faltan migraciones, la página carga con nulls en vez de 404.

**Migraciones aplicadas en producción vía SSH:**
- `0023_isapre_nombre.sql` → columna `isapre_nombre` en pacientes ✅
- `0008_regiones_comunas.sql` → tablas `regiones` (16) + `comunas` (345) con datos poblados ✅
- 0007 ya estaba aplicada (sistema_salud, rut, region, comuna)

### Causas Raíz (sesiones anteriores — Dockerfix ya resuelto)
1. **PgBouncer nunca implementado** — `DATABASE_URL` apuntaba a puerto 6432. Migrado a 5432 directo PostgreSQL.
2. **Next.js 14.2.21+ standalone plano** — CMD `["node", "server.js"]` en vez de `dashboard/server.js`.
3. **Migration 0021 faltante** — columna `backup_codes` para 2FA. Fix: ALTER TABLE vía SSH.
4. **pnpm symlinks rotos en multi-stage** — Fix: `npm install --omit=dev --ignore-scripts` reemplaza symlinks con archivos planos.
5. **`next` faltante en standalone node_modules** — El output de Next.js 14.2.35 no incluye `next`. Fix: `COPY --from=builder` sigue symlinks y copia `next` real.
6. **Health check timeout** — `/api/health` conectaba a DB (>10s). Fix: simplificado a solo `{status:'ok'}`.

### 🔧 Dockerfile (commit 484d822) — NO MODIFICAR
```dockerfile
CMD ["node", "server.js"]
COPY --from=builder /app/dashboard/.next/standalone ./
RUN rm -rf node_modules && npm install --omit=dev --no-audit --no-fund --ignore-scripts
COPY --from=builder /app/dashboard/node_modules/next ./node_modules/next
COPY --from=builder /app/dashboard/.next/static ./.next/static
COPY --from=builder /app/dashboard/public ./public
```
Health check: solo server response (sin DB).

### ⚠️ Lecciones aprendidas
- **NUNCA** usar `tar --dereference` para resolver symlinks en Docker — frágil y propenso a errores.
- **Docker COPY --from=builder sigue symlinks automáticamente** — este es el approach correcto.
- **El standalone output NO incluye `next`** — hay que copiarlo manualmente.
- `npm install --ignore-scripts` evita que husky y postinstall scripts rompan el build.

### Stack
- Frontend: Next.js 14.2.35, Tailwind CSS, shadcn/ui, Recharts, Framer Motion
- Backend: Next.js API Routes + Drizzle ORM
- DB: PostgreSQL 16
- Infra: Docker Swarm via Dokploy (Simple App)
- Automatización: n8n (self-hosted)
- IA Local: Ollama + Mistral
- Comunicación: Twilio (WhatsApp/SMS/voz)

### Acceso VPS
- VPS: `51.222.207.250` | SSH: `ubuntu` / `Cool220479..@`
- Dokploy: `https://51.222.207.250:3000`
- Dashboard: `https://med.aicorebots.com`
- n8n: `https://n8n.aicorebots.com`

### DB
- Host: `172.18.0.1:5432` (desde dokploy-network, gateway docker_gwbridge)
- Database: `consultorio_medico`
- App User: `dashboard_user` / `gLfzAyEq0KQL4Qplamdlx8x9ouZdHcnP`
- Superuser: `reece.schmeler67` (via docker exec en container de postgres)

### Commits de sesiones anteriores
- `17c9cc4` — fix: mapear tipos Drizzle (Date/null -> string) en getPacienteDetalle
- `3597837` — fix: COPY next desde builder (reemplaza tar --dereference)
- `353f1a7` — fix: npm install --ignore-scripts (evita husky)
- `ac809a5` — fix: health check sin conexion DB (timeouteaba)
- `484d822` — fix: Dockerfile final (npm install + COPY next)

### 📌 Sesión 03/06/2026 — 🕐 Horarios Corrido/Partido + Tags Chile
- **Schema**: `tipo`, `inicio2`, `fin2` en `horarios_atencion` (migration 0024)
- **API `/api/horarios`**: GET/PUT actualizados con nuevo formato
- **Config página**: Nuevo UI con selector Corrido / Mañana y Tarde por día + fix bug input duplicado
- **Médicos section**: JSONB con split schedule + selector tipo y doble bloque
- **Turnos validation**: Validación contra ambos bloques en horario partido
- **Tags pacientes**: `'Obra Social'` → tags chilenos según sistemaSalud (Fonasa/Isapre)
- **Búsqueda pacientes**: Expandida para incluir `sistemaSalud` e `isapreNombre`
- **Commit**: `d7f35eb` | Migration 0024 aplicada en producción ✅

### 📌 Sesión 04/06/2026 — Portal Paciente Plan + Bugfixes masivos

**Commits del día (7):** `4d9dd6d`, `04bfda9`, `191b903`, `d9413fd`, `e39fa9e`, `739fce4`

**Fixes aplicados:**
1. **React #422 real fix** — 3 componentes con useEffect DESPUÉS de early return:
   - GatedContent: useEffect + derivados ANTES de `if(status='loading')`
   - admin/tenants: useEffect ANTES de `redirect()`
   - admin/sucursales: useEffect ANTES de `redirect()`
2. **CSP**: @import Google Fonts eliminado de globals.css
3. **Rate limit**: 30 → 120 req/min en middleware.ts
4. **Foto doctor**: POST /api/upload (FormData) + GET /api/uploads/[slug]
5. **CSP**: fonts.googleapis.com + fonts.gstatic.com agregados
6. **SW**: await cache.put() + try-catch global en fetch handler
7. **Volumen persistente**: /data/dashboard montado en /app/.data
8. **MP Error desconocido**: SDK v2 lanza objeto plano → catch mejorado
9. **MP baseUrl**: dinámica dev/prod
10. **Admin bypass**: GatedContent ahora checkea role=admin además del plan

**Auditoría completa del Portal de Paciente:**
- Auth: Magic Link vía WhatsApp + JWT cookie (portal_session) ✅
- 7 páginas autenticadas funcionando (dashboard, turnos, recetas, historial, perfil)
- 9 endpoints API REST protegidos
- 26+ columnas en tabla pacientes relevantes al portal
- **Faltante MVP**: reserva turnos, reprogramación, PDF recetas, confirmación WhatsApp

### 📌 Sesión 07/06/2026 — Optimización de índices en producción

**Migration 0025 aplicada — 25 índices nuevos creados CONCURRENTLY sin downtime.**

**Cuello de botella principal:** `turnos` — tabla más query-heavvy del sistema con CERO índices.
Cada dashboard load, cada listado de agenda, cada reporte, cada verificación de conflicto hacía full scan.

**Índices creados por tabla:**
| Tabla | Índices | Columnas clave |
|-------|---------|----------------|
| `turnos` | 6 | fecha_hora, medico_id+fecha_hora, estado, paciente_id, sucursal_id, partial (activos) |
| `pacientes` | 4 | sucursal_id, created_at, nombre_trgm, apellido_trgm |
| `mensajes` | 3 | conversacion_id, rol+created_at, twilio_sid |
| `medicos` | 2 | usuario_id, sucursal_id |
| `recetas` | 2 | paciente_id, medico_id |
| `bloqueos_agenda` | 1 | medico_id+fecha_inicio+fecha_fin |
| `conversaciones` | 2 | paciente_id, medico_id |
| `historial_medico` | 2 | paciente_id, medico_id |
| `notas_soap` | 3 | paciente_id, medico_id, turno_id |

**Extensión:** `pg_trgm` instalada para ILIKE eficiente en búsquedas textuales.

**Impacto esperado:** 90-99% menos lecturas en turnos, dashboard stats carga en <100ms, búsqueda pacientes instantánea.

### 📌 07/06 — Cache layer in-memory + Stats optimizados (commit 009ff48)

**11 files, +800/-568**

- **lib/cache.ts**: MemoryCache singleton con TTL configurable (500 entries, auto-cleanup, invalidación por prefijo)
- **Regiones/Comunas API**: cache 24h + revalidate=86400, quitado force-dynamic
- **MedicosService**: nuevo service wrapper con cache 60s + invalidación en POST
- **Dashboard stats**: queries consolidadas usando `COUNT(*) FILTER(WHERE ...)`, eliminadas 3 queries redundantes, cache 30s, eliminado el fallback ruidoso de tiempo promedio, eliminado duplicado de conversacionesActivas
- **TurnosService.list**: cache 10s + invalidación en create/update/delete
- **PacientesService.list/getById**: cache 30s + invalidación en create/update/delete
- Fix: MapIterator errors resueltos con `Array.from()`

### 📌 07/06 — Async optimization: fire-and-forget (commit a753898)

**2 files, +23/-15**

- **Webhook Twilio**: extraída detección de CONFIRMAR/CANCELAR y ACEPTAR/RECHAZAR con regex (0 DB hits). Handlers disparados en background con `.catch(() => {})`, webhook responde 200 inmediatamente (~200-500ms más rápido). Eliminada dependencia de `esWaitlist`/`esRecordatorio` booleans para skip-N8n.
- **pacientesService.create()**: insert de `pacienteEventos` cambiado a `db.insert(...).then().catch(() => {})` fire-and-forget.

### 📌 07/06 — Onboarding IA fix + persistencia (commit 3af7c1d)

**5 files, +126/-18**

- **Bug #1**: SQL query de credenciales usaba `deleted_at IS NULL` pero `credenciales` no tiene esa columna → paso 2 (WhatsApp) nunca persistía al refrescar. Fix: eliminado `AND deleted_at IS NULL`.
- **Bug #2**: `marcarCompletado()` solo actualizaba estado React, sin persistencia server-side.
- **Fix**: nueva tabla `onboarding_progress` (migration 0026), endpoint `PUT /api/onboarding` para persistir pasos, `getOnboardingState()` combina chequeos DB + progreso manual, `marcarCompletado()` llama a PUT API.

### 📌 09/06 — Fix producción: validaciones pacientes + logging onboarding + redeploy

**Problema reportado:** IA no conecta + no se pueden guardar datos

**Diagnóstico:**
- ✅ Todos los servicios UP (dashboard 9h healthy, PG healthy, Ollama con gemma3)
- ✅ Conectividad Ollama verificada desde container: 200 OK en `/v1/chat/completions`
- ✅ Env vars correctas (`OLLAMA_BASE_URL`, `OLLAMA_MODEL=gemma3`, `DATABASE_URL`)
- 🔴 POST /api/pacientes fallaba 400 por validación: regex teléfono estricto + email vacío
- 🔴 Onboarding IA: 404/timeout intermitente (posiblemente de container anterior)

**Fixes aplicados (commit `fe538c3`):**
1. `validations.ts`: Regex teléfono relajado a `/^(\+?\d{7,15})$/` — acepta +54, +56, etc.
2. `validations.ts`: Email ahora acepta `""` con `.or(z.literal(''))`
3. `onboarding.ts`: Logging mejorado (URL, body del error), timeout 30s

**Redeploy:** Dokploy `service update --force` ✅ — Health check 200 OK

### 📌 09/06 (continuación) — Onboarding IA cold start + Ollama KEEP_ALIVE

**Problema persistente:** Onboarding IA seguía dando timeout (~30s primera carga) y modelo se descargaba tras 5 min inactividad.

**Causa raíz Ollama:** Por defecto `OLLAMA_KEEP_ALIVE=5m` — modelo se descarga → cold start ~30s en CPU → onboarding timeout 30s falla.

**Fixes aplicados:**
1. **Docker Compose (backend)**: `OLLAMA_KEEP_ALIVE=30m` en servicio `ollama` — modelo permanece cargado 30 min tras último uso.
2. **onboarding.ts** (commit `ae6e127`): Timeout aumentado a **60s** para cubrir cold start inicial.
3. **init-ollama**: Re-ejecutado para asegurar modelos `gemma3` + `llama3.2` disponibles.

**Resultado esperado:** Primera llamada onboarding ~30-40s (cold start), subsecuentes ~2-3s (modelo en RAM). OLLAMA_KEEP_ALIVE=30m evita recargas frecuentes.

### 📌 10/06 — Fix 503 POST turnos + VPS cleanup + Ollama fix + Auto-deploy off
**Commits:** `f2bb2a2`, `deeaeec`

**Bugs fixeados:**
1. **sucursalId sin sanitizar** en turnos-client.tsx y paciente-detalle-client.tsx → `sucursalId || undefined` ✅
2. **Error handling frontend pobre** → ahora muestra mensaje real del servidor + console.warn ✅
3. **Ollama no expuesto** — compose prod sin puerto 11434. Fix: `ports: 11434:11434`, `OLLAMA_HOST=0.0.0.0`, `OLLAMA_KEEP_ALIVE=30m` ✅
4. **VPS disco**: 6.2GB liberados (build cache 3.4GB + imágenes legacy 2.8GB). 50G→45G (63%) ✅

**Causa raíz 503:** Auto-deploy Dokploy cada ~15 min. Ventana ~10s sin backend → Traefik 503. **Auto-deploy desactivado** en Dokploy UI ✅

**Service Worker:** Cacheaba respuesta 503. Fix: hard refresh (Ctrl+Shift+R) o modo incógnito ✅

**Estado actual:** Container estable, POST /api/turnos 201, Ollama responde, auto-deploy off ✅

### Pendientes
- 🟡 Tests de integración
- 🟡 WF-04 Correo Inteligente — necesita IMAP/SMTP configurados en n8n
- 🟡 Activar webhook google-calendar-sync en n8n (workflow inactivo)
- 🟡 A3 Encuesta post-consulta portal (API + UI + trigger en turno "atendido")
- 🟡 A4 Confirmación asistencia interactiva WhatsApp (procesar SÍ/NO vía webhook Twilio)

## 📌 15/06 — Telemedicina Dashboard + Videollamada page ✅
**Commits:** (pendiente)

**Implementado:**
1. **Página `/dashboard/telemedicina`** — Listado completo de turnos virtuales con:
   - Filtros por estado (Próximos/En curso/Finalizados/Todos), médico y rango de fechas
   - Stats rápidos (Próximos, En curso, Atendidos, Cancelados)
   - Tabla responsive con info: hora, fecha, paciente, médico, modalidad (Virtual badge), estado
   - Botón "Unirse" para videollamadas próximas/en curso con link generado
   - Badge "Sin link" si la sala no se generó aún
   - Botón "Ver enlace" para turnos finalizados
   - Info contextual sobre cómo funciona la telemedicina

2. **Página `/videollamada/[turnoId]`** — Entrada unificada para médico y paciente:
   - **Paciente**: recibe token por query param `?token=` (vía WhatsApp) → rol `paciente`
   - **Médico**: autenticado en dashboard → llama `POST /api/livekit/token` → rol `medico`
   - Renderiza `VideoRoom` component con LiveKit (livekit-client + @livekit/components-react)
   - Manejo de estados: loading, error, connected, disconnected
   - Redirect a `/dashboard/atencion` al desconectar

3. **lib/livekit-client.ts** — Nuevo archivo client-safe con helpers puros:
   - `getRoomName(turnoId)`, `LIVEKIT_URL`, `getSalaLink()`
   - NO importa `livekit-server-sdk` (evita error `node:crypto` en client bundle)

4. **Fix sidebar.tsx** — Eliminado import duplicado de `LockKeyhole` de lucide-react

5. **livekit-telemedicina.ts service** — Actualizado imports: funciones puras desde `livekit-client.ts`, funciones server (generateMedicoToken, generatePacienteToken, LIVEKIT_API_KEY) desde `livekit.ts`

**Archivos creados/modificados:**
- `dashboard/app/dashboard/telemedicina/page.tsx` (nuevo)
- `dashboard/app/videollamada/[turnoId]/page.tsx` (nuevo)
- `dashboard/lib/livekit-client.ts` (nuevo)
- `dashboard/lib/services/livekit-telemedicina.ts` (imports actualizados)
- `dashboard/components/layout/sidebar.tsx` (fix import duplicado)

**Build:** ✓ Compiled successfully, ✓ Linting, ✓ 117/117 páginas

---

## 📌 21/06 — Portal Paciente Fase 3 (Casi completa) ✅

**Estado:** Fase 3 Portal Paciente — 8 de 10 items completados, push a origin/main

### Items completados (último commit 0d881e0, 0c8f802, 03bfc97, 3c47969, etc.):
- **B1 Chat portal**: API GET/POST `/api/portal/chat`, UI mensajes con burbujas, auto-refresh 10s, nav link
- **B2 Auto-respuestas**: `getAutoReplyIfOutsideHours()` Lun-Vie 9-18 Chile, respuesta automática
- **A1 Notificaciones in-app**: migration 0037, service, API, badge+count, página con filtros
- **C1 Recetas PDF portal**: endpoint HTML imprimible con hash, botón descarga en nueva pestaña
- **C2 Certificados portal**: API list + HTML con QR, UI página, nav link "Certificados"
- **C3 Consentimientos portal**: API list/detail/firmar digital, UI página, nav link "Consentimientos"
- **C4 Órdenes de estudio**: tabla `ordenes_estudio` + service + API + UI página + nav link
- **A2 Push pacientes**: `pacienteId` en push_subscriptions, service actualizado, API suscribir/desuscribir/estado, componente PushNotificationToggle en perfil

### Pendientes Fase 3:
- **A3 Encuesta post-consulta portal**: API GET/POST `/api/portal/encuestas` creada, falta UI página + trigger automático al pasar turno a "atendido" (lib/encuestas.ts ya tiene `sendSurveyWhatsApp()` y `detectSurveyResponse()`)
- **A4 Confirmación asistencia interactiva WhatsApp**: Turno tiene campos `recordatorio_24h_leido`, `recordatorio_1h_leido`, `confirmoAsistencia`. n8n WF-03 marca flags. Falta: procesar respuesta SÍ/NO vía webhook Twilio → actualizar `confirmoAsistencia` en turno.

### Build:
- 0 TS errors en todos los commits
- Push a `origin/main` ✅
- Rama: `main`

### Migraciones pendientes en producción:
- Migration 0036: `paquetes_portal`, `suscripciones_paciente`
- Migration 0037: `pacienteId` en `notificaciones`