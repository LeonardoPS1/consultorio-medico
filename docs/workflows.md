# 🔄 Workflows de n8n

Este documento describe los 6 workflows de automatización que gestionan la comunicación y operaciones del consultorio.

## Estructura de Archivos

```
n8n-workflows/
├── current/                          # Workflows activos en producción
│   ├── workflow-01-agent.json        # AI Agent WhatsApp (Webhook)
│   ├── workflow-02-gestion-turnos.json  # Gestión de Turnos (Webhook)
│   ├── workflow-03-recordatorios.json   # Recordatorios (Cron)
│   ├── workflow-04-agent.json        # AI Agent Correo (IMAP)
│   ├── workflow-05-resumen-diario.json  # Resumen Diario (Cron)
│   └── workflow-06-recetas.json      # Recetas (Webhook)
│
└── archive/                          # Versiones anteriores
    ├── workflow-01-whatsapp-inbound.json   # WF1 versión legacy
    ├── workflow-04-correo-inteligente.json # WF4 versión legacy
    └── designs/                       # Diseños originales de referencia
```

## Workflow 01: AI Agent WhatsApp

**Trigger:** Webhook (Twilio) → `POST /webhook/consultorio-inbound`

**Propósito:** Recibe mensajes de WhatsApp, los procesa con IA y responde automáticamente, pudiendo ejecutar acciones como crear/cancelar turnos o recetas.

### Nodos (17 total)

```
Webhook ── IF ── Set ── PG (paciente) ── PG (turnos) ── PG (recetas)
    │
    └── Code (generar contexto) ── AI Agent ── Set ── Code (parsear)
                                                          │
                                                    ┌─────┴─────┐
                                                    │            │
                                               Twilio        IF (acción?)
                                                                │
                                                     ┌──────────┴──────────┐
                                                     │                     │
                                              PG (logs)             [fin del flujo]
```

### Flujo Detallado

1. **Webhook** → Recibe mensaje entrante de Twilio (Body: mensaje, From: teléfono)
2. **IF** → Verifica que tenga número de teléfono válido
3. **Set** → Estructura los datos del mensaje
4. **PostgreSQL (paciente)** → Busca paciente por teléfono (expression-based query)
5. **PostgreSQL (turnos)** → Busca turnos próximos del paciente
6. **PostgreSQL (recetas)** → Busca recetas activas del paciente
7. **Code (generar contexto)** → Construye system prompt dinámico:
   ```
   Nombre: Juan Pérez
   Turnos próximos: Mañana 10:00 (pendiente)
   Recetas activas: Losartán 50mg (vence 15/06)
   ```
8. **AI Agent** (Ollama Chat Model + Postgres Chat Memory):
   - Modelo: `mistral` via `http://ollama:11434/v1`
   - Memoria: Postgres Chat Memory (sessionKey = teléfono)
   - System prompt: contexto del paciente + instrucciones de acciones estructuradas
9. **Set** → Extrae el output del agente
10. **Code (parsear)** → Detecta acciones estructuradas en la respuesta:
    ```
    ###ACCION###
    tipo: crear_turno
    fecha: 2026-05-20
    hora: 10:00
    motivo: Control
    ###FIN###
    ```
11. **Twilio** → Envía la respuesta al paciente
12. **IF (acción?)** → Si hay acción estructurada, ejecuta el sub-flujo correspondiente:
    - `crear_turno` → Inserta en tabla turnos
    - `cancelar_turno` → Actualiza estado del turno
    - `receta` → Genera receta
    - `urgencia` → Notifica al médico
13. **PostgreSQL (logs)** → Registra la ejecución

### Intenciones Detectadas

| Intención | Acción |
|-----------|--------|
| `saludo` | Responde con bienvenida |
| `turno_nuevo` | Agenda turno, verifica disponibilidad |
| `turno_cancelar` | Cancela y ofrece reprogramación |
| `turno_confirmar` | Confirma asistencia |
| `receta` | Renueva o solicita autorización |
| `urgencia` | Alerta al médico inmediatamente |
| `consulta` | Responde con información |
| `reclamo` | Deriva al médico |
| `informacion` | Da información del consultorio |

---

## Workflow 02: Gestión de Turnos

**Trigger:** Webhook

**Propósito:** Gestiona la agenda: crea turnos, verifica disponibilidad, sincroniza con Google Calendar.

### Nodos

```
Webhook ── PG (verificar disponibilidad) ── IF (disponible?)
    │                                              │
    │                                         [No disponible]
    │                                              │
    │                                         Twilio (rechazo)
    │
    ├── PG (crear turno) ── Google Calendar ── Twilio (confirmación)
    └── PG (registrar log)
```

### Funcionalidades

- Verifica superposición de horarios
- Considera horarios del médico y bloqueos de agenda
- Crea evento en Google Calendar
- Envía confirmación al paciente
- Registra en log de auditoría

---

## Workflow 03: Recordatorios

**Trigger:** Cron (cada hora)

**Propósito:** Envía recordatorios de turnos programados y pide confirmación de asistencia.

### Nodos

```
Cron ── PG (turnos próximos) ── IF (24h antes) ── Twilio (recordatorio)
                                    │
                                    └── IF (1h antes) ── Twilio (recordatorio)
                                            │
                                            └── PG (marcar enviado)
```

### Horarios de Recordatorio

| Momento | Mensaje |
|---------|---------|
| **24h antes** | "Recordatorio: tenés turno mañana a las 10:00. ¿Confirmás asistencia?" |
| **1h antes** | "Tu turno es en 1 hora con el Dr. Rodríguez. Te esperamos!" |
| **No confirma** | Notifica al médico vía WhatsApp |

### Estados Post-Recordatorio

- `confirmó` → Marca turno como confirmado
- `canceló` → Libera el turno, busca reprogramación
- `no respondió` → Notifica al médico

---

## Workflow 04: AI Agent Correo Inteligente

**Trigger:** IMAP (cada 5 minutos)

**Propósito:** Lee emails entrantes, los clasifica con IA, y actúa según su contenido.

### Nodos (12 total)

```
IMAP ── Set (extraer email) ── AI Agent ── Set ── Code (parsear)
                                                   │
                                              ┌────┴────┐
                                              │         │
                                         Switch      Twilio (URGENTE)
                                           │
                                    ┌──────┼──────────┐
                                    │      │          │
                               URGENTE   SPAM    BORRADOR
                                    │      │          │
                               Twilio   Mover a    Guardar
                               (notificar) Spam    Borrador
                                    │      │          │
                                    └──────┴──────────┘
                                              │
                                         PG (logs x2)
```

### Clasificaciones

| Clasificación | Acción |
|---------------|--------|
| `URGENTE` | Notifica al médico por WhatsApp + Twilio |
| `SPAM` | Mueve a carpeta de spam |
| `BORRADOR` | Redacta borrador de respuesta y lo guarda |

### Prompt del Agente

El AI Agent recibe el contenido completo del email y debe:
1. Clasificar el nivel de urgencia
2. Si es normal, redactar un borrador de respuesta
3. Devolver la acción estructurada en formato `###EMAIL_ACTION###/###FIN###`

---

## Workflow 05: Resumen Diario

**Trigger:** Cron (7:00 AM, lunes a viernes)

**Propósito:** Envía un resumen diario al médico con la información clave del día.

### Contenido del Resumen

```
📋 Resumen del día [fecha]

🩺 Turnos del día: 8
├─ 10:00 Juan Pérez (Confirmado)
├─ 10:30 María García (Pendiente)
├─ 11:00 Pedro Sánchez (Pendiente)
...

👤 Pacientes nuevos: 2
├─ Diego Torres
└─ Sofía Herrera

⚠️ Pendientes:
├─ 3 recetas por autorizar
├─ 1 mensaje sin responder
└─ 2 turnos sin confirmar

📊 Métricas de ayer:
├─ Turnos atendidos: 6/8
├─ Tasa de ausentismo: 25%
└─ Mensajes procesados: 15
```

---

## Workflow 06: Recetas

**Trigger:** Webhook

**Propósito:** Gestiona solicitudes de recetas, renovaciones y autorizaciones.

### Nodos

```
Webhook ── PG (verificar paciente) ── IF (tiene receta activa?)
    │                                              │
    │                                         [Solicitar renovación]
    │                                              │
    │                                         PG (receta anterior)
    │                                              │
    │                                         IF (requiere médico?)
    │                                              │
    │                                    ┌─────────┴─────────┐
    │                                    │                   │
    │                              [Automático]        [Derivar al médico]
    │                                    │                   │
    │                              PG (crear receta)    Twilio (notificar)
    │                                    │
    └── Twilio (confirmación) ── PG (log)
```

### Reglas de Negocio

- **Renovación automática**: si la receta anterior es del mismo medicamento y no requiere cambios
- **Derivar al médico**: si es un medicamento nuevo, cambia la dosis, o requiere evaluación
- **Recetas controladas**: siempre requieren aprobación del médico
- **PDF**: se genera automáticamente y se envía por WhatsApp

---

## Credenciales Requeridas

Cada workflow necesita las siguientes credenciales en n8n:

| Workflow | Credenciales |
|----------|-------------|
| WF-01 | Twilio API, PostgreSQL, Ollama |
| WF-02 | PostgreSQL, Google Calendar (opcional) |
| WF-03 | Twilio API, PostgreSQL |
| WF-04 | IMAP, Twilio API, PosterSQL, Ollama |
| WF-05 | Twilio API, PostgreSQL, Ollama |
| WF-06 | Twilio API, PostgreSQL |

## URLs de Webhook

| Endpoint | Workflow | Método |
|----------|----------|--------|
| `POST /webhook/consultorio-inbound` | WF-01 | POST |
| `POST /webhook/turnos` | WF-02 | POST |
| `POST /webhook/recetas` | WF-06 | POST |

## Activación

Los workflows están diseñados para correr 24/7:

- **WF-01, 02, 06**: Siempre activos (responden a webhooks)
- **WF-03**: Cada hora, todos los días
- **WF-04**: Revisa IMAP cada 5 minutos
- **WF-05**: 7:00 AM, lunes a viernes

> ⚠️ Después de importar, activar manualmente desde la UI de n8n.
