# Changelog

## [0.3.0] - 2026-05-17

### 🚀 Nuevas Funcionalidades

#### Seguridad y Autenticación
- **2FA / MFA con TOTP**: Autenticación de dos factores vía Google Authenticator/Authy
  - QR de registro escaneable, verificación en login, recuperación con backup codes
  - Endpoints `/api/auth/2fa/setup`, `/api/auth/2fa/verify`, `/api/auth/2fa/login`
- **Rate limiting por IP**: Middleware con `express-rate-limit`:
  - 5 intentos/minuto para login, 30/min para API general
- **Bloqueo de cuenta (lockout)**: 5 intentos fallidos → 15 min de bloqueo
- **Auto-logout por inactividad**: Sesión expira tras 30 min sin actividad
- **Password validator**: 8+ caracteres, mayúscula, número y símbolo requeridos
- **Headers de seguridad HTTP**: `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`
- **Verificación de firmas Twilio**: Validación criptográfica de webhooks entrantes
- **Sanitización anti-jailbreak**: Sistema de protección para prompts de IA (evita inyecciones)
- **Cifrado de backup**: Script de backup con `pg_dump` + GPG para encriptación

#### Dashboard
- **Estilo visual renovado (Taste Audit)**:
  - Tarjetas rediseñadas con sombras suaves y bordes redondeados (`rounded-xl`)
  - Gradientes sutiles (verde salvia `#4ade80` → esmeralda `#059669`, celeste `#38bdf8` → azul `#2563eb`)
  - Colorimetría coherente: verdes para acciones constructivas, celeste para navegación, ámbar para alertas
  - Scrollbar personalizada minimalista
  - Aumentado tamaño de fuente base, tracking más amplio
  - Migración de contenedores a `max-w-7xl` con padding consistente
  - Botones con iconos + texto, hover sutil con escala
- **Gráficos Recharts**: Reemplazo de Chart.js por SVG nativos:
  - Gráfico de turnos por día (línea), distribución por estado (barra), intenciones WhatsApp (torta)
  - Tooltips interactivos, responsive, colores consistentes con paleta del sistema
- **Filtro de turnos por fecha**: Selector de rango de fechas en la página de turnos
- **Tabla de reportes mejorada**: Ordenamiento por columnas, estados vacíos con ilustraciones
- **Componente StatusBadge**: Badge reutilizable con colores semánticos (verde/ámbar/rojo/gris)

#### Base de Datos
- **Migración 008_seguridad**: Nueva tabla `auditoria_accesos` para registro de operaciones sobre datos sensibles
- **Columnas 2FA en usuarios**: `secreto_2fa` (VARCHAR) y `activo_2fa` (BOOLEAN)
- **Nuevos índices**: `idx_auditoria_accion`, `idx_auditoria_entidad`, `idx_auditoria_usuario`, `idx_auditoria_created_at`

### 🔧 Mejoras

- **Configuración de IA**: Persistencia real en localStorage con sync automático al cerrar el panel
- **Componentización**: Extracción de `PasswordInput` con toggle de visibilidad, `EmailInput` con validación
- **Validación de formularios**: Feedback inline con tooltips de error y animación suave
- **Layout consistente**: Títulos con subtítulos descriptivos, breadcrumbs en páginas principales
- **Scroll suave**: `scroll-behavior: smooth` en body
- **Tipografía**: Sistema consistente usando fuente sans-serif del sistema, tracking `-0.01em` en títulos
- **Estados vacíos**: Mensajes con iconos + CTA en todas las tablas principales
- **Responsive**: Sidebar colapsable en mobile, tablas con scroll horizontal, grillas adaptativas

### 🐛 Fixes

- **Corregido**: JWT callback en NextAuth (`session.user.id` ahora correctamente tipado)
- **Corregido**: `middleware.ts` — NextRequest tipado correctamente
- **Corregido**: Export de `PasswordInput` desde barrel `components/ui`
- **Corregido**: Error de build en `turnos/page.tsx` (tipado de `useSearchParams`)
- **Corregido**: `status` de turnos mapeado correctamente de español a valores de schema
- **Corregido**: Reemplazo de `any` por tipos concretos en múltiples componentes
- **Corregido**: Import de `logo.svg` en `login/page.tsx`
- **Corregido**: Error de re-renderizado infinito en página de recetas
- **Corregido**: `type` conflict en `recetas/page.tsx` (variable vs tipo)
- **Corregido**: Login — redirect a `/dashboard` post-autenticación ahora funcional

### 📦 Build

- ✅ Compilación exitosa con Next.js 14.2.35 (producción)
- 0 errores de TypeScript (strict mode)
- 17 rutas generadas (8 estáticas + 9 dinámicas)
- First Load JS compartido: 91.2 kB
- Auditoría de seguridad: protección completa contra OWASP Top 10 (autenticación, rate limiting, headers, validación)

---

## [0.2.0] - 2026-05-15

### 🚀 Nuevas Funcionalidades

#### Dashboard
- **FullCalendar**: Vista de calendario completamente funcional con:
  - Navegación mes/día con botones y selector
  - Codificación por colores según estado del turno
  - Tooltips con detalles al hover
  - Vista timeline del día seleccionado
  - Integración con datos mock

- **Modales de creación**:
  - `NuevoTurnoModal`: Formulario con selector de paciente, tipo consulta, médico, fecha y hora
  - `NuevoPacienteModal`: Registro con nombre, apellido, teléfono, email y obra social
  - `NuevaRecetaModal`: Prescripción con medicamento, dosis, duración e indicaciones

- **Página de detalle de paciente** (`/dashboard/pacientes/[id]`):
  - Datos personales con DNI, obra social, alergias
  - Información médica (medicación crónica, notas)
  - Tabs: Resumen, Turnos, Historial Médico, Recetas
  - Historial clínico con códigos CIE-10
  - Lista de recetas activas con acciones

- **Reportes completos** (4 pestañas):
  - **General**: KPIs, gráfico de turnos por día, distribución de intenciones
  - **Turnos**: Tasa de asistencia, duración promedio, distribución por estado
  - **Pacientes**: Distribución por obra social, nuevos pacientes por mes
  - **WhatsApp**: Volumen de mensajes, canales de contacto, calidad de respuesta

- **Configuración mejorada**:
  - Integraciones: Twilio, PostgreSQL, Ollama, n8n, Google Calendar
  - Horarios editables con switches y inputs de tiempo
  - IA: Prompt del sistema editable, temperatura, tokens máximos
  - URLs de webhook n8n visibles
  - **Plantillas WhatsApp**: CRUD completo con 6 plantillas predefinidas
  - Notificaciones configurables
  - Equipo: lista de miembros + modal de invitación

#### Componentes UI nuevos
- `components/ui/dialog.tsx` — Modal reutilizable (Radix UI)
- `components/ui/textarea.tsx` — Área de texto
- `components/select.tsx` — Select dropdown (Radix UI)
- `components/calendar/calendar-view.tsx` — Calendario con vista mes/día
- `components/modals/nuevo-turno-modal.tsx`
- `components/modals/nuevo-paciente-modal.tsx`
- `components/modals/nueva-receta-modal.tsx`

#### API Routes nuevas
- `GET/POST /api/conversaciones` — Listar/crear conversaciones
- `GET /api/conversaciones/[id]` — Obtener conversación
- `GET/POST /api/conversaciones/[id]/mensajes` — Mensajes por conversación
- `GET/POST /api/webhooks/twilio` — Webhook de Twilio
- `GET/POST /api/setup` — Setup del sistema

#### Data Store
- `lib/data-store.ts` — Capa de almacenamiento dual:
  - PostgreSQL (producción) vía Drizzle ORM
  - JSON fallback (desarrollo) con seed data automática
  - CRUD completo: pacientes, conversaciones, mensajes, usuarios
  - Seed data con 6 pacientes, 4 conversaciones y mensajes de ejemplo

### 🔧 Mejoras

- **Reestructuración de rutas**: Migración de `app/(dashboard)/` a `app/dashboard/`
- **Página de turnos**: Lista con filtro por fecha, indicador de estado con colores, mensaje empty state
- **Página de pacientes**: Estadísticas rápidas (totales, con turnos, nuevos), mejor empty state
- **Página de recetas**: Estadísticas por estado, botones de acción, vista vacía con CTA
- **Workflows n8n**: Placeholders reemplazados por defaults funcionales:
  - URLs `n8n.tudominio.com` → `localhost:5678`
  - Teléfono doctor → `+5491155550000`
  - ID médico → UUID placeholder
  - Email doctor → `medico@consultorio.com`
- **Header**: Fix de import duplicado de `signOut`
- **next.config.js**: Activado `output: 'standalone'` para Dokploy

### 🐛 Fixes

- Corregido import duplicado de `signOut` en `header.tsx`
- Eliminado artifact `dashboard/conversaciones` (archivo residual)

### 📦 Build

- ✅ Compilación exitosa con Next.js 14.2.35
- 0 errores de TypeScript
- 14 rutas generadas (7 estáticas + 7 dinámicas)
- First Load JS compartido: 87.3 kB

---

## [0.1.0] - 2026-05-15

### 🎉 Versión Inicial

- Estructura completa del proyecto
- Base de datos: 12 tablas, 5 vistas, 30+ índices
- Dashboard: login, panel principal, turnos, pacientes, conversaciones, recetas, reportes, configuración
- 6 workflows n8n: WhatsApp Inbound, Turnos, Recordatorios, Correo, Resumen, Recetas
- Integración con Ollama + Mistral (IA local)
- Integración con Twilio (WhatsApp)
- Autenticación con NextAuth + bcrypt
- Modo oscuro/claro
