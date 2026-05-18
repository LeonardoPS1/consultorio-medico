# 🚀 Guía de Mejoras — Sprint 2

> **Proyecto:** Consultorio Médico
> **Versión:** 0.4.0
> **Fecha:** 2026-05-17
> **Build:** TypeScript 0 errores | Tests: 59 pasan (4 suites)

---

## Índice

1. [Error Handling (P1)](#1-error-handling-p1)
2. [Testing Infrastructure (P2)](#2-testing-infrastructure-p2)
3. [Developer Experience (P3)](#3-developer-experience-p3)
4. [Performance (P4)](#4-performance-p4)
5. [Cómo verificar los cambios](#5-cómo-verificar-los-cambios)

---

## 1. Error Handling (P1)

### Archivos creados

| Archivo | Propósito |
|---------|-----------|
| `app/not-found.tsx` | Página 404 personalizada (icono, texto, botón volver) |
| `app/error.tsx` | Error boundary global con botón "Intentar de nuevo" + ID de error |
| `app/loading.tsx` | Loading spinner global con animación |
| `app/dashboard/loading.tsx` | Skeleton loading para el dashboard (8 cards, 2 charts, actividad) |
| `app/dashboard/error.tsx` | Error boundary del dashboard con reintento |
| `app/dashboard/reportes/loading.tsx` | Skeleton para la sección Reportes |
| `app/dashboard/reportes/error.tsx` | Error boundary de Reportes con mensaje específico |
| `app/dashboard/pacientes/[id]/loading.tsx` | Skeleton para detalle de paciente |
| `components/ui/skeleton.tsx` | Componente Skeleton de shadcn/ui (animate-pulse + bg-muted) |

### Patrón de error boundaries

```
app/
├── error.tsx          ← Captura errores en toda la app
├── not-found.tsx      ← 404 global
├── loading.tsx        ← Spinner global
└── dashboard/
    ├── error.tsx      ← Captura errores del dashboard
    ├── loading.tsx    ← Esqueleto del dashboard
    ├── reportes/
    │   ├── error.tsx  ← Error específico de reportes
    │   └── loading.tsx← Esqueleto de reportes
    └── pacientes/[id]/
        └── loading.tsx← Esqueleto de detalle paciente
```

**Next.js 14** usa `error.tsx` como **error boundary automático**. No hace falta `ErrorBoundary` manual. Cada `error.tsx` recibe `error` y `reset()` — el botón de reintento llama a `reset()` que re-renderiza el segmento.

### Skeleton component

```tsx
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
  );
}
```

Usado en todos los loading states para consistencia visual.

---

## 2. Testing Infrastructure (P2)

### Stack instalado

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `vitest` | 4.1.6 | Test runner (compatible con Vite/Next.js) |
| `@testing-library/react` | 16.3.2 | Renderizado y consulta de componentes |
| `@testing-library/jest-dom` | 6.9.1 | Matchers: `toBeInTheDocument()`, `toHaveClass()`, etc. |
| `@testing-library/user-event` | 14.6.1 | Simulación de interacciones de usuario |
| `jsdom` | 29.1.1 | Entorno DOM para tests |
| `@vitejs/plugin-react` | 6.0.2 | Transpilación JSX en tests |

### Configuración

**`vitest.config.ts`**:
- Entorno: `jsdom`
- Setup: `lib/__tests__/setup.ts` (importa `@testing-library/jest-dom`)
- Alias `@` → raíz del dashboard
- Tests: `**/*.test.{ts,tsx}`
- Globales activadas (`describe`, `it`, `expect` sin import)

### Tests creados

#### `lib/__tests__/utils.test.ts` (25 tests)

| Función | Tests |
|---------|-------|
| `cn()` | Combina clases, filtra falsy, mergea Tailwind, objetos condicionales |
| `formatPhone()` | Formatea número argentino, vacío, sin código de país |
| `truncate()` | Texto corto, largo (default 100), longitud custom, exacto |
| `getInitials()` | Mayúsculas, acentos, apellido faltante |
| `slugify()` | Texto simple, caracteres especiales, guiones duplicados, espacios |
| `getTurnoColor()` | Estado pendiente, desconocido (default), cancelada |
| `getTurnoLabel()` | Pendiente, en_atencion, desconocido |

#### `lib/__tests__/password-validator.test.ts` (11 tests)

| Escenario | Tests |
|-----------|-------|
| Corta | Rechaza < 8 chars |
| Sin mayúscula | Rechaza sin `[A-Z]` |
| Sin minúscula | Rechaza sin `[a-z]` |
| Sin número | Rechaza sin `[0-9]` |
| Sin símbolo | Rechaza sin `[!@#$%...]` |
| Válida | Acepta y score=5 |
| Múltiples errores | Acumula errores, score bajo |
| String vacío | Score 0 |
| `passwordErrorsToString()` | Vacío, 1 error, múltiples errores |

#### `lib/__tests__/account-lockout.test.ts` (13 tests)

| Escenario | Tests |
|-----------|-------|
| Primer intento | No bloquea |
| 5to intento | Bloquea con 15 min |
| 4to intento | No bloquea |
| Sin intentos | No bloqueada |
| Tras bloqueo | locked=true |
| Case insensitive | Email en distintas capitalizaciones |
| Reset | Desbloquea después de bloqueo |
| Intentos restantes | 5 inicial, decrementa, 0 si bloqueado |

#### `components/ui/__tests__/button.test.tsx` (10 tests)

| Escenario | Tests |
|-----------|-------|
| Renderiza | Con texto |
| Variantes | default, destructive, outline, ghost, link |
| Tamaños | default, sm, lg, icon |
| Disabled | Botón deshabilitado |
| asChild | Renderiza como Slot (link) |
| Click handler | onClick se dispara |
| Disabled + click | No se dispara onClick |

### Scripts agregados

| Script | Comando |
|--------|---------|
| `test` | `vitest run` |
| `test:watch` | `vitest` (modo watch) |

### En lint-staged

```json
"*.{ts,tsx}": [
  "eslint --fix",
  "prettier --write",
  "vitest run --related --reporter=verbose"
]
```

`--related` ejecuta solo tests relacionados con los archivos modificados.

---

## 3. Developer Experience (P3)

### Prettier

**`.prettierrc`**: Configuración estándar del proyecto:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**`.prettierignore`**: Excluye `node_modules`, `.next`, `.data`, `*.json`, `*.md`.

**Scripts:**
- `format` — `prettier --write "**/*.{ts,tsx}"`
- `format:check` — `prettier --check "**/*.{ts,tsx}"`

### VSCode Settings

**`.vscode/settings.json`** en la raíz del repo:

| Configuración | Valor |
|--------------|-------|
| `editor.defaultFormatter` | `esbenp.prettier-vscode` |
| `editor.formatOnSave` | `true` |
| `editor.codeActionsOnSave` | ESLint fix |
| `typescript.tsdk` | `dashboard/node_modules/typescript/lib` |
| `files.associations` | `.css` → tailwindcss |
| `tailwindCSS.experimental.classRegex` | `cn(...)` |

### Lint-staged mejorado

```json
"*.{ts,tsx}": [
  "eslint --fix",
  "prettier --write",
  "vitest run --related --reporter=verbose"
]
```

**Flujo pre-commit:**
1. ESLint corrige errores de linting
2. Prettier formatea el código
3. Vitest ejecuta tests relacionados

---

## 4. Performance (P4)

### Bundle Analyzer

**`@next/bundle-analyzer@14.2.35`** instalado como devDependency.

**`next.config.js`**: Activado condicionalmente:

```js
const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? require('@next/bundle-analyzer')({ enabled: true })
  : (config) => config;
```

**Uso:**
```bash
pnpm analyze
# o
ANALYZE=true npx next build
```

Esto genera reportes HTML interactivos en `.next/analyze/` mostrando el tamaño de cada bundle.

### Dynamic Imports (Recharts)

Los componentes de chart que usan **Recharts** (~150KB) se movieron a `next/dynamic` con `ssr: false`:

| Componente | Tamaño evitado en bundle inicial |
|-----------|----------------------------------|
| `TurnosChart` | ~35KB (Recharts + lodash) |
| `NuevosPacientesChart` | ~35KB |
| `VolumenWhatsAppChart` | ~35KB |
| `DistribucionEstadosChart` | ~25KB |
| `ComparativaMensual` | ~20KB |

**Total: ~150KB no bloqueante** — se cargan solo cuando el usuario navega a Reportes y selecciona cada tab.

**Patrón usado:**
```tsx
const TurnosChart = dynamic(() => import('@/components/charts/turnos-chart'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted" />,
});
```

---

## 5. Cómo verificar los cambios

### TypeScript

```bash
cd dashboard
pnpm type-check
# → 0 errores
```

### Tests

```bash
# Ejecutar todos los tests
pnpm test
# → 59 passed, 4 suites

# Modo watch (desarrollo)
pnpm test:watch
```

### Error pages

```bash
# Iniciar dev server
pnpm dev

# Probar 404
curl http://localhost:3000/pagina-inexistente
# → HTML con "Página no encontrada"

# Probar loading states
# Navegar a /dashboard/reportes → ver skeleton
# Navegar a /dashboard/pacientes/123 → ver skeleton
```

### Bundle analysis

```bash
cd dashboard
pnpm analyze
# → Abrir .next/analyze/client.html en el navegador
```

### Dynamic imports

```bash
# Abrir DevTools → Network → JS
# Navegar a Reportes → ver chunk de recharts cargándose on-demand
```

### Pre-commit hook

```bash
# Modificar un archivo .ts o .tsx
git add -A
git commit -m "test: verificar lint-staged"
# → Se ejecuta: eslint → prettier → vitest --related
```

---

## Resumen de archivos creados/modificados

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `dashboard/app/not-found.tsx` | 🆕 Página 404 | 🔴 Alta |
| `dashboard/app/error.tsx` | 🆕 Error boundary global | 🔴 Alta |
| `dashboard/app/loading.tsx` | 🆕 Loading spinner global | 🔴 Alta |
| `dashboard/app/dashboard/loading.tsx` | 🆕 Skeleton dashboard | 🔴 Alta |
| `dashboard/app/dashboard/error.tsx` | 🆕 Error boundary dashboard | 🔴 Alta |
| `dashboard/app/dashboard/reportes/loading.tsx` | 🆕 Skeleton reportes | 🔴 Alta |
| `dashboard/app/dashboard/reportes/error.tsx` | 🆕 Error boundary reportes | 🔴 Alta |
| `dashboard/app/dashboard/pacientes/[id]/loading.tsx` | 🆕 Skeleton paciente | 🔴 Alta |
| `dashboard/components/ui/skeleton.tsx` | 🆕 Componente Skeleton | 🔴 Alta |
| `dashboard/vitest.config.ts` | 🆕 Config Vitest | 🟠 Alta |
| `dashboard/lib/__tests__/setup.ts` | 🆕 Setup tests | 🟠 Alta |
| `dashboard/lib/__tests__/utils.test.ts` | 🆕 25 tests utils | 🟠 Alta |
| `dashboard/lib/__tests__/password-validator.test.ts` | 🆕 11 tests password | 🟠 Alta |
| `dashboard/lib/__tests__/account-lockout.test.ts` | 🆕 13 tests lockout | 🟠 Alta |
| `dashboard/components/ui/__tests__/button.test.tsx` | 🆕 10 tests button | 🟠 Alta |
| `dashboard/.prettierrc` | 🆕 Config Prettier | 🟡 Media |
| `dashboard/.prettierignore` | 🆕 Ignore Prettier | 🟡 Media |
| `.vscode/settings.json` | 🆕 Config VSCode | 🟡 Media |
| `dashboard/.husky/pre-commit` | ✏️ +prettier +vitest | 🟡 Media |
| `dashboard/package.json` | ✏️ +test, +analyze, format scripts | 🟡 Media |
| `dashboard/next.config.js` | ✏️ +bundle analyzer | 🟡 Media |
| `dashboard/app/dashboard/reportes/page.tsx` | ✏️ Dynamic imports charts | 🟡 Media |
| `dashboard/lib/utils.ts` | ✏️ slugify trim guiones | 🟢 Baja |
