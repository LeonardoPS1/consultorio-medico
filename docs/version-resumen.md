---
title: "Consultorio Médico — Resumen de Versiones"
subtitle: "Sistema de Gestión para Consultorios Médicos"
author: "AiCore"
date: "25 de mayo de 2026"
geometry: margin=2.5cm
toc: true
toc-depth: 2
numbersections: true
header-includes: |
  \usepackage{fancyhdr}
  \pagestyle{fancy}
  \fancyhead[L]{Consultorio Médico}
  \fancyhead[R]{\thepage}
  \fancyfoot[C]{}
  \usepackage{xcolor}
  \definecolor{verde}{HTML}{059669}
  \definecolor{celeste}{HTML}{2563eb}
  \definecolor{gris}{HTML}{6b7280}
  \definecolor{ambar}{HTML}{d97706}
  \usepackage{titlesec}
  \titleformat{\section}{\color{verde}\normalfont\Large\bfseries}{\thesection}{1em}{}
  \titleformat{\subsection}{\color{celeste}\normalfont\large\bfseries}{\thesubsection}{1em}{}
  \usepackage{hyperref}
  \hypersetup{colorlinks=true, linkcolor=celeste, urlcolor=celeste}
  \usepackage{booktabs}
  \usepackage{longtable}
---

# Introducción

Este documento resume el estado actual del sistema **Consultorio Médico**, desarrollado e implementado por **AiCore** (aicorebots.com).

El sistema integra automatización con IA, comunicación por WhatsApp, gestión de turnos/pacientes/recetas y un dashboard web completo, todo alojado en infraestructura propia.

---

# v0.1.0 — Fundación (15 de mayo de 2026)

## Estructura Inicial

- Proyecto Next.js 14.2.35 con App Router
- Base de datos: 12 tablas, 5 vistas, 30+ índices
- Integración con Ollama + Mistral (IA local)
- Integración con Twilio (WhatsApp)
- Autenticación con NextAuth + bcrypt
- Modo oscuro/claro

## Dashboard Inicial

- Login funcional
- Panel principal, pacientes, turnos, conversaciones, recetas, reportes, configuración

## Automatización

- 6 workflows n8n: WhatsApp Inbound, Turnos, Recordatorios, Correo, Resumen, Recetas
- URLs de placeholder reemplazadas por defaults funcionales

---

# v0.2.0 — Features Core (15 de mayo de 2026)

## Dashboard

- **FullCalendar**: Vista de calendario mes/día con codificación por colores
- **Modales de creación**: NuevoTurnoModal, NuevoPacienteModal, NuevaRecetaModal
- **Página de detalle de paciente**: Datos personales, historial CIE-10, recetas
- **Reportes** (4 pestañas): General, Turnos, Pacientes, WhatsApp
- **Configuración mejorada**: Integraciones, horarios, IA, plantillas WhatsApp, equipo

## Componentes UI

- Dialog (Radix UI), Textarea, Select, Calendar View
- Tablas con scroll horizontal, estados vacíos con CTA

## Data Store

- Capa dual: PostgreSQL (producción) vía Drizzle ORM + JSON (desarrollo)
- Seed data con 6 pacientes, conversaciones de ejemplo

## API Routes

- GET/POST conversaciones, mensajes
- Webhook Twilio
- Setup del sistema

---

# v0.3.0 — Seguridad y UX (17 de mayo de 2026)

## Seguridad y Autenticación

- **2FA / MFA con TOTP**: Google Authenticator, QR, backup codes
- **Rate limiting**: 5 intentos/min login, 30/min API
- **Bloqueo de cuenta**: 5 intentos fallidos → 15 min de bloqueo
- **Auto-logout por inactividad**: 30 min
- **Password validator**: 8+ chars, mayúscula, número, símbolo
- **Headers de seguridad HTTP**: X-Frame-Options, HSTS, CSP
- **Verificación de firmas Twilio**: Validación criptográfica
- **Sanitización anti-jailbreak**: Protección de prompts de IA

## Dashboard

- **Estilo visual renovado (Taste Audit)**:
  - Tarjetas con sombras suaves, bordes redondeados (`rounded-xl`)
  - Gradientes sutiles (verde salvia → esmeralda, celeste → azul)
  - Paleta coherente: verdes para acciones, celeste para navegación, ámbar para alertas
- **Gráficos Recharts**: Turnos por día, distribución por estado, intenciones WhatsApp
- **Filtro de turnos por fecha**
- **Componente StatusBadge**: Colores semánticos

## Base de Datos

- Migración 008: `auditoria_accesos` para log de operaciones sensibles
- Columnas 2FA en usuarios (`secreto_2fa`, `activo_2fa`)
- Índices de auditoría

## Build

- ✅ TypeScript 0 errores (strict mode)
- ✅ 17 rutas generadas
- ✅ First Load JS compartido: 91.2 kB

---

# v0.4.0 — Planes y Auth Completo (19 de mayo de 2026)

## Planes de Suscripción y Feature Gating

- **Sistema de planes unificado** (`lib/planes.ts`): 5 planes:
  - Free (0 USD), Starter (\$49/mes), Professional (\$99/mes)
  - Premium (\$199/mes), Enterprise (\$499/mes)
  - Precios en USD y CLP
- **Feature gating** (`lib/features.ts`): Control granular por plan en:
  - Sidebar adaptativa (items bloqueados con candado + badge)
  - Rutas protegidas (GatedContent)
  - Tabs de configuración
- **Landing page dinámica**: Precios desde `planes.ts`

## Recuperación y Cambio de Contraseña

- **Forgot Password** (`/recuperar`): Email con token de un solo uso
- **Reset Password** (`/reset-password?token=`): Formulario con validación
- **Change Password**: Desde Configuración → Perfil
- **API endpoints**: forgot-password, reset-password, change-password
- **Columnas en BD**: `reset_token`, `reset_token_expires`

## UX en Login

- Checkbox "Recordar contraseña"
- SignOut con CSRF fix (signOut + redirect manual)
- Sesión limpia post-logout

## Página de Suscripción

- Grid de planes con precios USD+CLP
- Botón de pago MercadoPago

---

# v0.5.0 — Multi-Sucursal + Historial + Admin (23 de mayo de 2026)

## Historial Médico CRUD

- Página de historial médico por paciente con códigos CIE-10
- CRUD completo: diagnóstico, tratamiento, observaciones

## Ajustes y Configuración

- **Admin/Sistema**: Feature toggles, IA, Integraciones, Credenciales, API Keys
- **Portal Chile**: Rut, regiones, comunas, sistema de salud
- **Multi-tenant F1**: tenantId presente en 22 tablas del schema

## Responsive

- Sidebar colapsable en mobile
- Tablas con scroll horizontal
- Grillas adaptativas
- Navegación táctil amigable

## Optimizaciones

- Queries Drizzle con índices compuestos
- Server Components para páginas principales

---

# v0.6.0 — Sucursal Scoping + Auditoría (25 de mayo de 2026)

## Sucursal Scoping Completo

- **SucursalContext** (`lib/sucursal-context.tsx`):
  - Provider global + hook `useSucursal()`
  - Persistencia en localStorage + cookie (para server components)
  - Evento `sucursal-cambiada` para re-fetcheo de datos
- **Selector de sucursal en Header**: Usa contexto global
- **Service layer**: Filtro `sucursalId` opcional en:
  - `turnosService.list()`, `turnosService.create()`
  - `pacientesService.list()`, `pacientesService.create()`
- **API routes**: Query param `sucursalId` en:
  - `/api/turnos`, `/api/pacientes`, `/api/medicos`
  - `/api/dashboard/stats`
- **Dashboard**: KPIs re-fetchean al cambiar sucursal
- **Validations**: `sucursalId` opcional en schemas Zod
- **Admin CRUD**: Página `/dashboard/admin/sucursales` completa

## Auditoría de Accesos Mejorada

- **Multi-tenant**: `tenant_id` agregado a `auditoria_accesos`:
  - FK a tabla `tenants` + índice `idx_auditoria_tenant`
  - Relations en schema Drizzle
- **Cleanup de logs**: API `DELETE /api/admin/audit-logs`:
  - Query params: `beforeDays` (antigüedad) o `all` (total)
  - Función `cleanAuditLogs()` en `audit-log.ts`
- **Logout tracking**: Auditoría de cierre de sesión via `events.signOut()`
- **Refactor de audit-log.ts**: Imports estáticos en vez de dinámicos
- **Feature gating**: Página protegida por feature `auditoria` (plan premium)
- **UI de limpieza**: Botón con diálogo de confirmación (antiguos 90d / todos)
- **Select UI**: Componente Radix UI reemplaza `<select>` nativo

## Fixes

- **Fix 401 landing pública**: `SucursalProvider` y `FeatureFlagsProvider` verifican `res.ok` antes de procesar JSON en páginas sin sesión
- **Build**: TypeScript 0 errores, 77 rutas generadas

## Tests

- 11 tests nuevos para multi-sucursal
- Suite completa: 9/10 tests pasando

---

# Infraestructura

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | Next.js (App Router) | 14.2.35 |
| UI | shadcn/ui + Radix UI + Tailwind CSS | -- |
| Calendario | FullCalendar | 6.1+ |
| Gráficos | Recharts | 2.12+ |
| ORM | Drizzle ORM | 0.31+ |
| Base de Datos | PostgreSQL | 15+ |
| Automatización | n8n (self-hosted) | Última |
| IA Local | Ollama + Mistral | -- |
| Mensajería | Twilio (WhatsApp, SMS) | -- |
| Autenticación | NextAuth v5 + bcrypt | -- |
| Pagos | MercadoPago SDK | 2.12+ |
| Despliegue | Dokploy (Docker Swarm / VPS) | -- |

## Servicios en VPS

- **n8n**: 7 workflows activos con AI Agents
- **Ollama**: Mistral corriendo, integrado con n8n
- **PostgreSQL**: Chat Memory PG para n8n
- **Docker**: Multi-stage build, HEALTHCHECK activo, resource limits

## URL

- **Producción**: \url{https://med.aicorebots.com}
- **Health**: \url{https://med.aicorebots.com/api/health}
- **n8n**: n8n.aicorebots.com

---

# Pendientes

Los siguientes items están identificados como pendientes para próximas iteraciones:

| Item | Prioridad | Estado |
|------|-----------|--------|
| Reportes con datos reales (vs mock) | 🟡 Media | Pendiente |
| Tests de integración | 🟡 Media | Pendiente |
| Directorios de componentes vacíos — limpiar | 🟡 Baja | Pendiente |
| Rutas API sin implementar (médicos, recetas, reportes) | 🟡 Baja | Pendiente |
| WF-04 Correo Inteligente completo (necesita IMAP/SMTP) | 🟡 Media | Pendiente |
| Deploy manual a producción (git pull + docker update) | 🔵 Alta | Por hacer |

---

# Commits Recientes

| Fecha | Commit | Descripción |
|-------|--------|-------------|
| 25/05 | `b20b078` | Fix 401 landing pública (SucursalProvider + FeatureFlagsProvider) |
| 25/05 | `62cf0b6` | Auditoría: tenantId, cleanup UI, logout tracking, static imports |
| 25/05 | `0e296d5` | Sucursal scoping completo + tests |

---

*Documento generado el 25 de mayo de 2026 — AiCore (aicorebots.com)*
