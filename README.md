# AicoreMed — Sistema de Gestión para Consultorios Médicos

> Sistema integral para la gestión de consultorios médicos en Chile.
> Automatización con WhatsApp, IA local, agenda inteligente y más.

## Características Principales

- **Agenda Inteligente**: Gestión de turnos con confirmación por WhatsApp
- **WhatsApp Business**: Comunicación automatizada con pacientes (triaje IA, recordatorios)
- **IA Local** con Ollama + Mistral: Asistente virtual para configuración y triaje
- **Historia Clínica Digital**: Notas SOAP, CIE-10, recetas digitales con firma QR
- **Isapre y Fonasa**: Sistema de salud chileno completo con catálogo de Isapres
- **Reportes y Analytics**: KPIs en tiempo real, exportación Excel/PDF
- **PWA**: App instalable con modo offline
- **Multi-tenant**: Soporte para múltiples sucursales y profesionales

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes + Drizzle ORM |
| Base de Datos | PostgreSQL 16 |
| Autenticación | NextAuth v5 + JWT + 2FA TOTP |
| Automatización | n8n (9 workflows activos) |
| IA Local | Ollama + Mistral |
| Mensajería | Twilio WhatsApp API |
| Pagos | MercadoPago (CLP) |
| Infraestructura | Docker Swarm + Dokploy |

## Funcionalidades por Plan

| Funcionalidad | Free | Starter | Professional | Premium | Enterprise |
|---------------|------|---------|--------------|---------|------------|
| Panel Principal | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gestión de Turnos | ❌ | ✅ | ✅ | ✅ | ✅ |
| Pacientes Ilimitados | ❌ | ✅ | ✅ | ✅ | ✅ |
| WhatsApp + Recordatorios | ❌ | ✅ | ✅ | ✅ | ✅ |
| Recetas Digitales QR | ❌ | ✅ | ✅ | ✅ | ✅ |
| Notas SOAP + CIE-10 | ❌ | ✅ | ✅ | ✅ | ✅ |
| Asistente IA | ❌ | ❌ | ✅ | ✅ | ✅ |
| Certificados QR | ❌ | ❌ | ✅ | ✅ | ✅ |
| Reportes Avanzados | ❌ | ❌ | ✅ | ✅ | ✅ |
| 2FA / Seguridad | ❌ | ❌ | ✅ | ✅ | ✅ |
| Integraciones (GCal, n8n) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Multi-sucursal | ❌ | ❌ | ❌ | ❌ | ✅ |

## Adaptación Chile

- **Sistema de Salud**: FONASA, ISAPRE (con catálogo completo), Particular y Otro
- **Idioma**: Español neutro chileno en toda la interfaz
- **Precios**: En pesos chilenos (CLP) y USD
- **Regiones y Comunas**: Selectores con todas las regiones y comunas de Chile
- **RUT**: Soporte para RUT chileno
- **Teléfono**: Formato chileno (+569XXXXXXXX)

## Comenzar

### Prerrequisitos
- Node.js 18+
- PostgreSQL 16
- Docker (opcional, para desarrollo)

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/LeonardoPS1/consultorio-medico.git
cd consultorio-medico

# Instalar dependencias
cd dashboard && npm install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar migraciones de base de datos
# Ver database/README.md o aplicar migraciones manualmente

# Iniciar desarrollo
npm run dev
```

## Estructura del Proyecto

```
consultorio-medico/
├── dashboard/                  # Next.js 14 App Router (core)
│   ├── app/                    # Rutas y páginas
│   │   ├── api/                # API Routes RESTful
│   │   ├── dashboard/          # Panel protegido
│   │   ├── login/              # Autenticación
│   │   ├── portal/             # Portal del paciente
│   │   └── verificar-*/        # Verificación pública QR
│   ├── components/             # Componentes UI (shadcn/ui + Radix)
│   ├── lib/                    # Lógica compartida (servicios, auth, features)
│   ├── drizzle/                # Schema Drizzle + migraciones SQL
│   └── public/                 # Landing page + assets
├── n8n-workflows/              # 9 workflows JSON activos
├── database/                   # Migraciones históricas
├── scripts/                    # Backup, deploy, utilidades
├── docs/                       # Documentación adicional
└── AGENTS.md                   # Referencia principal del sistema
```

## Seguridad

- Autenticación JWT + 2FA TOTP
- Rate limiting y lockout de cuentas
- HMAC-SHA256 para webhooks (Twilio, MercadoPago)
- Multi-tenant con tenantId en 22+ tablas
- Soft delete en tablas críticas
- Auditoría de accesos
- Datos encriptados AES-256-GCM
- Anti-jailbreak en prompts de IA

## Agentes IA (n8n)

| # | Workflow | Trigger | Función |
|---|----------|---------|---------|
| 01 | WhatsApp Inbound + Triaje IA | Webhook | Atención automática de pacientes |
| 02 | Gestión de Turnos | Webhook | Creación y disponibilidad |
| 03 | Recordatorios Automáticos | Cron | Recordatorios 24h y 1h |
| 04 | Correo Inteligente | IMAP | Clasificación de emails |
| 05 | Resumen Diario | Cron | Resumen para el médico |
| 06 | Recetas y Renovaciones | Webhook | Gestión de recetas |
| 07 | Backup Automático | Cron | Backup cifrado diario |
| 08 | Google Calendar Sync | Webhook | Sincronización bidireccional |
| 09 | Anonimización Post-Retención | Cron | Cumplimiento normativo |

## Licencia

Proyecto privado — Aicore (aicorebots.com)

## Contacto

- **Web**: https://aicorebots.com
- **Dashboard**: https://med.aicorebots.com
- **n8n**: https://n8n.aicorebots.com
