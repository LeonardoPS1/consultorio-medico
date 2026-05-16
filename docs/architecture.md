# 🏗️ Arquitectura del Sistema

## Visión General

El sistema integra cuatro capas principales que trabajan juntas para automatizar la comunicación y gestión de un consultorio médico:

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIOS (Pacientes)                      │
│         WhatsApp ─── Twilio ─── Email ─── Web               │
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
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│            Dashboard Web (Next.js 14 + shadcn/ui)           │
│  KPIs │ Turnos │ Pacientes │ Conversaciones │ Recetas       │
│  Reportes │ Configuración │ FullCalendar                    │
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
        ├─ Páginas públicas: Login
        │
        └─ Páginas protegidas (dashboard/):
            ├─ Panel principal (KPIs)
            ├─ Turnos (lista + FullCalendar)
            ├─ Pacientes (CRUD + historial)
            ├─ Conversaciones (bandeja unificada)
            ├─ Recetas (activas + vencidas)
            ├─ Reportes (gráficos + métricas)
            └─ Configuración (integraciones, equipo, plantillas)
                │
                ▼
        API Routes (app/api/)
                │
                ▼
        Data Store (capa dual)
            ├─ PostgreSQL (producción) vía Drizzle ORM
            └─ JSON local (desarrollo) con seed data
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

## Seguridad

- Datos **100% locales** en VPS propia (nada pasa por nubes externas)
- Contraseñas hasheadas con bcrypt
- Sesiones JWT con expiración
- Soft delete en todas las tablas (nada se borra físicamente)
- Logs de auditoría de todas las acciones
- Consentimiento explícito para comunicación por WhatsApp/email
- Variables de entorno para todas las credenciales
