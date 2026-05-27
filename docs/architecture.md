# 🏗️ Arquitectura del Sistema

## Visión General

El sistema integra cinco capas principales que trabajan juntas para automatizar la comunicación y gestión de un consultorio médico:

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIOS (Pacientes)                      │
│         WhatsApp ─── Twilio ─── Email ─── Web               │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              CAPA DE SEGURIDAD (Middleware)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Headers │ │   Rate   │ │ 2FA/MFA │ │  Cookie  │      │
│  │  HTTP    │ │ Limiting │ │  Login   │ │  Verify  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
│  │  Twilio  │ │ Auditoría│ │ Password │                    │
│  │ Signature│ │ Accesos  │ │ Lockout  │                    │
│  └──────────┘ └──────────┘ └──────────┘                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────────────────┐        │
│  │  Forgot/ │ │  Token   │ │  Feature Gating     │        │
│  │  Reset   │ │  Expiry  │ │  (Plan-based)       │        │
│  │  Password│ │   (1h)   │ │                     │        │
│  └──────────┘ └──────────┘ └─────────────────────┘        │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   n8n (Automatización)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  AI Agent │ │ Gestión  │ │ Recorda- │ │ Correo   │      │
│  │ WhatsApp  │ │ Turnos   │ │ torios   │ │ Intelig. │      │
│  │ (WF-01)   │ │ (WF-02)  │ │ (WF-03)  │ │ (WF-04)  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐                                  │
│  │ Resumen  │ │ Recetas  │                                  │
│  │ (WF-05)  │ │ (WF-06)  │                                  │
│  └──────────┘ └──────────┘                                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│              IA Local (Ollama + Mistral)                     │
│  • Clasificación de intenciones • Generación de respuestas  │
│  • Extracción de entidades    • Triaje de urgencias         │
│  • Redacción de borradores    • Memoria conversacional      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│               PostgreSQL (Base de Datos)                     │
│  pacientes │ turnos │ conversaciones │ mensajes             │
│  medicos   │ recetas │ historial │ logs │ usuarios          │
│  suscripciones │ credenciales │ auditoria                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│            Dashboard Web (Next.js 14 + shadcn/ui)           │
│  KPIs │ Turnos │ Pacientes │ Conversaciones │ Recetas       │
│  Reportes │ Configuración │ FullCalendar                    │
│  Perfil │ Suscripción │ Credenciales │ Equipo               │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### 1. Mensaje de WhatsApp entrante

```
Paciente envía WhatsApp
        │
        ▼
Twilio Webhook ──────────────────────────────┐
        │                                     │
        ▼                                     │
n8n WF-01: AI Agent WhatsApp                  │
  │                                           │
  ├─ Busca paciente en DB por teléfono        │
  ├─ Carga turnos próximos y recetas activas  │
  ├─ Genera contexto dinámico para el prompt  │
  ├─ AI Agent (Ollama) clasifica y responde   │
  ├─ Parsea acciones estructuradas            │
  ├─ Si es acción → ejecuta (crear/cancelar   │
  │  turno, receta, urgencia)                 │
  └─ Responde al paciente por Twilio          │
        │                                     │
        ▼                                     │
Registro en PostgreSQL (mensajes, logs)       │
        │                                     │
        ▼                                     │
Dashboard ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ┘
  (vía API / Base de datos)
```

### 2. Correo electrónico entrante

```
Email entrante
        │
        ▼
IMAP (n8n WF-04)
        │
        ▼
AI Agent (Ollama)
  ├─ Lee contenido del email
  ├─ Clasifica: urgente / spam / responder
  └─ Decide acción
        │
        ├─ URGENTE → Notifica al médico por WhatsApp (Twilio)
        ├─ SPAM    → Mueve a carpeta de spam
        └─ Normal  → Redacta borrador de respuesta y lo guarda
```

### 3. Recordatorios automáticos

```
Cron (cada hora)
        │
        ▼
n8n WF-03: Recordatorios
  ├─ Busca turnos pendientes/confirmados
  ├─ 24h antes → envía recordatorio
  ├─ 1h antes  → envía recordatorio
  ├─ Pide confirmación al paciente
  └─ Si no confirma → notifica al médico
```

### 4. Dashboard Web

```
Next.js 14 (App Router)
        │
        ├─ Páginas públicas: Login, Recuperar contraseña
        │
        └─ Páginas protegidas (dashboard/):
            ├─ Panel principal (KPIs)
            ├─ Turnos (lista + FullCalendar)
            ├─ Pacientes (CRUD + historial)
            ├─ Conversaciones (bandeja unificada)
            ├─ Recetas (activas + vencidas)
            ├─ Reportes (gráficos + métricas)
            └─ Configuración (perfil, suscripción, integraciones, equipo)
                │
                ▼
        API Routes (app/api/)
                │
                ▼
        Data Store (capa dual)
            ├─ PostgreSQL (producción) vía Drizzle ORM
            └─ JSON local (desarrollo) con seed data
```

### 5. Recuperación de Contraseña

```
Usuario hace clic en "Olvidé mi contraseña"
        │
        ▼
Formulario /recuperar
  ├─ Ingresa email
  ├─ POST /api/auth/forgot-password
  │     ├─ Genera token criptográfico (crypto.randomBytes)
  │     ├─ Guarda token + expiry (1 hora) en BD
  │     └─ Modo dev: devuelve link en JSON
  │     └─ Producción: enviar por email (SMTP pendiente)
  │
  ▼
Usuario recibe link → /reset-password?token=...
        │
        ▼
Formulario /reset-password
  ├─ Ingresa nueva contraseña + confirmación
  ├─ POST /api/auth/reset-password
  │     ├─ Valida token y expiry
  │     ├─ Hashea nueva contraseña (bcrypt)
  │     ├─ Actualiza en BD
  │     └─ Limpia token
  │
  ▼
Redirect a /login

También desde Configuración → Perfil:
  ├─ Formulario "Cambiar contraseña"
  ├─ POST /api/auth/change-password
  │     ├─ Requiere contraseña actual
  │     ├─ Valida nueva contraseña (8+ chars)
  │     └─ Actualiza en BD
```

### 6. Multi-Sucursal Scoping

```
Usuario selecciona sucursal en el Header
        │
        ▼
SucursalContext (lib/sucursal-context.tsx)
  ├─ Persiste en localStorage + cookie (sucursal_activa)
  ├─ Emite evento 'sucursal-cambiada' para re-fetcheo
  └─ Disponible via useSucursal() hook en toda la app
        │
        ▼
Server Components leen cookie sucursal_activa
        │
        ▼
Client Components pasan sucursalId del context a APIs
        │
        ▼
Service Layer (lib/services/*.ts)
  ├─ turnosService.list(sucursalId?) → filtra por sucursal
  ├─ pacientesService.list(sucursalId?) → filtra por sucursal
  └─ dashboard/stats → KPIs scoped a sucursal
        │
        ▼
API Routes (app/api/*)
  ├─ /api/turnos?sucursalId=
  ├─ /api/pacientes?sucursalId=
  ├─ /api/medicos?sucursalId=
  └─ /api/dashboard/stats?sucursalId=
```

### 7. Feature Gating por Plan

```
Usuario accede al dashboard
        │
        ▼
Sidebar renderiza items según plan del usuario
  ├─ Si el usuario TIENE acceso al feature → link habilitado
  └─ Si el usuario NO tiene acceso:
        ├─ Item visible con candado 🔒
        ├─ Badge con nombre del plan requerido
        └─ Click → redirige a Configuración → Suscripción

Acceso directo por URL (protegido por GatedContent):
  ├─ Layout verifica plan vs ruta
  ├─ Si no tiene permiso → redirect al Panel Principal
  └─ Si tiene permiso → renderiza el contenido

Planes:
  free (0 USD), starter ($49/mes), professional ($99/mes),
  premium ($199/mes), enterprise ($499/mes)
```

## Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Frontend** | Next.js (App Router) | 14.2+ |
| **UI** | shadcn/ui + Radix UI + Tailwind CSS | - |
| **Calendario** | FullCalendar | 6.1+ |
| **Gráficos** | Recharts | 2.12+ |
| **ORM** | Drizzle ORM | 0.31+ |
| **Base de Datos** | PostgreSQL | 15+ |
| **Automatización** | n8n (self-hosted) | Última |
| **IA Local** | Ollama + Mistral | - |
| **Mensajería** | Twilio (WhatsApp, SMS) | - |
| **Autenticación** | NextAuth v5 + bcrypt | - |
| **Pagos** | MercadoPago SDK | 2.12+ |
| **Despliegue** | Dokploy (VPS) | - |

## Decisiones de Arquitectura

### ¿Por qué AI Agents en lugar de múltiples llamadas HTTP a Ollama?

Los workflows originales usaban nodos HTTP Request para llamar a Ollama, lo que implicaba:
- 2-3 llamadas separadas por workflow (clasificar, responder, extraer)
- Sin memoria entre llamadas
- Parseo manual de respuestas JSON

Con AI Agents (`@n8n/n8n-nodes-langchain.agent`):
- **Una sola ejecución** del agente que clasifica, razona y genera respuesta
- **Memoria conversacional** nativa (Postgres Chat Memory)
- **System prompt dinámico** con datos reales del paciente
- **Estructura de salida** controlada via instrucciones en el prompt

### ¿Por qué pre-carga de datos en vez de toolCode/toolWorkflow?

El nodo `code` de n8n corre en un sandbox que no tiene acceso directo a PostgreSQL. En lugar de usar `toolCode` o `toolWorkflow` (que añaden complejidad y latencia), los AI Agents reciben **todo el contexto necesario pre-cargado** en el prompt:

```
En vez de:  Agente → toolCode → query DB
Hacemos:    PG query → Code (genera prompt con datos) → Agente
```

### ¿Por qué almacenamiento dual (PostgreSQL + JSON)?

Para desarrollo local sin necesidad de PostgreSQL:
- **Producción**: PostgreSQL vía Drizzle ORM
- **Desarrollo**: Archivos JSON en `.data/` con seed data automática
- La detección es automática: si PostgreSQL no responde, cae a JSON

### ¿Por qué feature gating con single source of truth?

Los planes de suscripción están centralizados en `lib/planes.ts`:

```
lib/planes.ts (canon) ─┬→ lib/features.ts (gating)
                       ├→ lib/mercadopago.ts (pagos en CLP)
                       ├→ landing page / planes
                       └→ Config → Suscripción (UI)
```

Ventajas:
- Cambiar un precio en un solo archivo actualiza todo el sistema
- Los features requeridos por plan están tipados y centralizados
- El sidebar, las rutas y los tabs se bloquean consistentemente

### ¿Por qué token de recuperación en tabla usuarios?

En lugar de una tabla separada, se agregaron columnas `reset_token` y `reset_token_expires` directamente en `usuarios`:
- Una consulta menos (no hay JOIN)
- El token se limpia automáticamente al usarlo
- Expira a la hora por seguridad

## Seguridad

- Datos **100% locales** en VPS propia (nada pasa por nubes externas)
- Contraseñas hasheadas con bcrypt
- Sesiones JWT con expiración (30 min, renovables)
- 2FA / MFA con TOTP
- Rate limiting: 5 intentos/min login, 30/min API
- Bloqueo de cuenta tras 5 intentos fallidos
- Auto-logout por inactividad
- Password validator (8+ chars, mayúscula, número, símbolo)
- Soft delete en todas las tablas (nada se borra físicamente)
- Logs de auditoría de todas las acciones (multi-tenant con tenantId)
- Logout tracking via events.signOut()
- Cleanup de auditoría (API DELETE con antigüedad o total)
- Verificación de firmas Twilio
- Sanitización de prompts IA anti-jailbreak
- Consentimiento explícito para comunicación por WhatsApp/email
- Variables de entorno para todas las credenciales
- Tokens de recuperación con expiración (1 hora) y un solo uso
