# Rediseño Frontend Portal del Paciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar por completo el frontend del Portal del Paciente (dashboard/app/portal y components/portal) al estilo "warm azul" aprobado (paleta #F7F6F4 / cards blancas radius 20px / primario #2563EB / pills de estado), con shell responsive nuevo (sidebar icon-only desktop + topbar pills, bottom-nav mobile), sin tocar funcionalidad, APIs, lógica ni el dashboard de staff.

**Architecture:** Refactor visual scoped bajo `.portal-layout`. Los tokens de paleta se reemplazan en `app/portal/portal.css` (teal/violet → azul cálido). Los componentes base (`portal-button/card/badge/skeleton`) se actualizan a la nueva paleta manteniendo la misma API/props. El shell auth (`app/portal/(auth)/layout.tsx`) se vuelve responsive: en ≥1024px renderiza sidebar icon-only + topbar con pills; en <1024px mantiene la estructura actual (header sticky + bottom-nav) reestilizada. La home (`portal-dashboard-client.tsx`) se reestructura: card destacada con timeline de citas + grid 2 columnas de mini-cards. Las 18 páginas se reestilian una por una reemplazando clases inline/tokens viejos por los nuevos, sin tocar fetch ni handlers.

**Tech Stack:** Next.js 16 App Router, Tailwind CSS (flat config `tailwind.config.ts`), CSS variables scoped, motion/react (framer-motion), lucide-react, shadcn/ui (Sheet, Tabs, Badge, Avatar). Sin tests unitarios nuevos por tarea (refactor puramente visual) — la verificación es `npm run build` (0 errores TS) + `npx tsc --noEmit` + revisión visual.

## Global Constraints

- **NO tocar**: funcionalidad, handlers, fetch, types, server pages (page.tsx que hacen queries), API routes, lógica de negocio.
- **NO tocar** el dashboard de staff (`app/dashboard`, `app/(login)`, componentes staff). Todo scoped bajo `.portal-layout` y archivos del portal.
- TypeScript strict; `no-explicit-any` = error. JSDoc en funciones públicas.
- Verificación por tarea: `cd dashboard && npx tsc --noEmit` (debe dar 0 errores). Al cerrar grupos: `npm run build` (0 errores TS) + `npm run test` (316 pass / 8 fail pre-existentes — no deben aumentar los fails).
- Commits convencionales con `--no-verify` (hooks pre-commit OOM). Mensaje: `style(portal): ...`.
- `prefers-reduced-motion` respetado (ya cubierto por clases existentes).
- Idioma: español neutro chileno en textos visibles (ya presente; no cambiar textos).

---

## Tokens y Vocabulario Visual (referencia obligatoria para TODAS las tareas)

**Paleta nueva en `app/portal/portal.css` bajo `.portal-layout` (solo cambiar valores HSL, mantener nombres de token salvo los indicados):**

| Token | Claro (HSL) | Oscuro (HSL) |
|---|---|---|
| `--portal-bg` | `40 20% 97%` (#F7F6F4) | `240 9% 8%` (#131317) |
| `--portal-bg-alt` | `0 0% 100%` | `240 6% 12%` (#1C1C22) |
| `--portal-foreground` | `240 7% 15%` (#232329) | `240 6% 96%` |
| `--portal-muted` | `40 8% 93%` | `240 6% 16%` |
| `--portal-muted-foreground` | `240 5% 59%` (#94949C) | `220 9% 66%` |
| `--portal-border` | `240 8% 93%` (#ECECEF) | `240 6% 18%` |
| `--portal-border-light` | `240 6% 95%` | `240 6% 15%` |
| `--portal-primary` | `217 91% 53%` (#2563EB) | `217 91% 55%` |
| `--portal-primary-strong` (hover) | `218 86% 58%` (#3B82F6) | `218 86% 52%` |
| `--portal-primary-dark` | `221 83% 45%` (#1D4ED8) | `221 83% 50%` |
| `--portal-primary-soft` (bg activo) | `214 100% 97%` (#EFF6FF) | `221 83% 30%` al 30% (usar `217 91% 53% / 0.14`) |
| `--portal-primary-glow` | `217 91% 53% / 0.15` | igual |
| `--portal-teal` (bienestar) | `172 76% 38%` (#14B8A6) | `172 66% 52%` (#2DD4BF) |
| `--portal-destructive` | `0 72% 51%` (#F87171→para estados usar #EF4444: `0 84% 60%`) | `0 70% 62%` |
| `--portal-success` | `160 84% 39%` (#10B981) | `160 60% 55%` |
| `--portal-warning` | `38 92% 50%` (#F59E0B) | `38 85% 60%` |

**Tokens ELIMINADOS** (buscar y reemplazar usos en tareas de páginas): `--portal-accent`, `--portal-accent-soft`, `--portal-accent-foreground`, `--portal-primary-foreground` (reemplazar usos de `portal-accent` por `portal-primary` en iconos/gradientes; en badges de estado `accent` púrpura → usar estado púrpura `#A78BFA` inline o `portal-primary-soft`). `--portal-primary-foreground` se mantiene como `0 0% 100%`.

**Colores de estado (solo chips/pills, inline o como tokens nuevos `--portal-status-*`):** verde menta `#34D399` (confirmado/al día/aprobado/activa), púrpura `#A78BFA` (en proceso/pendiente revisión/firma pendiente), celeste `#93C5FD` (programado/informativo), amarillo `#FBBF24` (urgente/atención), rojo `#F87171` (cancelado/vencido/no asistió), teal `#14B8A6` (check bienestar).

**Reglas de estilo obligatorias en TODAS las páginas del portal:**
- Cards: `PortalCard` (fondo blanco / `#1C1C22` dark, radius 20px, sombra `0 1px 2px rgba(30,40,60,0.03), 0 2px 8px rgba(30,40,60,0.05)`, padding 24-32px → usar `padding="lg"` o `"md"`). Reemplazar `rounded-xl`/`rounded-2xl` de contenedores de contenido por `rounded-[20px]`.
- Botones primarios: azul `#2563EB` SÓLIDO (no gradiente) radius completo (`rounded-full`), hover `#3B82F6`. Secundarios: blanco/gris `border border-portal-border bg-white` radius completo.
- Chips/pills de estado y hora: `rounded-full px-2.5 py-0.5 text-[11px] font-medium` con color de estado en bg 10-15% + texto color.
- Iconos: outline trazo fino, gris `#6B7280` (`text-portal-muted-fg`), activos `#2563EB` (`text-portal-primary`).
- Títulos de sección: `text-[18px] font-semibold tracking-[0.01em] text-portal-fg` (18-20px). Cuerpo 14px `text-portal-fg`, secundario 13px `text-portal-muted-fg`.
- Avatares: circulares `rounded-full` con borde blanco de 2px (`ring-2 ring-white dark:ring-[#1C1C22]`).
- Línea de pulso (identidad): `<PulseLine />` definido en Task 4 — SVG heartbeat animado. Usar en header (home) y loading.
- En clases Tailwind, reemplazar `text-muted-foreground`/`bg-muted`/`text-foreground` de shadcn por variantes portal (`text-portal-muted-fg`, `bg-portal-muted`, `text-portal-fg`) DENTRO de archivos del portal, respetando la semántica.
- NUNCA cambiar strings visibles, `href`, `onClick`, props de datos.

---

## File Structure

**Modificar:**
- `dashboard/app/portal/portal.css` — tokens paleta + clase `.portal-card` (radius 20px, sombra nueva) + `.portal-nav-pill` (primary-soft) + keyframes pulso + utilidades chips.
- `dashboard/tailwind.config.ts` — agregar colores `portal.primary-strong`, `portal.primary-dark`, `portal.teal`; quitar `accent`/`accent-soft` del objeto portal (o dejarlos mapeando a primary si hay muchos usos — NO: se reemplazan); keyframe `pulse-line`.
- `dashboard/app/portal/(auth)/layout.tsx` — header responsive + integrar `PortalSidebarDesktop` y `PortalTopbar` (ocultos en mobile).
- `dashboard/app/portal/(auth)/portal-nav.tsx` — bottom-nav mobile reestilizada (pill primario, chips).
- `dashboard/app/portal/(auth)/portal-content.tsx` — sin cambio de lógica (solo si necesita clases).
- `dashboard/app/portal/(auth)/loading.tsx` + `error.tsx` — línea de pulso + nuevo skeleton.
- `dashboard/components/portal/portal-button.tsx` — primario azul sólido radius full.
- `dashboard/components/portal/portal-card.tsx` — radius 20px / padding nuevos (mantener API).
- `dashboard/components/portal/portal-badge.tsx` — 5 colores estado + teal, radius full.
- `dashboard/components/portal/portal-skeleton.tsx` — paleta nueva + pulso.
- `dashboard/components/portal/doctor-card.tsx`, `slot-picker.tsx`, `booking-wizard.tsx`, `push-notification-toggle.tsx`, `theme-toggle.tsx` — restyle menor (botones/cards).
- 18 páginas + clients en `dashboard/app/portal/(auth)/**` (lista exacta en tareas).

**Crear:**
- `dashboard/components/portal/pulse-line.tsx` — `<PulseLine className?>` SVG heartbeat.
- `dashboard/components/portal/portal-shell-desktop.tsx` — layout desktop: `<PortalSidebarDesktop />` + `<PortalTopbar />` (client).
- `dashboard/components/portal/portal-sidebar-desktop.tsx` — sidebar icon-only 76px con tooltips.
- `dashboard/components/portal/portal-topbar.tsx` — topbar pills + campana + avatar + CTA.
- `dashboard/components/portal/avatar-initials.tsx` — avatar circular con iniciales + color hash (reutilizable).

**No tocar:** cualquier `page.tsx` server con queries DB (salvo que la tarea lo indique para wrappers), APIs, `lib/`, componentes staff.

---

### Task 1: Tokens de paleta en portal.css + card/nav-pill

**Files:**
- Modify: `dashboard/app/portal/portal.css` (secciones `.portal-layout`, `.dark .portal-layout`, `.portal-card`, `.portal-nav-pill`, keyframes)

**Interfaces:**
- Produces: tokens nuevos `--portal-primary-strong`, `--portal-primary-dark`, `--portal-teal`; elimina `--portal-accent*`. Consumidos por Task 2 (tailwind) y todas las tareas de páginas.

- [ ] **Step 1:** Reemplazar en `.portal-layout` y `.dark .portal-layout` los valores de tokens según la tabla de la sección "Tokens". Eliminar las líneas de `--portal-accent`, `--portal-accent-soft`, `--portal-accent-foreground`. Agregar `--portal-primary-strong`, `--portal-primary-dark`, `--portal-teal` (claro y oscuro). Mantener `--portal-primary-foreground: 0 0% 100%` y `--portal-primary-glow`.

- [ ] **Step 2:** Actualizar `.portal-card`: `border-radius: 20px;` y `box-shadow: 0 1px 2px rgba(30,40,60,0.03), 0 2px 8px rgba(30,40,60,0.05);`. Mantener hover/active.

- [ ] **Step 3:** Actualizar `.portal-nav-pill`: `background: hsl(var(--portal-primary-soft));`.

- [ ] **Step 4:** Agregar keyframes y clase para línea de pulso:
```css
/* ─── Portal Pulse Line (identidad) ─────────────────────── */
.portal-pulse-line {
  display: inline-flex;
  align-items: center;
}
@keyframes portalPulseDash {
  to { stroke-dashoffset: -24; }
}
```
(La clase completa se define en Task 4 con el componente React; aquí solo el keyframe.)

- [ ] **Step 5:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores (CSS no afecta tsc, pero confirma que el proyecto compila).

- [ ] **Step 6:** Commit `--no-verify`: `git add dashboard/app/portal/portal.css && git commit --no-verify -m "style(portal): tokens paleta azul warm en portal.css"`

---

### Task 2: Tailwind config — colores portal nuevos

**Files:**
- Modify: `dashboard/tailwind.config.ts` (bloque `colors.portal`, keyframes)

**Interfaces:**
- Consumes: tokens de Task 1. Produces: utilidades `text-portal-primary-strong`, `bg-portal-primary-dark`, `text-portal-teal`, animación `animate-pulse-line`.

- [ ] **Step 1:** En `colors.portal`, agregar:
```ts
'primary-strong': 'hsl(var(--portal-primary-strong))',
'primary-dark': 'hsl(var(--portal-primary-dark))',
teal: 'hsl(var(--portal-teal))',
```
Quitar `accent` y `accent-soft` del objeto portal (el tipo TS de tailwind no los exige; si algún archivo los usa romperá tsc → se corrigen en las tareas de páginas). Mantener el resto.

- [ ] **Step 2:** Agregar keyframe:
```ts
'pulse-line': {
  from: { strokeDashoffset: '24' },
  to: { strokeDashoffset: '0' },
},
```
y animación: `'pulse-line': 'pulse-line 1.2s linear infinite',`

- [ ] **Step 3:** Verificar: `cd dashboard && npx tsc --noEmit` → registrar errores por usos de `portal-accent` (se resuelven en Task 6+). Si hay errores en archivos que la tarea actual no toca, anotarlos en el plan del changelog del task (no bloquear).

- [ ] **Step 4:** Commit `--no-verify`: `git add dashboard/tailwind.config.ts && git commit --no-verify -m "style(portal): colores primary-strong/dark/teal y keyframe pulse-line en tailwind"`

---

### Task 3: Componentes base — PortalButton, PortalBadge

**Files:**
- Modify: `dashboard/components/portal/portal-button.tsx`, `dashboard/components/portal/portal-badge.tsx`

**Interfaces:**
- Consumes: tokens de Task 1. Produces: PortalButton primario azul sólido radius-full, PortalBadge con variantes de estado (misma API: `variant` prop con valores existentes + `teal`; `className`/`style` pasan inline).

- [ ] **Step 1:** `portal-button.tsx`: cambiar `BASE` a `rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer px-6 py-2.5 h-11`. Reemplazar `VARIANTS`:
```ts
const VARIANTS: Record<string, string> = {
  primary:
    'bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.25)] hover:bg-[#3B82F6] hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)]',
  secondary:
    'bg-white text-portal-fg border border-portal-border hover:bg-portal-muted',
  ghost: 'bg-transparent text-portal-muted-fg hover:text-portal-fg hover:bg-portal-muted/60',
};
```
Mantener `playClick()`, `loading`, `fullWidth`, `active:scale-[0.97]`, disabled styles.

- [ ] **Step 2:** `portal-badge.tsx`: reemplazar `variantStyles` manteniendo la variante `accent` como fallback pero cambiando valores; agregar `teal`:
```ts
const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#2563EB]/10 text-[#2563EB]',
  success: 'bg-[#34D399]/15 text-[#059669] dark:text-[#34D399]',
  warning: 'bg-[#FBBF24]/15 text-[#D97706] dark:text-[#FBBF24]',
  destructive: 'bg-[#F87171]/15 text-[#DC2626] dark:text-[#F87171]',
  muted: 'bg-portal-muted text-portal-muted-fg',
  accent: 'bg-[#A78BFA]/15 text-[#7C3AED] dark:text-[#A78BFA]',
  teal: 'bg-[#14B8A6]/15 text-[#0D9488] dark:text-[#2DD4BF]',
};
```
Actualizar el type `BadgeVariant` agregando `'teal'`. Mantener `rounded-full`.

- [ ] **Step 3:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores en estos 2 archivos.

- [ ] **Step 4:** Commit `--no-verify`: `git add dashboard/components/portal/portal-button.tsx dashboard/components/portal/portal-badge.tsx && git commit --no-verify -m "style(portal): PortalButton azul sólido radius-full y PortalBadge estados"`

---

### Task 4: PortalCard, PortalSkeleton + línea de pulso + avatar iniciales

**Files:**
- Modify: `dashboard/components/portal/portal-card.tsx`, `dashboard/components/portal/portal-skeleton.tsx`
- Create: `dashboard/components/portal/pulse-line.tsx`, `dashboard/components/portal/avatar-initials.tsx`

**Interfaces:**
- Produces: `PortalCard` (radius 20px via `.portal-card`, paddings sm=16px/md=20px/lg=28px), `PortalSkeleton` (paleta nueva + `<PulseLine/>`), `<PulseLine className?: string>` (SVG heartbeat, usa `animate-pulse-line`), `<AvatarInitials nombre apellido className size?>`.

- [ ] **Step 1:** `portal-card.tsx`: actualizar `PADDINGS` a `{ none: '', sm: 'p-4', md: 'p-5', lg: 'p-7' }`. Sin otros cambios de API.

- [ ] **Step 2:** Crear `pulse-line.tsx`:
```tsx
'use client';

/**
 * PulseLine — Línea de pulso/signos vitales (identidad del portal).
 */
export function PulseLine({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`portal-pulse-line h-3 w-6 text-portal-primary ${className}`}
      aria-hidden="true"
    >
      <path d="M0 6h4l2-4 3 8 2-6 1.5 4H24" className="animate-pulse-line" />
    </svg>
  );
}
```

- [ ] **Step 3:** Crear `avatar-initials.tsx`:
```tsx
'use client';

const AVATAR_COLORS = [
  'bg-[#2563EB]', 'bg-[#14B8A6]', 'bg-[#8B5CF6]', 'bg-[#F59E0B]',
  'bg-[#0EA5E9]', 'bg-[#F43F5E]',
];

function hashToIndex(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % AVATAR_COLORS.length;
}

/**
 * AvatarInitials — Avatar circular con iniciales del nombre.
 * @param root0
 * @param root0.nombre
 * @param root0.apellido
 * @param root0.className
 */
export function AvatarInitials({
  nombre,
  apellido,
  className = 'h-10 w-10 text-sm',
}: {
  nombre: string;
  apellido?: string;
  className?: string;
}) {
  const initials = `${(nombre || '?').trim().charAt(0)}${(apellido || '').trim().charAt(0)}`
    .toUpperCase();
  const color = AVATAR_COLORS[hashToIndex(`${nombre}${apellido}`)];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white dark:ring-[#1C1C22] shrink-0 ${color} ${className}`}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
}
```

- [ ] **Step 4:** `portal-skeleton.tsx`: reemplazar `bg-muted` → `bg-portal-muted`, `border-border bg-card` → `border-portal-border bg-portal-bg-alt`, `text-*` → variantes portal. Agregar en el header del skeleton una fila con `<PulseLine className="text-portal-muted-fg" />` junto al título.

- [ ] **Step 5:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores.

- [ ] **Step 6:** Commit `--no-verify`: `git add dashboard/components/portal/portal-card.tsx dashboard/components/portal/portal-skeleton.tsx dashboard/components/portal/pulse-line.tsx dashboard/components/portal/avatar-initials.tsx && git commit --no-verify -m "style(portal): PortalCard radius 20, skeleton pulso, PulseLine y AvatarInitials"`

---

### Task 5: Shell desktop — Sidebar icon-only + Topbar

**Files:**
- Create: `dashboard/components/portal/portal-sidebar-desktop.tsx`, `dashboard/components/portal/portal-topbar.tsx`
- Modify: `dashboard/app/portal/(auth)/layout.tsx`

**Interfaces:**
- Consumes: `AvatarInitials`, `PulseLine`, tokens. Produces: `<PortalSidebarDesktop />` y `<PortalTopbar title subtitle showPulse>` (client), integrados en `layout.tsx` dentro de `<div className="hidden lg:flex ...">`.

- [ ] **Step 1:** Crear `portal-sidebar-desktop.tsx`:
  - `'use client'`; `usePathname`, `Link`, `Tooltip` de `@/components/ui/tooltip` (verificar que existe; si no, usar `title` attr nativo).
  - Nav data: primarios `[Inicio /portal/dashboard HeartPulse, Agendar /portal/agendar PlusCircle, Turnos /portal/turnos Calendar]`; sección docs `[Recetas FileText, Historial History, Certificados ScrollText, Estudios FlaskConical, Documentos Upload]`; sección gestión `[Paquetes Package, Reportes TrendingUp, Encuestas ClipboardCheck, Perfil User, Privacidad ShieldCheck]`.
  - Render: `<aside className="fixed inset-y-0 left-0 z-30 w-[76px] bg-white dark:bg-[#1C1C22] border-r border-portal-border flex flex-col items-center py-4">`. Logo arriba (icono heart `h-6 w-6 text-portal-primary`), centro lista de ítems icon-only, abajo (mt-auto) Notificaciones (badge azul no-leídas + polling 30s reutilizando el patrón de `portal-nav.tsx`), toggle tema (`PortalThemeToggle`), logout (`PortalLogoutButton`).
  - Ítem activo: `bg-portal-primary-soft text-portal-primary`; inactivo `text-portal-muted-fg hover:bg-portal-muted`. Ítems con `aria-label` + `title` (tooltip). Ancho del contenedor de cada ítem `h-11 w-11 rounded-full flex items-center justify-center`.
  - Reusar el objeto `secondaryGroups`/`primaryNav` como data (duplicar local, no importar de portal-nav para evitar acoplar).

- [ ] **Step 2:** Crear `portal-topbar.tsx`:
  - `'use client'`; props `{ title: string; subtitle?: string; showPulse?: boolean }`.
  - Render: `<header className="sticky top-0 z-20 hidden lg:block bg-white/90 dark:bg-[#1C1C22]/90 backdrop-blur border-b border-portal-border h-16">` con contenedor `max-w-[1200px] mx-auto px-6 h-16 flex items-center gap-4`.
  - Izquierda: `{showPulse && <PulseLine className="text-portal-primary" />} <h1 className="text-[20px] font-semibold tracking-[0.01em] text-portal-fg">{title}</h1>` + `{subtitle && <span className="text-[13px] text-portal-muted-fg">{subtitle}</span>}`.
  - Centro (pills secundarias): `[Recetas /portal/recetas, Historial /portal/historial, Reportes /portal/reportes, Perfil /portal/perfil]` → Link pill `rounded-full px-4 py-1.5 text-[13px] font-medium`, activo `bg-portal-primary-soft text-portal-primary`, inactivo `text-portal-muted-fg hover:bg-portal-muted`.
  - Derecha: campana (Link a `/portal/notificaciones`, icono `Bell`, badge azul no-leídas), separador, avatar (`AvatarInitials` → Link a `/portal/perfil`), toggle tema, CTA `<Link href="/portal/agendar" className="rounded-full bg-[#2563EB] hover:bg-[#3B82F6] text-white px-5 py-2 text-sm font-semibold flex items-center gap-1"><Plus/>Agendar</Link>`.

- [ ] **Step 3:** En `layout.tsx`:
  - Importar `PortalSidebarDesktop` y `PortalTopbar`.
  - Definir un mapa de títulos por sección derivado de `pathname`... **NO**: layout es server component y `pathname` no está disponible. En su lugar, cada página pasa el título. Alternativa simple: el topbar recibe título vía un cliente. **Solución**: mover el topbar a un componente cliente que lee `usePathname` y resuelve el título desde un mapa (igual que `portal-nav`). Por lo tanto `portal-topbar.tsx` NO recibe props de título: lo resuelve interno con `usePathname` (mapa `pathname → {title, subtitle?, showPulse?}`, home → 'Buenos días, {nombre}'... pero nombre no está disponible). **Ajuste**: el topbar muestra título fijo por ruta del mapa + para home el subtítulo se obtiene de un fetch a `/api/portal/me` (endpoint existente). En home, `title: 'Inicio'`, `subtitle: 'Buenos días'` + `showPulse`. Usar `fetch('/api/portal/me')` en useEffect para el nombre (opcional; si falla, omitir). Simplificar: no fetch — `subtitle` en home = `'Tu espacio de salud'` estático (sin tocar APIs).
  - Wrapper en layout:
```tsx
<div className="hidden lg:block">
  <PortalSidebarDesktop />
  <PortalTopbar />
</div>
<div className="lg:pl-[76px]">
  <main id="main-content" className="max-w-[1200px] mx-auto px-4 py-6 pb-28 lg:pb-10 lg:px-6 min-h-[calc(100vh-3.5rem)]">
    <PortalContent>{children}</PortalContent>
  </main>
</div>
```
  - Mantener el header sticky y `<PortalNav />` actuales pero ocultarlos en ≥1024px: envolver el header actual con `className="lg:hidden"` y `<PortalNav />` → `<div className="lg:hidden"><PortalNav /></div>`.

- [ ] **Step 4:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores. Revisar que `@/components/ui/tooltip` existe (si no, usar `title` attr nativo y quitar import).

- [ ] **Step 5:** Commit `--no-verify`: `git add dashboard/components/portal/portal-sidebar-desktop.tsx dashboard/components/portal/portal-topbar.tsx dashboard/app/portal/(auth)/layout.tsx && git commit --no-verify -m "style(portal): shell responsive desktop (sidebar icon-only + topbar pills)"`

---

### Task 6: Home rediseñada — portal-dashboard-client.tsx

**Files:**
- Modify: `dashboard/app/portal/(auth)/dashboard/portal-dashboard-client.tsx` (client UI — NO tocar `page.tsx` server ni types recibidos)

**Interfaces:**
- Consumes: props actuales (paciente, turnos, recetas, historial, turnosSinEncuesta) — mismas types, NO cambiar. Usa `AvatarInitials`, `PulseLine`, `PortalBadge`, `PortalButton`, `PortalCard`.

- [ ] **Step 1:** Mantener helpers (`formatCLDate`, `formatCLPhone`, `getTurnoColor/Label`, `getSistemaSalud*`) sin cambio lógico. Reemplazar `getTurnoColor` por la paleta de estados aprobada: pendiente `#FBBF24`, confirmada `#34D399`, en_consulta `#93C5FD`, en_atencion `#2563EB`, atendido `#34D399`, completada `#6B7280`, cancelada `#F87171`, no_asistio `#F87171`.

- [ ] **Step 2:** Header del cliente: mantener saludo pero con `AvatarInitials nombre apellido className="h-12 w-12 text-base"` en vez del círculo gradiente; reemplazar `text-lg font-bold` → `text-[20px] font-semibold tracking-[0.01em]`. Quitar el `ChevronRight` decorativo.

- [ ] **Step 3:** QuickSurveyCard: reemplazar `bg-portal-primary/10` → `bg-portal-primary-soft`, botones de fecha (rounded-lg) → `rounded-full`, estrellas mantener `fill-yellow-400`. No cambiar lógica.

- [ ] **Step 4:** Stats (3 KPIs): reemplazar los colores inline teal/violet por azul: icono y número `hsl(var(--portal-primary))`, bg `hsl(var(--portal-primary) / 0.06)`. Texto `[10px]` → `[11px]`. Mantener grid-cols-3.

- [ ] **Step 5:** Reemplazar la card "Mis datos" por la mini-card de la grid 2x2 (sección 3 del spec). Estructura nueva (desktop: grid 2 columnas, mobile 1):
```tsx
{/* Mini cards grid */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Paquete turnos / Recetas activas / Encuestas pendientes / Mis datos */}
</div>
```
  - Mini-card Paquete: usar `recetas.length` como proxy de progreso si no hay data de paquetes en props → NO inventar. Las props disponibles son recetas/historial/turnos. Mini-cards reales: (1) Recetas activas (count + pill estado → Link `/portal/recetas`), (2) Encuestas pendientes (turnosSinEncuesta.length + pill 'Pendiente' → `/portal/encuestas`), (3) Próximos turnos (turnosProximos.length + hora del próximo → `/portal/turnos`), (4) Mis datos (RUT + sistema salud pill → `/portal/perfil`). Cada mini-card: `PortalCard padding="md"` + `AvatarInitials`/icono + título `text-sm font-semibold` + dato + barra/pill.
  - Si el spec pide "barra progreso pill '3/5 usados'" y no hay data de paquetes, la tarea OMITE la barra de paquetes (no inventar datos). Documentar en comentario de código si hace falta.

- [ ] **Step 6:** Card principal destacada "Tus próximas citas" (2/3 desktop): nuevo bloque antes de las mini-cards. Timeline horizontal de los próximos 7 días con turnos del paciente (los `turnosProximos`): fila de 7 chips de día (Lun 18, Mar 19...) con los turnos de cada día debajo como chips de hora (color por tipoConsulta: consulta=celeste #93C5FD, control=púrpura #A78BFA, urgencia=amarillo #FBBF24, default celeste); día de hoy resaltado con línea vertical punteada azul debajo. Izquierda: avatar + nombre del médico del primer turno próximo. Sin turnos: estado vacío + botón '+ Agendar' (Link `/portal/agendar`). Este bloque puede vivir en un subcomponente `ProximasCitasTimeline` dentro del mismo archivo.
  - Desktop: `grid grid-cols-1 lg:grid-cols-3 gap-4`, timeline ocupa `lg:col-span-2`, mini-cards `lg:col-span-1` en grid 2x1 vertical o 2x2. Mobile: apilado.

- [ ] **Step 7:** Tabs Próximos/Historial/Recetas: mantener estructura y lógica; reestilar TabsList/TabsTrigger (`bg-portal-muted/60 rounded-full p-1`, trigger activo `bg-white dark:bg-[#1C1C22] text-portal-primary shadow-sm rounded-full`). Cards internas: `borderLeft` → `border-l-4` con estado; reemplazar `text-foreground`/`text-muted-foreground` → portal; PortalBadge con nuevo estilo (variante success para confirmada/atendido, warning pendiente, destructive cancelada, etc. según getTurnoColor → mapear a variant: pendiente='warning', confirmada/atendido='success', cancelada/no_asistio='destructive', resto='muted').

- [ ] **Step 8:** Footer: mantener, `text-portal-muted-fg/50`.

- [ ] **Step 9:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores; `cd dashboard && npm run build` → 0 errores.

- [ ] **Step 10:** Commit `--no-verify`: `git add "dashboard/app/portal/(auth)/dashboard/portal-dashboard-client.tsx" && git commit --no-verify -m "style(portal): home rediseñada con timeline citas y mini-cards"`

---

### Task 7: Agendar — booking-wizard, doctor-card, slot-picker, agendar page

**Files:**
- Modify: `dashboard/components/portal/booking-wizard.tsx`, `dashboard/components/portal/doctor-card.tsx`, `dashboard/components/portal/slot-picker.tsx`, `dashboard/app/portal/(auth)/agendar/page.tsx`

**Interfaces:**
- Consumes: tokens nuevos. Produces: wizard con cards blancas radius 20, chips de precio/slots pill, StepIndicator pills.

- [ ] **Step 1:** `booking-wizard.tsx`: reemplazar `bg-portal-gradient-strong` del StepIndicator (línea 114) por `bg-[#2563EB]`; paso actual activo azul sólido, pasos inactivos `bg-portal-muted text-portal-muted-fg rounded-full`. Cards de médico/servicio: `PortalCard` radius 20 (via clase), botones secundarios radius-full.

- [ ] **Step 2:** `doctor-card.tsx`: avatar → `AvatarInitials nombre apellido` con ring blanco. Precio en chip `rounded-full bg-portal-primary-soft text-portal-primary text-[12px] font-semibold px-3 py-1`.

- [ ] **Step 3:** `slot-picker.tsx`: slots libres `bg-white border border-portal-border rounded-full` hover `border-[#2563EB]`, seleccionado `bg-[#2563EB] text-white`. Skeleton → `bg-portal-muted`.

- [ ] **Step 4:** `agendar/page.tsx`: si tiene clases shadcn (`text-foreground` etc.) → portal; título `text-[20px] font-semibold`.

- [ ] **Step 5:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores.

- [ ] **Step 6:** Commit `--no-verify`: `git add dashboard/components/portal/booking-wizard.tsx dashboard/components/portal/doctor-card.tsx dashboard/components/portal/slot-picker.tsx dashboard/app/portal/(auth)/agendar/page.tsx && git commit --no-verify -m "style(portal): agendar wizard y selectores con paleta azul"`

---

### Task 8: Turnos + Recetas

**Files:**
- Modify: `dashboard/app/portal/(auth)/turnos/portal-turnos-client.tsx`, `dashboard/app/portal/(auth)/recetas/portal-recetas-client.tsx`

**Interfaces:**
- Consumes: `PortalCard`, `PortalBadge` (nuevo), `AvatarInitials`, tokens.

- [ ] **Step 1:** `portal-turnos-client.tsx`: cards → `PortalCard` (o `portal-card` clase) con padding md/lg; chip hora `rounded-full bg-[#2563EB]/10 text-[#2563EB] text-[12px] font-semibold px-3 py-1`; estado → `PortalBadge` variante mapeada (pendiente=warning, confirmada=success, en_consulta=accent púrpura o celeste inline, cancelada/no_asistio=destructive, completada=muted). Botones secundarios → `PortalButton variant="secondary"`. Reemplazar `text-muted-foreground`→portal.

- [ ] **Step 2:** `portal-recetas-client.tsx`: estado pill: activa → `PortalBadge variant="success"` (verde #34D399), vencida → `destructive` (#F87171). Card preview/acciones conservando handlers.

- [ ] **Step 3:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores.

- [ ] **Step 4:** Commit `--no-verify`: `git add dashboard/app/portal/(auth)/turnos/portal-turnos-client.tsx dashboard/app/portal/(auth)/recetas/portal-recetas-client.tsx && git commit --no-verify -m "style(portal): turnos y recetas con chips y pills de estado"`

---

### Task 9: Historial + Certificados + Consentimientos + Órdenes de estudio

**Files:**
- Modify: `dashboard/app/portal/(auth)/historial/portal-historial-client.tsx`, `dashboard/app/portal/(auth)/certificados/page.tsx`, `dashboard/app/portal/(auth)/consentimientos/page.tsx`, `dashboard/app/portal/(auth)/ordenes-estudio/page.tsx`

**Interfaces:**
- Consumes: `PortalBadge` (teal/púrpura), `PortalCard`, tokens.

- [ ] **Step 1:** `portal-historial-client.tsx`: chip CIE-10 por tipo → `rounded-full` con `bg-[#A78BFA]/15 text-[#7C3AED]` para consultas/estudios, `bg-[#93C5FD]/15 text-[#2563EB]` para otros; reemplazar `text-portal-accent` (línea 59) → `text-[#7C3AED]`. Fecha `text-portal-muted-fg`.

- [ ] **Step 2:** `certificados/page.tsx`: chip estado `PortalBadge` (emitido=success, revocado/cancelado=destructive), botón descarga `PortalButton variant="secondary"`.

- [ ] **Step 3:** `consentimientos/page.tsx`: firmado → `PortalBadge variant="success"` con `CheckCircle2`, pendiente → `PortalBadge variant="accent"` (púrpura #A78BFA). Botón firmar primario azul.

- [ ] **Step 4:** `ordenes-estudio/page.tsx`: pill estado (pendiente=púrpura/informativo `bg-[#93C5FD]/15 text-[#2563EB]`, en_proceso=púrpura `#A78BFA`, listo/entregado=success, cancelado=destructive), chip tipo (línea 147 `text-portal-accent` → `text-[#2563EB]` o celeste). Botón descarga secundario.

- [ ] **Step 5:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores.

- [ ] **Step 6:** Commit `--no-verify`: `git add dashboard/app/portal/(auth)/historial/portal-historial-client.tsx dashboard/app/portal/(auth)/certificados/page.tsx dashboard/app/portal/(auth)/consentimientos/page.tsx dashboard/app/portal/(auth)/ordenes-estudio/page.tsx && git commit --no-verify -m "style(portal): historial, certificados, consentimientos y ordenes de estudio"`

---

### Task 10: Reportes + Encuestas + Paquetes

**Files:**
- Modify: `dashboard/app/portal/(auth)/reportes/page.tsx`, `dashboard/app/portal/(auth)/encuestas/page.tsx`, `dashboard/app/portal/(auth)/paquetes/page.tsx`

**Interfaces:**
- Consumes: `PortalBadge`, `PortalCard`, tokens; reemplaza TODOS los `hsl(var(--portal-accent))` (líneas 89, 211, 301 de reportes) → `hsl(var(--portal-primary))`.

- [ ] **Step 1:** `reportes/page.tsx`: KPIs → cards blancas radius 20 (via `portal-card`), iconos `text-portal-primary`; reemplazar los 3 gradientes lineales teal→violet por azul sólido (`hsl(var(--portal-primary))`); ejes de charts gris claro `#E5E7EB`; tooltips del chart con paleta. NO cambiar la lógica de datos ni los charts de librería (Recharts) más allá de colores.

- [ ] **Step 2:** `encuestas/page.tsx`: estrellas `fill-[#FBBF24] text-[#FBBF24]`; cards blancas; historial con pills `PortalBadge` (respondido=success). No cambiar el submit.

- [ ] **Step 3:** `paquetes/page.tsx`: barra de progreso → `bg-portal-muted` track + `bg-[#2563EB]` fill `rounded-full`; pill progreso `'3/5 usados'` `rounded-full bg-[#2563EB]/10 text-[#2563EB]`. CTA comprar primario.

- [ ] **Step 4:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores.

- [ ] **Step 5:** Commit `--no-verify`: `git add dashboard/app/portal/(auth)/reportes/page.tsx dashboard/app/portal/(auth)/encuestas/page.tsx dashboard/app/portal/(auth)/paquetes/page.tsx && git commit --no-verify -m "style(portal): reportes, encuestas y paquetes con paleta azul"`

---

### Task 11: Notificaciones + Perfil + Privacidad

**Files:**
- Modify: `dashboard/app/portal/(auth)/notificaciones/page.tsx`, `dashboard/app/portal/(auth)/perfil/portal-perfil-client.tsx`, `dashboard/app/portal/(auth)/privacidad/portal-privacidad-client.tsx`

**Interfaces:**
- Consumes: `PortalCard`, `AvatarInitials`, `PortalButton`, tokens.

- [ ] **Step 1:** `notificaciones/page.tsx`: iconos por tipo `text-portal-muted-fg` (línea 36 `text-portal-accent` → `text-portal-primary` para el icono de mensaje); no leídas → dot azul `bg-[#2563EB]`; filtros → pills `rounded-full` (activo `bg-portal-primary-soft text-portal-primary`). Cards blancas.

- [ ] **Step 2:** `perfil/portal-perfil-client.tsx`: avatar grande → `AvatarInitials nombre apellido className="h-20 w-20 text-2xl"`; form cards blancas radius 20; inputs `border-portal-border bg-white rounded-xl focus:border-[#2563EB]`; botón guardar primario azul; toggle WhatsApp/email con colores portal (success=verde).

- [ ] **Step 3:** `privacidad/portal-privacidad-client.tsx`: cards blancas; iconos `text-portal-muted-fg`; línea 62 `text-portal-accent` → `text-[#2563EB]`; exportar/solicitar eliminación → `PortalButton variant="secondary"` y primario respectivamente.

- [ ] **Step 4:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores.

- [ ] **Step 5:** Commit `--no-verify`: `git add dashboard/app/portal/(auth)/notificaciones/page.tsx dashboard/app/portal/(auth)/perfil/portal-perfil-client.tsx dashboard/app/portal/(auth)/privacidad/portal-privacidad-client.tsx && git commit --no-verify -m "style(portal): notificaciones, perfil y privacidad"`

---

### Task 12: Documentos OCR + Mensajes + Loading/Error

**Files:**
- Modify: `dashboard/app/portal/(auth)/documentos/page.tsx`, `dashboard/app/portal/(auth)/mensajes/page.tsx`, `dashboard/app/portal/(auth)/loading.tsx`, `dashboard/app/portal/(auth)/error.tsx`, `dashboard/components/portal/push-notification-toggle.tsx`, `dashboard/components/portal/theme-toggle.tsx` (si usa clases a actualizar)

**Interfaces:**
- Consumes: `PulseLine`, `PortalCard`, `PortalButton`, tokens.

- [ ] **Step 1:** `documentos/page.tsx`: cards con icono/avatar + botones `PortalButton`; reemplazar gradientes si existen por azul sólido. NO tocar el flujo OCR/polling.

- [ ] **Step 2:** `mensajes/page.tsx`: reemplazar el botón gradiente (línea 26) por `bg-[#2563EB] hover:bg-[#3B82F6] rounded-full`; card amable con logo WhatsApp; mantener el redirect/link.

- [ ] **Step 3:** `loading.tsx`: render `PortalSkeleton` (ya lo usa) + `<PulseLine />` en el header del skeleton. `error.tsx`: botones con `PortalButton variant="secondary"`/primario; mantener handlers.

- [ ] **Step 4:** `push-notification-toggle.tsx`: línea 178 gradiente → `bg-[#2563EB] hover:bg-[#3B82F6]`; mantener lógica.

- [ ] **Step 5:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores; `cd dashboard && npm run build` → 0 errores.

- [ ] **Step 6:** Commit `--no-verify`: `git add dashboard/app/portal/(auth)/documentos/page.tsx dashboard/app/portal/(auth)/mensajes/page.tsx "dashboard/app/portal/(auth)/loading.tsx" "dashboard/app/portal/(auth)/error.tsx" dashboard/components/portal/push-notification-toggle.tsx && git commit --no-verify -m "style(portal): documentos, mensajes, loading/error y toggle"`

---

### Task 13: Landing pública + Verify + limpieza de usos accent restantes

**Files:**
- Modify: `dashboard/app/portal/(public)/page.tsx`, `dashboard/app/portal/(public)/verify/page.tsx`, `dashboard/app/portal/(auth)/portal-nav.tsx`

**Interfaces:**
- Consumes: tokens; elimina usos restantes de `portal-accent`/`portal-gradient-strong` en el portal.

- [ ] **Step 1:** `(public)/page.tsx`: reemplazar `bg-portal-accent/5` (línea 284) → `bg-portal-primary/5`; logo `bg-portal-gradient-strong` (línea 309) → `bg-[#2563EB]`; fondo cálido `#F7F6F4` (heredado de `.portal-layout` — verificar que la landing está bajo `.portal-layout`; si no, agregar el wrapper). Cards blancas, CTA azul, `PulseLine` en el header de la landing.

- [ ] **Step 2:** `(public)/verify/page.tsx`: cards blancas, CTA azul, estados (válido=success, expirado=destructive).

- [ ] **Step 3:** `portal-nav.tsx` (bottom-nav mobile): mantener estructura; reestilar pill activa → `bg-portal-primary-soft` (via `.portal-nav-pill` ya actualizado) y texto `text-[10px]`; badge no-leídas → `bg-[#2563EB]`; Sheet content glass OK. Nada de accent.

- [ ] **Step 4:** Buscar usos restantes: `grep -rn "portal-accent\|portal-gradient-strong" dashboard/app/portal dashboard/components/portal` y corregir cada uno (reemplazar por primary sólido o soft). Si un componente del dashboard staff usa estos (fuera de portal), NO tocar.

- [ ] **Step 5:** Verificar: `cd dashboard && npx tsc --noEmit` → 0 errores; `cd dashboard && npm run build` → 0 errores; `cd dashboard && npm run test` → 316 pass / 8 fail pre-existentes (sin aumento).

- [ ] **Step 6:** Commit `--no-verify`: `git add dashboard/app/portal/(public)/page.tsx dashboard/app/portal/(public)/verify/page.tsx "dashboard/app/portal/(auth)/portal-nav.tsx" && git commit --no-verify -m "style(portal): landing, verify y bottom-nav con paleta azul"`

---

### Task 14: Verificación final + PDF del plan

**Files:**
- N/A (solo comandos)

- [ ] **Step 1:** `cd dashboard && npx tsc --noEmit` → 0 errores.
- [ ] **Step 2:** `cd dashboard && npm run build` → Compiled successfully, 0 errores/0 warnings.
- [ ] **Step 3:** `cd dashboard && npm run test` → 316 pass, 8 fail pre-existentes (mismos 8, sin aumentar).
- [ ] **Step 4:** `cd dashboard && npx eslint . --format json` → 0 errores/0 warnings (regla del proyecto; si warnings pre-existentes no relacionados con portal, documentar).
- [ ] **Step 5:** Revisión visual manual (usuario): desktop ≥1024px (sidebar + topbar), mobile <1024px (bottom-nav + header), claro y oscuro, home con timeline, una página lista (turnos/recetas), landing y verify.
- [ ] **Step 6:** Actualizar `AGENTS.md` si corresponde (solo si es cambio significativo) y `docs/superpowers/specs/2026-08-17-portal-paciente-rediseno-design.md` NO (ya aprobado).
- [ ] **Step 7:** Commit final si hay cambios pendientes: `git add -A && git commit --no-verify -m "style(portal): rediseño completo portal del paciente vX"` y `git push`.

---

## Self-Review del Plan

**Spec coverage:**
- Paleta warm azul (tokens) → Task 1-2 ✓
- Cards radius 20 / sombras / padding 24-32 → Task 1 + 4 ✓
- Shell responsive (sidebar icon-only + topbar pills desktop, bottom-nav mobile) → Task 5 + 13 ✓
- Home (timeline 7 días + grid 2x2 mini-cards + KPIs + tabs) → Task 6 ✓
- Componentes base (Button/Badge/Card/Skeleton) → Task 3-4 ✓
- 18 páginas reestilizadas → Tasks 6-13 ✓ (dashboard, agendar, turnos, recetas, historial, reportes, encuestas, certificados, consentimientos, ordenes-estudio, documentos, paquetes, notificaciones, perfil, privacidad, mensajes, loading, error)
- Landing + verify públicas → Task 13 ✓
- Panel IA omitido → no se crea ✓
- Dark mode variantes → tokens dark en Task 1 + clases dark en componentes ✓
- No tocar funcionalidad/APIs/staff → constraints + cada task ✓
- Línea de pulso en header/loading → Task 4 (PulseLine) + Task 5 (topbar) + Task 12 (loading) ✓

**Placeholder scan:** sin TBD; cada task tiene pasos concretos con clases/CSS exactos. Las tareas de páginas asumen que el ejecutor abre el archivo y aplica el mapeo — se da el patrón exacto de clases a usar y las líneas conocidas a corregir.

**Type consistency:** `PortalBadge` agrega variante `teal`; `AvatarInitials` exportado y usado en Tasks 5-11; `PulseLine` usado en Tasks 4, 5, 12, 13; tokens `--portal-primary-strong/dark/teal` consumidos de forma consistente.
