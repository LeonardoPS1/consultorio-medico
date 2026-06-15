<div align="center">
  <br/>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://med.aicorebots.com/aicoremed_dark_1200.svg">
    <img alt="AicoreMed" src="https://med.aicorebots.com/aicoremed_dark_1200.svg" width="400">
  </picture>
  <br/>
  <h3 align="center">Sistema de Gestión Inteligente para Consultorios Médicos</h3>
  <p align="center">
    Automatización · IA Local · Agenda Inteligente · Historia Clínica Digital
    <br/>
    <a href="https://med.aicorebots.com"><strong>🌐 med.aicorebots.com</strong></a>
    ·
    <a href="https://n8n.aicorebots.com"><strong>⚙️ n8n.aicorebots.com</strong></a>
    ·
    <a href="https://aicorebots.com"><strong>🤖 aicorebots.com</strong></a>
  </p>
  <br/>
</div>

---

<div align="center">

`TypeScript` `Next.js 14` `PostgreSQL` `Drizzle ORM` `n8n` `Ollama` `Mistral` `Twilio` `Docker` `MercadoPago` `LiveKit`

[![Estado](https://img.shields.io/badge/Estado-Producci%C3%B3n-10b981?style=flat-square)](https://med.aicorebots.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Swarm-2496ED?style=flat-square&logo=docker)](https://docker.com/)
[![Licencia](https://img.shields.io/badge/Licencia-Privada-64748b?style=flat-square)](LICENSE)

</div>

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Arquitectura](#-arquitectura)
- [Características](#-características)
- [Stack Tecnológico](#-stack-tecnológico)
- [Quick Start](#-quick-start)
- [Agentes IA (n8n)](#-agentes-ia-n8n)
- [Seguridad](#-seguridad)
- [Adaptación Chile](#-adaptación-chile)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Documentación](#-documentación)
- [Roadmap](#️-roadmap)
- [Licencia](#-licencia)

---

## 🏥 Descripción General

**AicoreMed** es un sistema de gestión integral para consultorios médicos desarrollado por [Aicore](https://aicorebots.com). Combina un dashboard web moderno con automatización inteligente vía **WhatsApp**, **IA local** con **Ollama + Mistral**, y una arquitectura robusta sobre **PostgreSQL** y **Docker Swarm**.

### ¿Qué lo hace diferente?

- **🤖 IA Local**: Toda la inteligencia artificial corre en tu propia infraestructura con Ollama. Sin dependencias externas, sin costos por API, sin riesgos de privacidad.
- **📱 WhatsApp Automation**: Los pacientes pueden agendar, cancelar y consultar turnos vía WhatsApp con atención automática por IA.
- **🏗️ Automatización n8n**: 9 workflows n8n que orquestan recordatorios, resúmenes diarios, sincronización con Google Calendar, backups encriptados y más.
- **📹 Telemedicina integrada**: Videoconsultas en vivo con LiveKit self-hosted. Link automático por WhatsApp al agendar turnos virtuales. Sin costos por minuto ni dependencias externas.
- **🇨🇱 Hecho para Chile**: Sistema de salud chileno completo (FONASA/Isapre), RUT, regiones/comunas, precios en CLP.
- **🔒 Seguridad first**: HMAC en webhooks, autenticación 2FA, rate limiting, anti-jailbreak en prompts IA, multi-tenant con tenantId en 22+ tablas.

---

## 🏗 Arquitectura

```
                    ┌─────────────────────────────────────────────────────┐
                    │                    PACIENTES                         │
                    │          WhatsApp · Email · Portal Web               │
                    └─────────────────────┬───────────────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────────────┐
                    │              CAPA DE COMUNICACIÓN                    │
                     │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  ┌──────────┐   │
                     │  │  Twilio  │  │   SMTP   │  │   Webhooks MP    │  │ LiveKit  │   │
                     │  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  └────┬─────┘   │
                     └───────┼──────────────┼─────────────────┼─────────────────┼─────────┘
                            │              │                 │
                    ┌───────▼──────────────▼─────────────────▼─────────────┐
                    │              CAPA DE AUTOMATIZACIÓN                   │
                    │  ┌──────────────────────────────────────────────┐    │
                    │  │              n8n (9 Workflows)               │    │
                    │  │  WF-01  WF-02  WF-03  WF-04  WF-05          │    │
                    │  │  WF-06  WF-07  WF-08  WF-09                 │    │
                    │  └───────────────────┬──────────────────────────┘    │
                    │  ┌───────────────────▼──────────────────────────┐    │
                    │  │         Ollama (Mistral - IA Local)          │    │
                    │  └───────────────────┬──────────────────────────┘    │
                    └──────────────────────┼──────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │              CAPA DE DATOS                          │
                    │  ┌──────────────────────────────────────────────┐    │
                    │  │         PostgreSQL 16 (26+ tablas)            │    │
                    │  │  pacientes · turnos · recetas · médicos      │    │
                    │  │  conversaciones · mensajes · historial       │    │
                    │  │  notas_soap · certificados · credenciales    │    │
                    │  └──────────────────────────────────────────────┘    │
                    └──────────────────────┬──────────────────────────────┘
                                           │
                    ┌──────────────────────▼──────────────────────────────┐
                    │          DASHBOARD WEB (Next.js 14)                  │
                    │  KPIs · Turnos · Pacientes · Recetas · Reportes    │
                    │  Configuración · Admin · Onboarding IA             │
                    │  Portal Paciente · Verificación QR                 │
                    └─────────────────────────────────────────────────────┘
```

### Flujo de Mensaje WhatsApp (Crítico)

```
Twilio → Webhook Dashboard (HMAC validation) →
  → Guarda en DB →
  → Forward a n8n WF-01 (x-webhook-secret) →
  → Busca paciente en DB →
  → Construye contexto (turnos, recetas, historial) →
  → AI Agent (Ollama Mistral + Postgres Chat Memory) →
  → Analiza intención → Ejecuta acción →
  → Twilio responde al paciente
```

---

## ✨ Características

### 📊 Dashboard
| Característica | Descripción |
|---------------|-------------|
| **KPIs en Tiempo Real** | 6 métricas con datos reales de DB (server components) |
| **Gestión de Turnos** | Vista Kanban + calendario + creación/edit/cancelación |
| **Kanban de Atención** | Arrastrá turnos entre estados, temporizador persistente por paciente |
| **Derivaciones** | Interconsultas entre especialistas con seguimiento y notificaciones |
| **Alertas Inteligentes** | Detección automática de cumpleaños, ausentismo recurrente y pacientes críticos |
| **Ficha del Paciente** | Historia clínica, SOAP, certificados, recetas, conversaciones |
| **Recetas Digitales** | Firma QR verificable, exportación PDF, autocomplete pacientes |
| **Notas SOAP** | Evolución clínica estructurada (Subjetivo/Objetivo/Análisis/Plan) con CIE-10 |
| **Certificados Médicos** | QR de verificación pública, hash SHA-256 |
| **Reportes** | 4 tabs: ingresos, turnos, pacientes, recetas. Exportación Excel/PDF |
| **Configuración** | 8 módulos: sucursales, horarios, médicos, servicios, plantillas |
| **Onboarding IA** | Asistente de configuración con 6 etapas y progreso persistente |
| **Telemedicina** | Videoconsultas con LiveKit, link automático por WhatsApp, sin descargas |
| **Feature Overrides** | Admin puede otorgar features de planes superiores a usuarios específicos |

### 🤖 Automatización WhatsApp
| Característica | Descripción |
|---------------|-------------|
| **Triaje IA** | AI Agent clasifica y responde intenciones automáticamente |
| **Recordatorios** | 24h y 1h antes del turno vía WhatsApp |
| **Confirmación** | Paciente confirma/cancela turno desde WhatsApp |
| **Agendamiento** | Crear turnos desde WhatsApp vía IA |
| **Recetas** | Solicitar renovación de recetas desde WhatsApp |

### 🔐 Seguridad
| Característica | Descripción |
|---------------|-------------|
| **Autenticación** | NextAuth v5 + JWT + 2FA TOTP |
| **Rate Limiting** | 5 intentos/min login · 30/min API |
| **Account Lockout** | 5 fallos → 15 min bloqueo |
| **HMAC Webhooks** | Twilio · MercadoPago · n8n |
| **Anti-Jailbreak** | Protección en prompts de IA |
| **Multi-Tenant** | tenantId en 22+ tablas |
| **Soft Delete** | En 8 tablas críticas |
| **Auditoría** | Logs de accesos con tenantId |
| **Datos Encriptados** | AES-256-GCM para credenciales en DB |

---

## 🥞 Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend** | Next.js 14 (App Router) | 14.2.x | Dashboard y portal web |
| **UI** | Tailwind CSS + shadcn/ui | — | Componentes y estilos |
| **Animaciones** | framer-motion | 12.x | Transiciones y micro-interacciones |
| **Gráficos** | Recharts | 2.x | KPIs y analytics |
| **ORM** | Drizzle ORM | 0.31.x | Queries tipadas y migraciones |
| **Base de Datos** | PostgreSQL 16 | 16 | Almacenamiento principal |
| **Automatización** | n8n | 2.19.x | Workflows de negocio |
| **IA Local** | Ollama + Mistral | latest | Asistente virtual y triaje |
| **Videollamada** | LiveKit (self-hosted) | 1.9.x | Telemedicina en vivo (WSS + TURN) |
| **WhatsApp** | Twilio API | 5.x | Mensajería con pacientes |
| **Pagos** | MercadoPago | 2.x | Suscripciones en CLP |
| **Calendario** | Google Calendar API | — | Sync de turnos |
| **Infraestructura** | Docker Swarm | — | Orquestación de contenedores |
| **Proxy** | Traefik + Let's Encrypt | — | HTTPS y routing |
| **Validación** | Zod | 3.x | Schemas de datos |
| **Autenticación** | NextAuth v5 (beta) | 5.0.0-beta.19 | JWT + 2FA |
| **JWT** | jose | 6.x | Tokens seguros |

---

## 🚀 Quick Start

### Prerrequisitos
```bash
# Node.js 18+ (recomendado 20 LTS)
node --version  # v20.x

# PostgreSQL 16
psql --version  # 16.x

# pnpm (recomendado) o npm
pnpm --version  # 9.x
```

### Instalación Local

```bash
# 1. Clonar repositorio
git clone https://github.com/LeonardoPS1/consultorio-medico.git
cd consultorio-medico

# 2. Instalar dependencias
cd dashboard && pnpm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Inicializar base de datos
npx drizzle-kit push:pg

# 5. Poblar datos iniciales
curl -X POST http://localhost:3000/api/setup \
  -H "X-Setup-Key: tu_setup_key"

# 6. Iniciar desarrollo
pnpm dev
```

### Producción (Docker)

```bash
# Construir imagen
pnpm build
docker build -t aicoremed-dashboard .

# O desplegar en Dokploy automáticamente
git push origin main  # Dokploy redeploya automáticamente
```

### Variables de Entorno Esenciales

```env
# Base de datos
DATABASE_URL=postgresql://user:pass@localhost:5432/consultorio_medico

# Autenticación
AUTH_SECRET=tu_secreto_jwt_aqui
AUTH_SETUP_KEY=tu_setup_key

# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=+18453735358

# Ollama (IA Local)
OLLAMA_BASE_URL=http://localhost:11434

# MercadoPago
MP_ACCESS_TOKEN=tu_access_token

# Hash para recetas
RECETA_HASH_SECRET=tu_secreto_para_qr

# URL pública
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> 📖 **Guía completa de instalación**: [`docs/SETUP.md`](docs/SETUP.md)

---

## 🤖 Agentes IA (n8n)

| # | Workflow | Trigger | Nodos | Ollama | Inteligencia |
|---|----------|---------|-------|--------|--------------|
| **01** | WhatsApp Inbound + Triaje IA | Webhook | 17 | ✅ Agent | Clasifica intenciones, gestiona turnos/respuestas |
| **02** | Gestión de Turnos | Webhook | 9 | ✅ 2 nodos | Extrae datos estructurados + responde amigable |
| **03** | Recordatorios Automáticos | Cron (c/hora) | 12 | ❌ | Envía recordatorios 24h y 1h antes |
| **04** | Correo Inteligente | IMAP (5 min) | 10 | ✅ Agent | Clasifica emails y decide acciones |
| **05** | Resumen Diario | Cron (7:00 AM) | 9 | ✅ 1 nodo | Genera resumen con datos de 4 fuentes |
| **06** | Recetas y Renovaciones | Webhook | 9 | ✅ 1 nodo | Analiza solicitudes, notifica médico |
| **07** | Backup Automático | Cron (3:00 AM) | 2 | ❌ | Backup cifrado con limpieza 30 días |
| **08** | Google Calendar Sync | Webhook | 8 | ❌ | Sincronización bidireccional de turnos |
| **09** | Anonimización | Cron (4:00 AM) | 5 | ❌ | Elimina datos post-retención (90 días) |

> 📖 **Documentación completa de workflows**: [`docs/workflows.md`](docs/workflows.md)

---

## 🇨🇱 Adaptación Chile

AicoreMed está diseñado específicamente para el mercado chileno:

- **🏥 Sistema de Salud**: FONASA · ISAPRE (catálogo completo de 8 Isapres) · Particular
- **📝 Idioma**: Español neutro chileno en toda la interfaz
- **💰 Precios**: Pesos chilenos (CLP) en todas las transacciones
- **🗺️ Regiones**: Selector completo con todas las regiones y comunas de Chile
- **🆔 RUT**: Soporte para RUT chileno
- **📱 Teléfono**: Formato chileno +569XXXXXXXX
- **⏰ Huso Horario**: UTC-4 (Santiago de Chile)

---

## 📁 Estructura del Proyecto

```
consultorio-medico/
│
├── dashboard/                          # ★ CORE: Next.js 14 App Router
│   ├── app/
│   │   ├── (login)/                    # Login, forgot/reset password
│   │   ├── api/                        # API Routes RESTful (30+ endpoints)
│   │   │   ├── auth/                   # Auth, 2FA, reset password
│   │   │   ├── pacientes/              # CRUD pacientes
│   │   │   ├── turnos/                 # CRUD turnos
│   │   │   ├── recetas/                # CRUD recetas
│   │   │   ├── webhooks/               # Twilio, MercadoPago, n8n
│   │   │   ├── pagos/                  # MercadoPago suscripciones
│   │   │   ├── v1/                     # Public API (con API keys)
│   │   │   └── privacidad/             # ARCO, anonimización
│   │   ├── dashboard/                  # ★ Panel protegido
│   │   │   ├── page.tsx                # KPIs reales (server)
│   │   │   ├── pacientes/              # Gestión de pacientes
│   │   │   ├── turnos/                 # Kanban + calendario
│   │   │   ├── recetas/                # Recetas + PDF
│   │   │   ├── conversaciones/         # Chat pacientes
│   │   │   ├── reportes/              # Analytics 4 tabs
│   │   │   ├── onboarding/            # Asistente IA
│   │   │   ├── configuracion/         # 8 módulos
│   │   │   └── admin/                  # Admin del sistema
│   │   ├── portal/                     # Portal del paciente
│   │   └── verificar-*/                # Verificación pública QR
│   │
│   ├── components/                     # Componentes UI
│   │   ├── ui/                         # shadcn/ui (20+ componentes)
│   │   └── modals/                     # Modals (turno, paciente, receta)
│   │
│   ├── lib/                            # Lógica compartida
│   │   ├── services/                   # Servicios (turnos, recetas, etc.)
│   │   ├── auth.ts                     # NextAuth config
│   │   ├── db.ts                       # Drizzle client
│   │   ├── features.ts                 # Feature gating por plan
│   │   ├── planes.ts                   # Planes y precios
│   │   └── validations.ts             # Schemas Zod
│   │
│   ├── drizzle/                        # Schema + migraciones
│   │   └── schema.ts                   # 26+ tablas Drizzle
│   │
│   └── public/                         # Assets, landing page, icons
│
├── livekit-server/                     # LiveKit self-hosted (compose + traefik config)
│   ├── docker-compose.yml               # LiveKit + Redis
│   ├── livekit.yaml                     # Config del servidor (keys, TURN, Ingress)
│   └── traefik-livekit.yml              # Routing Traefik para livekit.aicorebots.com
│
├── n8n-workflows/                      # ★ 9 workflows JSON
│   ├── current/                        # Activos (WF-01 a WF-09)
│   └── archive/                        # Versiones legacy
│
├── database/                           # Migraciones SQL históricas
├── scripts/                            # Deploy, backup, utilidades
├── docs/                               # Documentación completa
│
├── AGENTS.md                           # Referencia principal IA
├── README.md                           # Este archivo
└── docker-compose.yml                  # Desarrollo local
```

---

## 📚 Documentación

| Documento | Contenido |
|-----------|-----------|
| [`docs/SETUP.md`](docs/SETUP.md) | Guía completa de instalación y configuración |
| [`docs/architecture.md`](docs/architecture.md) | Arquitectura del sistema en detalle |
| [`docs/database.md`](docs/database.md) | Esquema de base de datos y relaciones |
| [`docs/security.md`](docs/security.md) | Seguridad, auditoría y buenas prácticas |
| [`docs/workflows.md`](docs/workflows.md) | Documentación de workflows n8n |
| [`AGENTS.md`](AGENTS.md) | Referencia de agentes IA para developers |

---

## 🗺️ Roadmap

### ✅ Completado
- [x] Dashboard con KPIs reales (6 métricas server components)
- [x] CRUD completo: pacientes, turnos, recetas, médicos
- [x] WhatsApp automation + triaje IA (WF-01)
- [x] Recordatorios automáticos 24h/1h (WF-03)
- [x] Recetas digitales con firma QR verificable
- [x] Certificados médicos con QR
- [x] Notas SOAP + buscador CIE-10 (~1031 códigos)
- [x] Reportes avanzados (4 tabs, exportación Excel/PDF)
- [x] Onboarding asistido por IA (6 etapas con progreso persistente)
- [x] MercadoPago suscripciones (5 planes)
- [x] Multi-tenant completo
- [x] Autenticación 2FA + reset/forgot password
- [x] Adaptación Chile (Isapre/Fonasa, CLP, regiones/comunas)
- [x] PWA instalable con modo offline
- [x] Auditoría de seguridad (0 críticos/0 altos/0 medios/0 bajos)
- [x] Derivaciones entre especialistas con seguimiento completo
- [x] Alertas inteligentes (cumpleaños, ausentismo recurrente, pacientes críticos)
- [x] Kanban de atención con temporizador persistente
- [x] Feature overrides por usuario (admin asigna features cross-plan)
- [x] Encuestas post-consulta con análisis de sentimiento ML
- [x] Rediseño Premium (animaciones, cards, popovers, KPIs count-up)
- [x] Telemedicina en vivo con LiveKit (videoconsultas, link WhatsApp, tokens seguros)

### 🟡 En Progreso / Próximo
- [ ] Tests de integración (Playwright)
- [ ] Correo Inteligente completo (WF-04 — requiere IMAP/SMTP)
- [ ] Portal del Paciente (turnos, recetas, historial)

### 🔮 Futuro
- [ ] Chat en vivo WebSocket
- [ ] WhatsApp Business API (producción)
- [ ] Dashboard de analytics avanzados
- [ ] Historial clínico digital expandido
- [ ] Editar pacientes desde la lista (no solo desde ficha)

---

## 🛡️ Seguridad

AicoreMed implementa **múltiples capas de seguridad** en todos los niveles:

```
┌─────────────────────────────────────────────┐
│          HTTPS (Traefik + Let's Encrypt)     │
├─────────────────────────────────────────────┤
│     NextAuth + JWT + 2FA TOTP + Lockout     │
├─────────────────────────────────────────────┤
│      Rate Limiting (5/min · 30/min)         │
├─────────────────────────────────────────────┤
│     HMAC Webhooks (Twilio · MP · n8n)       │
├─────────────────────────────────────────────┤
│   Zod Schemas (validación en todas las API)  │
├─────────────────────────────────────────────┤
│   Drizzle ORM (queries parametrizadas)       │
├─────────────────────────────────────────────┤
│   Anti-Jailbreak (prompts de IA)             │
├─────────────────────────────────────────────┤
│   Multi-Tenant (tenantId en 22+ tablas)     │
├─────────────────────────────────────────────┤
│   Soft Deletes · Auditoría · Encriptación   │
└─────────────────────────────────────────────┘
```

> 📖 **Documentación completa de seguridad**: [`docs/security.md`](docs/security.md)

---

## 📜 Licencia

**Proyecto Privado** — © 2026 [Aicore](https://aicorebots.com)

Todos los derechos reservados. Este software es propiedad de Aicore y no puede ser distribuido, modificado o utilizado sin autorización explícita.

---

<div align="center">
  <br/>
  <p>
    Desarrollado con ❤️ por <a href="https://aicorebots.com"><strong>Aicore</strong></a>
    <br/>
    <sub>Automatizaciones · Agentes de IA · Chatbots</sub>
  </p>
  <br/>
  <a href="https://aicorebots.com">🌐 aicorebots.com</a>
  ·
  <a href="mailto:contacto@aicorebots.com">📧 contacto@aicorebots.com</a>
  <br/><br/>
</div>
