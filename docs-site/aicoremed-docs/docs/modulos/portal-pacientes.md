# Módulo Portal Paciente

## Arquitectura

```
Route Groups
├── (public)/                   → Sin autenticación
│   ├── page.tsx                → Landing + magic link request
│   └── verify/page.tsx         → Verificación de token
└── (auth)/                     → Requiere portal_session cookie
    ├── layout.tsx              → Auth + feature gate + nav
    ├── dashboard/              → Inicio (stats, turnos próximos, encuestas)
    ├── agendar/                → Booking Wizard (5 pasos)
    ├── turnos/                 → Mis turnos (cancelar, reagendar)
    ├── recetas/                → Mis recetas (PDF)
    ├── mensajes/               → Chat con el consultorio
    ├── historial/              → Historial médico
    ├── perfil/                 → Editar datos personales
    ├── notificaciones/         → Centro de notificaciones
    ├── encuestas/              → Encuestas post-consulta
    ├── certificados/           → Certificados médicos
    ├── consentimientos/        → Consentimientos informados
    ├── paquetes/               → Suscripciones (MercadoPago)
    └── ordenes-estudio/        → Órdenes de estudio

API (app/api/portal/)
  ├── auth/                     → request, verify, status, test (bypass)
  ├── me/                       → Perfil del paciente
  ├── turnos/                   → CRUD + ICS
  ├── medicos/                  → Lista + slots disponibles
  ├── recetas/                  → Lista + PDF
  ├── chat/                     → Conversación + mensajes
  ├── perfil/                   → Actualizar datos
  ├── pagos/                    → MercadoPago preferences
  ├── paquetes/                 → Suscripciones
  ├── notificaciones/           → Lista + marcar leídas
  ├── encuestas/                → Responder + historial
  ├── certificados/             → Lista + PDF
  ├── consentimientos/          → Firmar digitalmente
  └── push/                     → PWA subscription

Components (components/portal/)
  ├── booking-wizard.tsx        → 5-step wizard (médico → slot → confirmar → pago → completado)
  ├── slot-picker.tsx           → Calendario semanal con slots mañana/tarde
  ├── doctor-card.tsx           → Card con avatar, especialidad, servicios, precios
  ├── portal-card.tsx           → Glass card con hover
  ├── portal-button.tsx         → Variantes gradient/ghost
  ├── portal-badge.tsx          → Badge con animación pop
  ├── portal-skeleton.tsx       → Skeleton con shimmer
  └── theme-toggle.tsx          → Dark/light toggle
```

## Autenticación — Magic Link

```
1. Paciente ingresa teléfono
2. POST /api/portal/auth/request
   → Rate limit: 3 requests/10min (DB rate_limits)
   → Chequea blacklist
   → Genera crypto.randomBytes(32) hex token
   → Almacena en pacientes.portalToken (expira 10 min)
   → Envía WhatsApp: "🔐 Portal del Paciente - {enlace}"
3. Paciente hace clic
4. GET /api/portal/auth/verify?token=xxx
   → IP rate limit: 10/15min
   → Verifica token + expiry
   → Invalida token (one-time use)
   → Firma JWT HS256 con jose
   → Setea cookie portal_session (httpOnly, secure, sameSite=lax, maxAge=24h)
   → Redirect a /portal/dashboard
```

### JWT Session

| Propiedad | Valor |
|-----------|-------|
| Claims | `{ pacienteId, nombre, apellido, telefono, esPrueba? }` |
| Algoritmo | HS256 |
| Secret | `AUTH_SECRET` env var |
| Expiry | 24h |
| Cookie | `portal_session` (httpOnly) |

### Dev Bypass
- `PORTAL_BYPASS=true` o `NODE_ENV !== 'production'`
- Landing muestra selector de pacientes + "Ingresar como..."
- `POST /api/portal/auth/test` crea sesión sin WhatsApp (marca `esPrueba: true`)

## Booking Wizard (5 pasos)

1. **Médico**: DoctorCard con avatar, especialidad, matrícula, servicios + precios
2. **Slot**: Calendario semanal, slots mañana/tarde con precio
3. **Confirmar**: Resumen + motivo predefinido (Control/Dolor/Consulta)
4. **Pago**: MercadoPago en nueva pestaña, polling cada 5s (max 2.5 min), opción "pagar después"
5. **Completado**: Animación + volver al inicio

### Reglas de agendamiento
- Mínimo 1h antes, máximo 30 días
- Máximo 3 turnos pendientes/confirmados simultáneos
- No duplicados: mismo paciente + mismo médico ±2h
- Reagendar: cancela turno anterior con motivo "Reagendado por el paciente"
- Confirmación WhatsApp con archivo .ics

## Cancelación

- Solo estado `cancelada`
- Política de reembolso configurable:
  - +24h antes: 100% reembolso
  - +4h antes: 50% reembolso
  - -4h o después: sin reembolso
- Reembolso via API MercadoPago `/v1/payments/{id}/refunds`

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| portal-paciente | Premium |

- `checkPortalFeatureAccess()`: paciente → sucursalId → tenantId → usuario → plan
- Test sessions (`esPrueba`) bypassan el gate
- Sin acceso → redirect a `/portal?sin-acceso=1`

## Diseño

- Sistema de diseño propio scoped bajo `.portal-layout`
- Paleta teal (`168 72% 38%`), violeta accent (`262 50% 52%`)
- Glassmorphism, sombras cálidas, animaciones spring
- PortalNav: bottom bar con 4 items principales + sheet "Más"
- Page transitions: framer-motion AnimatePresence popLayout
- Dark mode completo
- PWA: push notifications toggle

## Seguridad

| Medida | Implementación |
|--------|---------------|
| Session JWT | HS256, AUTH_SECRET, httpOnly |
| One-time token | Invalidado tras uso |
| Token expiry | 10 min magic link, 24h session |
| Rate limiting | 3/10min por teléfono (DB), 10/15min por IP |
| Blacklist | Pacientes bloqueados no reciben magic links |
| CSRF | Validación origin en POST/PATCH |
| Open redirect | Solo URLs relativas /portal/* |
| Feature gate | Premium plan + bypass test |
| Data scoping | Todas las queries filtradas por pacienteId del JWT |
