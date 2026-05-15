# Changelog

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
