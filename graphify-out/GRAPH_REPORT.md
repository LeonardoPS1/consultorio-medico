# 📊 GRAPH_REPORT — Consultorio Médico

**Generado:** 2026-06-04 | **Graphify v0.8.31** | **1589 nodos · 4532 edges · 93 comunidades**

---

## 📈 Resumen General

| Métrica | Valor |
|---------|-------|
| **Total nodos** | 1,589 |
| **Total edges** | 4,532 |
| **Hiperedges** | 3 |
| **Comunidades** | 93 |
| **Archivos code procesados (AST)** | 310 (.ts/.tsx) |
| **Archivos docs procesados (semántica)** | 10 (.md) |
| **Imágenes procesadas (semántica)** | 9 (.png/.svg) |
| **Tamaño graph.json** | 2.3 MB |

### Componentes del Grafo

| Fuente | Nodos | Edges | Hiperedges |
|--------|-------|-------|------------|
| AST (código) | 1,448 | 4,312 | 0 |
| Semántico docs | 93 | 128 | 3 |
| Semántico imágenes | 50 | 92 | 0 |
| **Total (post-merge)** | **1,589** | **4,532** | **3** |

---

## 🏛 Estructura de Comunidades

93 comunidades detectadas vía Leiden (resolución 1.0). Distribución balanceada sin comunidades gigantes.

### Top 10 Comunidades

| # | Tamaño | % Grafo | Descripción probable |
|---|--------|---------|---------------------|
| 0 | 90 | 5.7% | Auth, usuarios, registro, seguridad |
| 1 | 77 | 4.8% | Dashboard KPIs + página principal |
| 2 | 71 | 4.5% | Pacientes: CRUD, historial, modal |
| 3 | 68 | 4.3% | Turnos: calendario, gestión, disponibilidad |
| 4 | 64 | 4.0% | UI Components (shadcn/ui: button, dialog, input, etc.) |
| 5 | 64 | 4.0% | Configuración: tabs, suscripción, 2FA, API keys |
| 6 | 55 | 3.5% | Reportes: charts, export, datos |
| 7 | 53 | 3.3% | Webhooks + Twilio |
| 8 | 53 | 3.3% | Portal paciente + onboarding IA |
| 9 | 52 | 3.3% | Recetas: PDF, QR, verificación |

---

## ⭐ God Nodes (Mayor Centralidad)

Nodos con mayor grado (conexiones). Estos son los archivos/elementos más interconectados del sistema.

| # | Nodo | Grado | Tipo | Descripción |
|---|------|-------|------|-------------|
| 1 | `schema.ts` | 161 | code | Esquema Drizzle central (26+ tablas) |
| 2 | `db.ts` | 93 | code | Conexión PostgreSQL + drizzle instance |
| 3 | `Drizzle ORM` | 90 | concept | ORM usado por todo el sistema |
| 4 | `db` | 82 | code | Instancia db exportada |
| 5 | `auth.ts` | 77 | code | NextAuth v5 configuración completa |
| 6 | `paciente-detalle-client.tsx` | 58 | code | Ficha completa del paciente (el componente más complejo) |
| 7 | `button.tsx` | 58 | code | Componente UI más usado |
| 8 | `configuracion/page.tsx` | 56 | code | Página de configuración (8 tabs) |
| 9 | `Button` | 53 | ui | Componente Button (importado en ~50+ componentes) |
| 10 | `utils.ts` | 50 | code | Utilidades compartidas en todo el proyecto |

---

## 🏗 Patrones Arquitectónicos Identificados

### 1. Monorepo con Dashboard
- `dashboard/` es el monorepo interno con pnpm workspaces
- Dockerfile multi-stage con `pnpm deploy --filter=dashboard` para standalone output
- Puerto 3000. HTTP → Traefik → Next.js standalone

### 2. API Routes RESTful
- 91 archivos `route.ts` bajo `dashboard/app/api/`
- Patrón consistente: `apiHandler` + Zod + Drizzle queries
- Versionado: `/api/v1/` público, `/api/` protegido (NextAuth)

### 3. Multi-tenant (F1)
- `tenantId` en 22+ tablas
- `tenant-config.ts`, `tenant-name.ts` para resolución
- Sucursales vinculadas a tenant

### 4. Autenticación NextAuth v5
- JWT sessions + 2FA TOTP + backup codes
- Rate limiting 5/min login, 120/min API
- Account lockout: 5 intentos → 15 min bloqueo
- Reset/forgot password con token JWT

### 5. Integración n8n + Ollama
- 9 workflows activos con triggers webhook/cron
- Chat memory PostgreSQL para agentes IA
- Webhook secret entre dashboard ↔ n8n

### 6. UI: shadcn/ui + Tailwind
- 22 componentes UI (button, dialog, input, card, badge, tabs, etc.)
- Framer Motion para animaciones
- Dashboard layout: sidebar + header + scroll-area

### 7. Landing Page
- 12 secciones: hero, features, specialties, pricing, gallery, testimonials, CTA, FAQ, contact-form, footer, navbar, cookie-consent
- WhatsApp floating button
- Registro modal

---

## 📁 Mapeo de Archivos Principales

### API Routes (91 archivos)
```
api/
├── admin/ (7) — audit-logs, backups, features, n8n, privacidad, sucursales, tenants, users
├── auth/ (4) — nextauth, 2fa, change-password, forgot/reset-password, register
├── pacientes/ (9) — CRUD + certificados, consentimiento, baja, historial, notas-soap, exportar
├── portal/ (10) — auth, dashboard, historial, perfil, recetas, turnos
├── pagos/ (3) — MercadoPago: create-preference, status, webhook
├── turnos/ (2)
├── recetas/ (3)
├── conversaciones/ (3)
├── webhooks/ (2) — twilio, logs
├── waitlist/ (5)
├── v1/ (6) — API pública
├── health/ (2)
├── dashboard/stats
├── reportes/
├── onboarding/
├── plantillas/
└── misc: api-keys, credenciales, comunas, regiones, encuestas, equipo, horarios, medicos, 
          notificaciones, organization, servicios, setup, sucursales, upload/s
```

### Pages (50+ archivos)
```
app/
├── (auth)/ — login, registro, recuperar, reset-password
├── dashboard/
│   ├── page.tsx — KPIs
│   ├── pacientes/ — lista + detalle
│   ├── turnos/ — calendario Kanban
│   ├── recetas/ — CRUD recetas
│   ├── conversaciones/ — chat WhatsApp
│   ├── webhooks/ — logs Twilio
│   ├── reportes/ — 4 tabs gráficos
│   ├── encuestas/ — feedback
│   ├── onboarding/ — wizard IA
│   ├── configuracion/ — 8 tabs
│   ├── lista-espera/ — waitlist pipeline
│   ├── atencion/ — Kanban atención
│   ├── notificaciones/
│   ├── admin/ — auditoría, backups, n8n, sistema, sucursales, tenants
│   └── ayuda/
├── portal/ — portal paciente (auth y teléfono)
├── verificacion/ — certificados y recetas QR
├── privacidad/, terminos/
└── (public)/ — landing page
```

### Librerías Core (50+ archivos)
```
lib/
├── auth.ts — NextAuth v5
├── db.ts — Drizzle + PostgreSQL
├── utils.ts — utilidades
├── validations.ts — Zod schemas
├── planes.ts — feature gating
├── features.ts — feature flags
├── api-handler.ts — error handling
├── rate-limit.ts — rate limiting
├── account-lockout.ts — lockout
├── mfa.ts — 2FA TOTP
├── encryption.ts — AES-256-GCM
├── audit-log.ts — auditoría
├── portal-auth.ts — portal patient auth
├── mercadopago.ts — pagos
├── google-calendar(-sync).ts — GCal
├── services/ — 10 servicios (agenda, n8n, notificaciones, pacientes, 
│              privacidad, push, recetas, turnos, waitlist)
├── onboarding.ts — wizard IA
├── cie10-data.ts — ~900 códigos CIE-10
├── isapres.ts — 8 Isapres Chile
├── export-reporte-excel.ts
├── ics.ts — iCalendar
├── html-utils.ts
├── certificados.ts
├── data-store.ts — JSON fallback
└── tests/ — 8 archivos de test (Vitest)
```

### Drizzle (28 migraciones)
```
drizzle/
├── schema.ts — todas las tablas (26+)
└── migrations/
    ├── 0000 → 0024 — 25 migraciones
    └── meta/ — snapshots
```

### n8n Workflows (9 activos + 8 archive)
```
n8n-workflows/
├── current/ (9) — WF-01 a WF-09
└── archive/ (8) — legacy + designs
```

---

## 🔗 Hiperedges (Relaciones Multi-nodo)

| ID | Label | Nodos | Relación |
|----|-------|-------|----------|
| `auth_flow` | Flujo de Autenticación | NextAuth, JWT, 2FA TOTP, bcrypt, rate-limit, account-lockout, change/reset-password | form |
| `whatsapp_ecosystem` | Ecosistema WhatsApp | Twilio Webhook, WF-01 Agent, Ollama Mistral, PostgreSQL Chat Memory, Template Messages | participate_in |
| `chile_adaptation` | Adaptación Chile | Isapre/Fonasa, RUT, Regiones/Comunas, CLP, +56 formato, es-CL locale | implement |

---

## 🛠 Cómo Usar el Grafo

```bash
# Buscar concepto
graphify query "¿cómo funciona la autenticación?"

# Relación entre archivos
graphify path "auth.ts" "jwt"

# Explicar un nodo
graphify explain "schema_ts"

# Actualizar después de cambios
graphify update .

# Reconstruir desde cero
graphify . --force
```

---

## ⚠️ Limitaciones Conocidas

- La extracción AST en Windows requiere single-worker (multiprocessing spawn falla)
- Las imágenes (screenshots) son descritas por el LLM, no por visión computerizada real
- Algunos nodos pueden tener IDs no normalizados entre AST y semántico
- `.graphify_detect.json` está truncado — los paths completos están en el log de la sesión
