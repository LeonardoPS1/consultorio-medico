# 🗄️ Base de Datos

## Esquema General

50+ tablas, 5 vistas, 80+ índices, triggers de auditoría automáticos.

> **Última actualización:** 31/07/2026 · 54 migraciones aplicadas.

### Diagrama de Relaciones

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  usuarios   │────▶│   medicos    │◀────│ bloqueos_    │
│             │     │              │     │   agenda     │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
┌────────────────┐  ┌──────────┐  ┌──────────┐
│   servicios    │  │  turnos  │  │ recetas  │
│                │  │          │  │          │
└────────────────┘  └────┬─────┘  └────┬─────┘
                         │             │
              ┌──────────┘             │
              ▼                        ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│   pacientes      │  │conversaciones│  │ historial_   │
│                  │◀──│              │  │   medico     │
└──────────────────┘  └──────┬───────┘  └──────────────┘
                             │
                             ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   mensajes   │     │ facturacion  │
                     │              │     │              │
                     └──────────────┘     └──────────────┘

┌──────────────────┐  ┌──────────────┐
│ workflow_logs    │  │   ia_logs    │
│ workflow_errors  │  │  twilio_logs │
│ auditoria_       │  │              │
│   accesos        │  │              │
└──────────────────┘  └──────────────┘

┌──────────────────┐  ┌──────────────────┐
│   plantillas_    │  │ tareas_pendientes │
│   whatsapp       │  │                  │
└──────────────────┘  └──────────────────┘
```

## Migraciones

Las migraciones son **acumulativas** y deben ejecutarse en orden:

| Migración | Archivo | Tablas |
|-----------|---------|--------|
| 001 | `001_core.sql` | `usuarios`, `medicos`, `pacientes`, `paciente_eventos` |
| 002 | `002_turnos.sql` | `turnos`, `servicios`, `bloqueos_agenda` |
| 003 | `003_conversaciones.sql` | `conversaciones`, `mensajes`, `plantillas_whatsapp`, `tareas_pendientes` |
| 004 | `004_historial_recetas.sql` | `historial_medico`, `recetas`, `facturacion` |
| 005 | `005_logs.sql` | `workflow_logs`, `workflow_errors`, `twilio_logs`, `ia_logs`, `audit_log` |
| 006 | `006_indices.sql` | Índices + vistas `turnos_del_dia`, `proximos_turnos`, `metricas_intenciones`, `pacientes_nuevos_por_mes` |
| 007 | `007_credenciales.sql` | `credenciales` + vista `credenciales_activas` |
| 008 | `008_seguridad.sql` | `auditoria_accesos` + columnas 2FA en `usuarios` |
| 010 | `010_suscripciones.sql` | `suscripciones` con integración MercadoPago |
| 011 | `011_multitenant.sql` | Tabla `tenants` + columna `tenant_id` en 22 tablas |
| 044 | `044_novedades.sql` | Tabla `novedades` con versionado y changelog |
| 045 | `045_white_labeling.sql` | Columnas `dominio_custom`, `color_secundario`, `config_regional` en `tenants` |
| 046 | `046_regional_config.sql` | Tablas `regiones`, `comunas`, columna `region_id`, `comuna_id` en pacientes |
| 047 | `047_scoring.sql` | Columnas `risk_score`, `risk_nivel`, `recordatorio_48h_enviado` en `turnos` |
| 048 | `0048_transcripcion_soap.sql` | Pipeline de transcripción por IA: columnas `ia_generated`, `created_by_ia`, `estado_revision`, `audio_url`, `transcripcion_texto` en `notas_soap` + config en `config_ia` |
| 049 | `0049_documentos_medicos.sql` | Tabla `documentos_medicos` (adjuntos clínicos) |
| 050 | `0050_webhooks.sql` | Tablas `webhook_configs` y `webhook_logs` (webhooks salientes por tenant) |
| 051 | `0051_rls_more_tables.sql` | RLS en 10 tablas adicionales: `portal_config`, `web_vitals_metrics`, `derivaciones`, `webhook_configs`, `ordenes_estudio`, `documentos_medicos`, `paquetes_portal`, `consentimiento_compartir`, `blacklist`, `consentimientos` |
| 052 | `0052_derivaciones_missing_columns.sql` | Columnas faltantes en `derivaciones` |
| 053 | `0053_impersonacion.sql` | Tabla `impersonation_tokens` (impersonación operator→tenant) |
| 054 | `0054_fix_historial_tipo_check.sql` | Corrige CHECK `historial_medico_tipo_check` en `historial_medico` (admite `otro`, `encuesta` y valores del enum actual) |
| 055 | `0055_add_motivo_impersonation.sql` | Columna `motivo` en `impersonation_tokens` (justificación obligatoria, mín. 10 caracteres) |
| 056 | `0056_revocar_impersonacion.sql` | Columnas `session_jti` y `session_revoked_at` en `impersonation_tokens` (revocación de sesión de impersonación activa) |

```bash
# Ejecutar todas las migraciones (en orden)
for f in dashboard/drizzle/migrations/0*.sql; do
  psql -U postgres -d consultorio_medico -f "$f"
done
```

Las migraciones viven en `dashboard/drizzle/migrations/` (monorepo), no en `database/migrations/`.

## Tablas

### 001 - Core

#### `usuarios`
Acceso al dashboard del consultorio.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `email` | VARCHAR(255) UNIQUE | Email de inicio de sesión |
| `password_hash` | VARCHAR(255) | Hash bcrypt de la contraseña |
| `nombre` | VARCHAR(255) | Nombre completo |
| `rol` | ENUM | `admin`, `medico`, `secretaria`, `recepcionista` |
| `activo` | BOOLEAN | Si puede iniciar sesión |
| `ultimo_acceso` | TIMESTAMPTZ | Último login |
| `secreto_2fa` | VARCHAR(255) | Secreto TOTP para 2FA |
| `activo_2fa` | BOOLEAN(default false) | 2FA habilitado |
| `plan` | VARCHAR(50) | `free`, `starter`, `professional`, `premium`, `enterprise` |
| `reset_token` | VARCHAR(255) | Token de recuperación de contraseña (hash) |
| `reset_token_expires` | TIMESTAMPTZ | Fecha de expiración del token (1 hora) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última modificación |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

#### `medicos`
Profesionales del consultorio, vinculados a usuarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `especialidad` | VARCHAR(255) | Especialidad médica |
| `matricula` | VARCHAR(50) | Número de matrícula |
| `horarios` | JSONB | Horarios semanales `{lunes: [{inicio, fin}]}` |
| `duracion_turno_minutos` | INTEGER | Duración default del turno (30min) |
| `color_evento` | VARCHAR(7) | Color HEX para el calendario |

#### `pacientes`
Pacientes del consultorio. Identificados principalmente por teléfono.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `telefono` | VARCHAR(20) UNIQUE | Número de WhatsApp (identificador principal) |
| `nombre`, `apellido` | VARCHAR(255) | Nombre completo |
| `dni` | VARCHAR(20) | Documento nacional de identidad |
| `obra_social` | VARCHAR(255) | Obra social o "Particular" |
| `alergias` | TEXT | Alergias registradas |
| `medicacion_cronica` | TEXT | Medicación de largo plazo |
| `canal_preferido` | ENUM | `whatsapp`, `sms`, `email`, `telefono` |
| `consentimiento_whatsapp` | BOOLEAN | Consentimiento para contacto por WhatsApp |
| `tags` | TEXT[] | Etiquetas: `Obra Social`, `Crónico`, `Nuevo`, etc. |

### 002 - Turnos

#### `turnos`
Citas programadas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `paciente_id` | UUID FK → pacientes | Paciente |
| `medico_id` | UUID FK → medicos | Médico |
| `fecha_hora` | TIMESTAMPTZ | Fecha y hora del turno |
| `estado` | ENUM | `pendiente`, `confirmada`, `en_consulta`, `completada`, `cancelada`, `no_asistio` |
| `tipo_consulta` | ENUM | `presencial`, `virtual`, `domicilio` |
| `recordatorio_24h_enviado` | BOOLEAN | Si ya se envió recordatorio 24h antes |
| `recordatorio_1h_enviado` | BOOLEAN | Si ya se envió recordatorio 1h antes |
| `confirmo_asistencia` | BOOLEAN | Si el paciente confirmó |
| `google_calendar_event_id` | VARCHAR(500) | ID del evento en Google Calendar |
| `risk_score` | DECIMAL(4,1) | Score de riesgo de inasistencia (0–100) |
| `risk_nivel` | VARCHAR(10) | Nivel: `bajo`, `medio`, `alto`, `critico` |
| `recordatorio_48h_enviado` | BOOLEAN | Recordatorio anticipado para alto riesgo |

#### `servicios`
Prestaciones que ofrece cada médico.

#### `bloqueos_agenda`
Bloqueos de agenda: vacaciones, feriados, capacitaciones.

### 003 - Conversaciones

#### `conversaciones`
Sesiones de chat (WhatsApp, email, web).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `canal` | ENUM | `whatsapp`, `sms`, `email`, `web` |
| `estado` | ENUM | `activa`, `pendiente`, `cerrada`, `derivada` |
| `opt_out` | BOOLEAN | Si el paciente dio de baja |
| `ultimo_mensaje` | TEXT | Último mensaje (para vista rápida) |
| `ultima_intencion` | VARCHAR(30) | Última intención clasificada |
| `contexto_ia` | JSONB | Estado interno del agente de IA |

#### `mensajes`
Mensajes individuales dentro de una conversación.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `rol` | ENUM | `paciente`, `asistente_ia`, `medico`, `secretaria`, `sistema` |
| `contenido` | TEXT | Contenido del mensaje |
| `intencion` | VARCHAR(30) | Clasificación por Ollama |
| `confianza_intencion` | DECIMAL(4,3) | Score de 0 a 1 |
| `twilio_sid` | VARCHAR(255) | ID del mensaje en Twilio |
| `costo` | DECIMAL(10,6) | Costo del mensaje (para facturación Twilio) |

#### `plantillas_whatsapp`
Templates de WhatsApp Business aprobados.

#### `tareas_pendientes`
Tareas de seguimiento: revisar, llamar, autorizar recetas.

### 004 - Historial y Recetas

#### `historial_medico`
Entradas del historial clínico.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `tipo` | ENUM | `consulta`, `control`, `estudio`, `resultado`, `receta`, `diagnostico`, etc. |
| `diagnostico_codigo` | VARCHAR(10) | Código CIE-10 |
| `archivos` | JSONB | Archivos adjuntos (PDFs, imágenes) |

#### `recetas`
Prescripciones médicas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `estado` | ENUM | `activa`, `vencida`, `cancelada`, `renovada` |
| `medicamento` | VARCHAR(255) | Nombre del medicamento |
| `dosis` | VARCHAR(255) | Dosis recetada |
| `frecuencia` | VARCHAR(255) | Cada cuánto tomarlo |
| `fecha_inicio`, `fecha_fin` | DATE | Período de validez |
| `receta_anterior_id` | UUID FK | Para renovaciones |

#### `facturacion`
Registro de pagos (simple).

#### `suscripciones`
Suscripciones a planes de MercadoPago.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `organizacion_id` | UUID | ID del tenant/organización |
| `plan` | VARCHAR(50) | `free`, `starter`, `professional`, `premium`, `enterprise` |
| `estado` | VARCHAR(50) | `free`, `pending`, `approved`, `past_due`, `cancelled` |
| `mercadopago_preference_id` | VARCHAR(255) | ID de preferencia en MP |
| `mercadopago_payment_id` | VARCHAR(255) | ID de pago en MP |
| `mercadopago_merchant_order_id` | VARCHAR(255) | ID de orden en MP |
| `period_start` | TIMESTAMPTZ | Inicio del período de facturación |
| `period_end` | TIMESTAMPTZ | Fin del período de facturación |
| `trial_end` | TIMESTAMPTZ | Fin del período de prueba |
| `metadata` | JSONB | Datos adicionales |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última modificación |

### 005 - Logs y Auditoría

| Tabla | Propósito |
|-------|-----------|
| `credenciales` | API keys y tokens encriptados (AES-256-GCM), con sync a n8n |
| `workflow_logs` | Logs de ejecución de workflows n8n |
| `workflow_errors` | Errores capturados en workflows |
| `twilio_logs` | Status callbacks de Twilio (sent, delivered, failed) |
| `ia_logs` | Consultas a Ollama (latencia, tokens, prompt) |
| `audit_log` | Acciones de usuarios en el dashboard |
| `novedades` | Changelog de versiones con título, items (JSONB), tipo y fecha |

### 006+ - Tablas Recientes (047–053)

| Tabla | Propósito |
|-------|-----------|
| `notas_soap` | Notas SOAP con columnas de transcripción IA: `ia_generated`, `estado_revision`, `audio_url`, `transcripcion_texto` |
| `documentos_medicos` | Adjuntos clínicos (PDFs, imágenes) con RLS por tenant |
| `webhook_configs` | Configuración de webhooks salientes: evento, URL, secret HMAC-SHA256, `activo`, `ultimo_estado` |
| `webhook_logs` | Historial de entregas: `status_code`, `respuesta`, `duracion_ms`, `intentos`, `error` |
| `ordenes_estudio` | Órdenes de estudios con RLS por tenant |
| `portal_config` | Configuración del portal paciente por tenant |
| `paquetes_portal` | Paquetes de consultas del portal |
| `consentimiento_compartir` | Consentimientos granulares de derivaciones cross-tenant |
| `convenios_intercambio` | Convenios administrativos de intercambio entre organizaciones |
| `blacklist` | Números bloqueados por tenant |
| `consentimientos` | Registro de consentimientos con RLS |
| `impersonation_tokens` | Tokens de impersonación operator→tenant: `tenant_id`, `usuario_id`, `creado_por_operator_*`, `token`, `usado`, `expires_at` |
| `web_vitals_metrics` | Métricas Core Web Vitals del frontend |
| `platform_tenants`, `platform_operators`, `platform_audit_log` | Esquema `platform` de Ops Console (tablas fuera de RLS) |

#### `webhook_configs`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `tenant_id` | UUID FK → tenants | Tenant dueño |
| `evento` | VARCHAR(50) | Tipo de evento: `turno.*`, `paciente.*`, `receta.*`, `derivacion.*`, `pago.completado` |
| `url` | TEXT | URL destino |
| `secret` | VARCHAR(64) | Secreto para firma HMAC-SHA256 |
| `activo` | BOOLEAN | Habilita/deshabilita el envío |
| `ultimo_estado` | VARCHAR(20) | `pendiente`, `entregado`, `fallido` |

#### `impersonation_tokens`

Tokens de un solo uso que permiten a un operador de Ops Console ingresar como administrador de un tenant.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `tenant_id` | UUID FK → tenants | Tenant destino |
| `usuario_id` | UUID FK → usuarios | Usuario admin objetivo |
| `creado_por_operator_id` / `creado_por_operator_email` | VARCHAR | Operador que la creó (auditoría) |
| `motivo` | TEXT | Justificación de la impersonación (obligatoria, mín. 10 caracteres) |
| `token` | VARCHAR(64) UNIQUE | Token de un solo uso |
| `usado` | BOOLEAN | Si ya fue consumido |
| `expires_at` | TIMESTAMPTZ | Expiración (corta) |
| `used_at` | TIMESTAMPTZ | Cuándo se consumió el token |
| `session_jti` | VARCHAR(64) | `jti` (JWT ID) de la cookie de sesión generada al consumir el token |
| `session_revoked_at` | TIMESTAMPTZ | Cuándo se revocó la sesión de impersonación (revocación manual) |

## Vistas Optimizadas

### `turnos_del_dia`
Turnos del día actual con datos del paciente y médico, ordenados por hora.

### `proximos_turnos`
Turnos próximos pendientes o confirmados.

### `metricas_intenciones`
Cantidad de mensajes por intención en los últimos 30 días.

### `pacientes_nuevos_por_mes`
Cantidad de pacientes registrados agrupados por mes.

## Índices Clave

- `idx_turnos_fecha_medico`: Búsqueda rápida de agenda por médico+fecha
- `idx_turnos_recordatorio`: Filtro eficiente de turnos que necesitan recordatorio
- `idx_conversaciones_ultima`: Ordenar conversaciones por última interacción
- `idx_recetas_activas`: Listar recetas vigentes rápidamente
- `idx_mensajes_intencion`: Agrupar mensajes por intención para reportes
- `idx_auditoria_accion`: Filtrar auditoría por tipo de acción
- `idx_auditoria_entidad`: Filtrar auditoría por entidad afectada
- `idx_auditoria_usuario`: Buscar acciones de un usuario específico
- `idx_auditoria_created_at`: Ordenar auditoría por fecha

## Tabla: `auditoria_accesos`

Registro de todas las operaciones sobre datos sensibles (cumplimiento Ley 20.584 y Ley 19.628).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `usuario_id` | UUID FK | Usuario que realizó la acción |
| `usuario_email` | VARCHAR(255) | Email del usuario (redundante para consultas rápidas) |
| `usuario_nombre` | VARCHAR(255) | Nombre del usuario |
| `accion` | VARCHAR(100) | Tipo: `login`, `logout`, `view`, `create`, `edit`, `delete`, `export`, `config` |
| `entidad` | VARCHAR(100) | Recurso afectado: `paciente`, `turno`, `receta`, `credencial`, etc. |
| `entidad_id` | VARCHAR(255) | ID del recurso afectado |
| `detalle` | TEXT | Descripción de la operación |
| `ip` | VARCHAR(45) | Dirección IP del cliente |
| `user_agent` | TEXT | User-Agent del navegador |
| `created_at` | TIMESTAMPTZ | Fecha del evento |

## Tabla: `consentimiento_log`

Registro de solicitudes ARCO (Acceso, Rectificación, Cancelación, Oposición) y cambios de consentimiento (Ley 19.628 Chile).

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID PK | Identificador único |
| `paciente_id` | UUID FK → `pacientes.id` | Paciente relacionado |
| `tipo` | VARCHAR(50) | Tipo: `acceso`, `rectificacion`, `cancelacion`, `oposicion`, `whatsapp`, `email` |
| `accion` | VARCHAR(50) | Acción: `grant`, `revoke`, `request`, `accept`, `deny` |
| `aceptado` | BOOLEAN | `true` si el consentimiento fue otorgado |
| `ip` | VARCHAR(45) | Dirección IP del cliente |
| `user_agent` | TEXT | User-Agent |
| `created_at` | TIMESTAMPTZ | Fecha del registro |

## Triggers

Todas las tablas principales tienen un trigger `BEFORE UPDATE` que actualiza automáticamente la columna `updated_at` a `NOW()`.

## Buenas Prácticas

### Soft Delete
Nunca se borran registros físicamente. Se usa `deleted_at` (si es NULL, está activo).

### UUIDs
Todas las claves primarias usan UUID v4 generados con `gen_random_uuid()`.

### Timestamps con Zona Horaria
Todos los timestamps usan `TIMESTAMPTZ` para manejar correctamente husos horarios.
Zona por defecto: `America/Santiago`.

### JSONB para Datos Variables
Campos como `metadata`, `contexto_ia`, `horarios` usan JSONB para flexibilidad sin modificar el esquema.
