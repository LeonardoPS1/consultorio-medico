# 🏥 Consultorio Médico - Sistema de Gestión Integral

## 📋 ¿Qué incluye?

### Base de Datos (PostgreSQL)
- 12 tablas + 5 vistas optimizadas
- 30+ índices para performance
- Triggers de auditoría automáticos
- Migraciones progresivas (001-006)

### Dashboard Web (Next.js 14 + shadcn/ui)
- Panel principal con KPIs en tiempo real
- Gestión de turnos (vista lista + calendario FullCalendar)
- Fichas de pacientes con historial clínico
- Bandeja unificada de conversaciones (WhatsApp + Email)
- Recetas y renovaciones
- Reportes y métricas con gráficos
- Configuración completa del sistema
- Modo oscuro / claro
- Autenticación segura (NextAuth.js + bcrypt)

### Automatizaciones (n8n)
| # | Workflow | Trigger | Función |
|---|----------|---------|---------|
| 01 | WhatsApp Inbound + Triaje | Webhook Twilio | Recibe, clasifica con IA, enruta y detecta urgencias |
| 02 | Gestión de Turnos | Webhook Twilio | Agenda turnos, verifica disponibilidad, Google Calendar |
| 03 | Recordatorios | Cron (cada hora) | Envía recordatorios 24h y 1h antes + pide confirmación |
| 04 | Correo Inteligente | IMAP | Clasifica emails con IA, urgencias notifica al médico |
| 05 | Resumen Diario | Cron (7:00 AM) | Envía resumen de turnos, pacientes nuevos y pendientes |
| 06 | Recetas | Webhook Twilio | Renovación automática o deriva al médico |

### IA Local (Ollama + Mistral)
- Clasificación de intenciones
- Extracción de entidades (fechas, medicamentos, etc.)
- Generación de respuestas naturales
- Triaje de urgencias
- Redacción de borradores de email

---

## 🚀 Instalación Paso a Paso

### 1. Base de Datos

```bash
# Conectate a PostgreSQL y ejecutá las migraciones en orden
psql -U postgres -d consultorio_medico

# O directamente:
cat database/migrations/001_core.sql | psql -U postgres -d consultorio_medico
cat database/migrations/002_turnos.sql | psql -U postgres -d consultorio_medico
cat database/migrations/003_conversaciones.sql | psql -U postgres -d consultorio_medico
cat database/migrations/004_historial_recetas.sql | psql -U postgres -d consultorio_medico
cat database/migrations/005_logs.sql | psql -U postgres -d consultorio_medico
cat database/migrations/006_indices.sql | psql -U postgres -d consultorio_medico
```

### 2. Dashboard Web

```bash
cd dashboard

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local

# Editar .env.local con tus datos
nano .env.local

# Generar schema de Drizzle
npm run db:generate

# Push del schema a la DB
npm run db:push

# Crear primer usuario admin (ejecutar en psql)
psql -U postgres -d consultorio_medico -c "
INSERT INTO usuarios (email, password_hash, nombre, rol)
VALUES ('admin@consultorio.com', '\$2b\$10\$...hash_de_bcrypt...', 'Admin', 'admin');
"

# Iniciar en desarrollo
npm run dev

# O build para producción
npm run build && npm start
```

### 3. Importar Workflows en n8n

```bash
# Los workflows están en la carpeta n8n-workflows/
# Cada archivo .json se importa desde la UI de n8n:
# n8n UI → Workflows → Add Workflow → Import from File

# Orden recomendado:
# 1. workflow-01-whatsapp-inbound.json
# 2. workflow-02-gestion-turnos.json
# 3. workflow-03-recordatorios.json
# 4. workflow-04-correo-inteligente.json
# 5. workflow-05-resumen-diario.json
# 6. workflow-06-recetas.json

# Configurar los webhooks en Twilio:
# Consola Twilio → Messaging → Services → Webhook URL
# Apuntar a: https://n8n.tudominio.com/webhook/whatsapp-inbound
```

### 4. Configurar Twilio

```env
# En el .env.local del dashboard y en las credenciales de n8n:
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 5. Verificar Ollama

```bash
# En la VPS, verificar que Ollama esté corriendo
curl http://localhost:11434/api/tags

# Si no está el modelo mistral:
ollama pull mistral

# Probar inferencia:
curl -X POST http://localhost:11434/api/generate \
  -d '{"model": "mistral", "prompt": "Decime hola", "stream": false}'
```

---

## 🔧 Arquitectura del Proyecto

```
consultorio-medico/
├── database/
│   └── migrations/
│       ├── 001_core.sql              # Usuarios, médicos, pacientes
│       ├── 002_turnos.sql             # Turnos, servicios, bloqueos
│       ├── 003_conversaciones.sql     # Conversaciones, mensajes, plantillas
│       ├── 004_historial_recetas.sql  # Historial médico, recetas, facturación
│       ├── 005_logs.sql               # Logs de workflows, errores, auditoría
│       └── 006_indices.sql            # Índices y vistas optimizadas
│
├── dashboard/
│   ├── app/
│   │   ├── page.tsx                   # Login
│   │   ├── layout.tsx                 # Layout raíz
│   │   ├── globals.css                # Estilos globales + variables CSS
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Layout con sidebar + header
│   │   │   ├── page.tsx               # Dashboard principal (KPIs)
│   │   │   ├── turnos/page.tsx        # Gestión de turnos
│   │   │   ├── pacientes/page.tsx     # Listado de pacientes
│   │   │   ├── conversaciones/page.tsx # Bandeja de chats
│   │   │   ├── recetas/page.tsx       # Recetas activas/vencidas
│   │   │   ├── reportes/page.tsx      # Métricas y estadísticas
│   │   │   └── configuracion/page.tsx # Configuración del sistema
│   │   └── api/                       # API Routes
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── layout/                    # Sidebar, Header
│   │   └── providers.tsx              # Providers (Auth, Query, Theme)
│   ├── lib/
│   │   ├── auth.ts                    # NextAuth configuración
│   │   ├── db.ts                      # Conexión PostgreSQL + Drizzle
│   │   └── utils.ts                   # Utilidades (formatos, fechas)
│   ├── drizzle/
│   │   └── schema.ts                  # Schema ORM completo
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── n8n-workflows/
    ├── workflow-01-whatsapp-inbound.json   # Recepción + Triaje
    ├── workflow-02-gestion-turnos.json      # Turnos + Google Calendar
    ├── workflow-03-recordatorios.json       # Recordatorios automáticos
    ├── workflow-04-correo-inteligente.json   # Email con IA
    ├── workflow-05-resumen-diario.json      # Resumen para el médico
    └── workflow-06-recetas.json             # Recetas y renovaciones
```

---

## 📊 Funcionalidades Clave

### 🔐 Seguridad
- ✅ Datos **100% locales** en la VPS (Ollama + PostgreSQL)
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Sesiones JWT con expiración
- ✅ Soft delete en todas las tablas
- ✅ Logs de auditoría de acciones

### 🤖 IA (Ollama)
- ✅ Clasificación de intenciones en tiempo real
- ✅ Detección de urgencias (triaje automático)
- ✅ Extracción de datos de lenguaje natural
- ✅ Generación de respuestas en español argentino
- ✅ Borradores de email inteligentes

### 📱 Multi-canal
- ✅ WhatsApp (Twilio)
- ✅ Email (IMAP/SMTP)
- ✅ Google Calendar (sync bidireccional)
- ✅ Dashboard web unificado

### 📈 Dashboard
- ✅ KPIs en tiempo real
- ✅ Vista calendario + lista de turnos
- ✅ Bandeja de conversaciones unificada
- ✅ Reportes con gráficos
- ✅ Modo oscuro / claro
- ✅ Responsive (mobile-friendly)
