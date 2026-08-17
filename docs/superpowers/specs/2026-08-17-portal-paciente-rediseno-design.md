# Rediseño del Portal del Paciente — Design Doc

**Fecha:** 17/08/2026
**Proyecto:** AicoreMed — Sistema de Gestión para Consultorios Médicos
**Ámbito:** SOLO frontend del Portal del Paciente. No se cambian funcionalidades, ni APIs, ni se agregan features.

---

## 1. Objetivo

Aplicar al Portal del Paciente un rediseño frontend basado en un diseño de referencia (dashboard de gestión de empleados de Dribbble), adaptado a las funcionalidades reales del portal y a su identidad de marca (AiCoreMed, wordmark "Ai" teal + "CoreMed" navy, acento funcional azul).

**Tono:** profesional, confiable y cercano; cálido, confortable, transmite bienestar y tranquilidad (adecuado a un portal de salud). No corporativo-frío ni clínico-aséptico.

**Decisiones tomadas en brainstorming:**
- **Layout responsive:** sidebar icon-only en desktop + topbar con pills; en mobile se mantiene la bottom nav actual (restyleada).
- **Alcance:** todo el portal (18 páginas).
- **Panel de asistente IA del diseño de referencia:** OMITIDO (el portal es del paciente y el chat web se eliminó; no corresponde).
- **Dark mode:** se mantiene con variantes oscuras del nuevo estilo.

---

## 2. Fundamentos visuales (tokens)

Paleta scoped bajo `.portal-layout` en `dashboard/app/portal/portal.css`. No afecta al dashboard de staff.

| Token | Claro | Oscuro |
|-------|-------|--------|
| `--portal-bg` (fondo) | `#F7F6F4` (gris cálido) | `#131317` |
| `--portal-bg-alt` (cards) | `#FFFFFF` | `#1C1C22` |
| `--portal-fg` (texto 1°) | `#232329` (gris-carbón cálido) | `#F4F4F5` |
| `--portal-muted-fg` (texto 2°) | `#94949C` | `#9CA3AF` |
| `--portal-border` | `#ECECEF` | `#2A2A30` |
| `--portal-primary` (acento) | `#2563EB` | `#3B82F6` |
| `--portal-primary-strong` (hover) | `#3B82F6` | `#2563EB` |
| `--portal-primary-dark` (marca/headers) | `#1D4ED8` | `#1D4ED8` |
| `--portal-primary-soft` (bg activo) | `#EFF6FF` | `rgba(30,58,138,0.3)` |
| `--portal-teal` (bienestar) | `#14B8A6` | `#2DD4BF` |

**Colores de estado (solo chips/pills, no decorativos):**

| Estado | Color |
|--------|-------|
| Confirmado / al día / aprobado | verde menta `#34D399` |
| En proceso / pendiente de revisión | púrpura `#A78BFA` |
| Programado / informativo | celeste `#93C5FD` |
| Urgente / atención requerida | amarillo `#FBBF24` |
| Cancelado / vencido | rojo `#F87171` |
| Check de bienestar | teal `#14B8A6` |

**Cards:** fondo blanco puro, `border-radius: 20px`, sombra `0 1px 2px rgba(30,40,60,0.03), 0 2px 8px rgba(30,40,60,0.05)` (elevación leve), padding 24-32px.

**Tipografía:** Inter (ya en uso). Títulos de sección `semibold 18-20px` con `letter-spacing: 0.01em` (ligeramente abierto). Cuerpo `14px` con `line-height: 1.6`. Secondary `13px`. `prefers-reduced-motion` respetado.

**Iconos:** outline, trazo 1.5px, gris `#6B7280`; activos/seleccionados → `#2563EB`.

**Botones/chips:** radius completo (`9999px`). Primario azul `#2563EB` sólido con texto blanco. Secundario blanco/gris claro con borde sutil y texto gris oscuro.

**Detalle de identidad:** micro-elemento de "línea de pulso / signos vitales" (heartbeat) como decoración sutil en el header y en el loading state.

---

## 3. Layout / Shell responsive

### Desktop (≥1024px)

**Sidebar icon-only** (~76px de ancho):
- Fondo blanco, borde derecho sutil.
- Arriba: logo Portal Salud.
- Centro: ítems de navegación verticales solo icono, con tooltip (delay 400ms, reutilizar `SmartTooltip` o `title`):
  - Inicio, Agendar, Turnos (primarios)
  - Recetas, Historial, Certificados, Estudios, Documentos
  - Paquetes, Reportes, Encuestas
  - Perfil, Privacidad
- Item activo: fondo `--portal-primary-soft` + icono `#2563EB`.
- Abajo fijados: Notificaciones (badge de no leídas + polling 30s actual), toggle tema, cerrar sesión.

**Topbar** (sticky, blanco/translúcido, borde inferior sutil, `h-16`):
- Izquierda: título de la sección actual + subtítulo (en Inicio: bienvenida "Buenos días, {nombre}").
- Centro: pills de navegación secundaria (Recetas, Historial, Reportes, Perfil) — fondo gris claro, activo con texto azul.
- Derecha: campana de notificaciones (badge azul) → avatar circular de iniciales del paciente (borde blanco fino → Perfil) → toggle tema → CTA sólido azul "+ Agendar".
- En la home, motivo de línea de pulso al costado del título.

### Mobile (<1024px)

Se mantiene la estructura actual restyleada:
- Bottom nav fija con glass: Inicio, Agendar, Turnos + "Más" (Sheet bottom con categorías).
- Header sticky glass con logo + toggle tema + logout.

### Contenido

Desktop: contenido pasa de `max-w-2xl` a hasta ~1200px (`lg:max-w-6xl` con padding).

---

## 4. Home rediseñada (`/portal/dashboard`)

**Card principal destacada (2/3 del ancho en desktop): "Tus próximas citas"**
- Columna izquierda: médicos de los próximos turnos — avatar circular con borde blanco + nombre + especialidad.
- Columna derecha: timeline horizontal de 7 días (próxima semana). Cada día es un chip con las horas de sus citas; el día de hoy se resalta con línea vertical punteada azul y chip azul.
- Chips de estado por tipo de cita: consulta (celeste), control (púrpura), urgencia (amarillo).
- Sin citas: estado vacío amable con CTA "+ Agendar".

**Grid inferior (2 columnas desktop, 1 mobile; la 3ra columna de IA se omite):**
- Columna A — "Próximos eventos": próximas citas con chips de hora sólido azul + estado pill + médico. Acción secundaria "Cancelar" en hover.
- Columna B — grid 2×2 mini-cards (funcionalidad actual adaptada):
  1. Paquete de turnos — avatar + nombre + barra de progreso pill ("3/5 usados").
  2. Encuestas pendientes — avatar + "Encuesta post-consulta" + pill "Pendiente".
  3. Recetas activas — avatar + receta + pill estado.
  4. Mis datos — avatar + RUT/sistema de salud → Perfil.

**Funcionalidad conservada (reestilizada, no eliminada):**
- Encuesta rápida (estrellas): mini-card desestimable arriba de la card principal cuando hay pendientes.
- 3 stat cards: fila compacta de 3 KPIs sobre el grid.
- Tabs Próximos/Historial/Recetas: se mantienen debajo del grid como acceso rápido (mismo data, nuevo estilo).

**Loading / Error:** se reestilizan con la línea de pulso como micro-decoración.

---

## 5. Resto de páginas + componentes

### Componentes base (misma API/props, nuevo estilo)
- `PortalButton`: primario azul radius completo, secundario blanco borde sutil, ghost. Mantiene loading + `playClick()`.
- `PortalCard`: blanco, radius 20px, sombra suave, padding 24-32px. Dark: `#1C1C22`.
- `PortalBadge`: pill radius completo, 5 colores de estado + variante teal.
- `PortalSkeleton`: shimmer nueva paleta + línea de pulso en header.
- `PortalNav` (mobile): restyle a la nueva paleta; pill activo azul.

### Páginas (18) — mapeo de estilo, sin tocar funcionalidad ni APIs

| Página | Cambios de diseño |
|--------|-------------------|
| Agendar (booking-wizard) | Cards médico/servicio blancas, avatar borde blanco, chips de precio, StepIndicator pills, slots gris claro, seleccionado azul |
| Turnos | Cards blancas con chip de hora sólido + estado pill (colores por estado), botones secundarios |
| Recetas | Cards blancas, pill estado (activa=verde, vencida=rojo, etc.), botón secundario vista previa/WhatsApp |
| Historial | Items con chip CIE-10 púrpura/celeste según tipo, fecha muted |
| Reportes | KPIs cards blancas, charts paleta azul/teal, eje gris claro |
| Encuestas | Estrellas ámbar `#FBBF24`, cards blancas, historial con pills |
| Certificados | Cards blancas con chip estado, botón descarga secundario |
| Consentimientos | Cards con pill (firmado=verde, pendiente=púrpura) |
| Órdenes de estudio | Cards con pill estado + chip tipo |
| Documentos (OCR) | Cards con avatar/icono, botones nuevos |
| Paquetes | Barra de progreso pill azul, chips estado |
| Notificaciones | Iconos outline gris, no leídas dot azul, filtros pills |
| Perfil | Formulario cards blancas, campos borde sutil, avatar grande borde blanco |
| Privacidad / Mis datos | Cards blancas, iconos outline, botones secundarios |
| Mensajes (redirect WhatsApp) | Card amable logo WhatsApp, CTA azul |
| Verify / Landing | Fondos cálidos, cards blancas, CTA azul, línea de pulso |
| Loading / Error | Skeletons nuevos + línea de pulso |

### Reglas globales
- 1 acción primaria por sección, resto en gris/neutro.
- Iconos outline gris, activos azul.
- Inter 14px cuerpo, títulos semibold 18-20px.
- Dark mode con variantes del mismo estilo.
- Todo scoped bajo `.portal-layout` — el dashboard de staff NO se toca.

---

## 6. Restricciones / No-go

- NO cambiar funcionalidades ni agregar features.
- NO tocar APIs ni estructura de datos.
- NO tocar el dashboard de staff.
- NO implementar panel de asistente IA.
- NO romper la UX móvil (bottom nav se mantiene).

---

## 7. Verificación

- `cd dashboard && npm run build` → 0 errores TS.
- `npx tsc --noEmit` → 0 errores.
- `npm run test` → tests existentes pasan (316 pass / 8 fail pre-existentes conocidos).
- Revisión visual en desktop (≥1024px) y mobile (<1024px), claro y oscuro.