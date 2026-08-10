# Módulo Mensajería Interna

Comunicación directa entre el equipo del consultorio: médicos, secretarias y administradores.

## Arquitectura

```
Route Group
└── (auth) dashboard/mensajeria-interna/
    ├── page.tsx                            → Server component (force-dynamic)
    └── mensajeria-interna-client.tsx        → Client con SSE + Queries

API (app/api/mensajeria-interna/)
  ├── conversaciones/                       → GET (listar) + POST (crear)
  │   └── [id]/mensajes/                    → GET (listar) + POST (enviar)
  ├── no-leidos/                            → GET (contador de no leídos)
  └── staff/                                → GET (lista de usuarios del tenant)

Tablas (drizzle/messaging.ts)
  ├── conversaciones_internas               → pk, tenant_id, participante_a_id,
  │                                           participante_b_id, contexto_paciente_id?,
  │                                           contexto_turno_id?, ultimo_mensaje, ultimo_autor_id,
  │                                           ultima_interaccion
  └── mensajes_internos                     → pk, tenant_id, conversacion_id FK ON DELETE CASCADE,
                                              autor_id, contenido, urgente bool, leido_at?
```

## Modelo de Datos

| Tabla | Campos Clave | Notas |
|-------|-------------|-------|
| `conversaciones_internas` | `participante_a_id`, `participante_b_id` (FK usuarios), `contexto_paciente_id?`, `contexto_turno_id?` | Conversación 1:1 entre dos usuarios del staff |
| `mensajes_internos` | `conversacion_id` (FK ON DELETE CASCADE), `autor_id`, `contenido`, `urgente`, `leido_at` | Cada mensaje pertenece a una conversación |

### RLS

Ambas tablas tienen Row-Level Security con política `tenant_isolation_all`:

```sql
CREATE POLICY tenant_isolation_all ON public.conversaciones_internas
FOR ALL USING (
  current_tenant_id() IS NULL
  OR tenant_id = current_tenant_id()
);
```

### Índices

- `idx_conv_internas_participante_a` — Búsqueda por participante A
- `idx_conv_internas_participante_b` — Búsqueda por participante B  
- `idx_conv_internas_ultima` — Orden por última interacción (tenant_id, ultima_interaccion DESC)
- `idx_msgs_internos_conv_created` — Mensajes por conversación + fecha (conversacion_id, created_at)

## APIs

### GET /api/mensajeria-interna/conversaciones
Lista conversaciones del usuario autenticado, ordenadas por última interacción.

### POST /api/mensajeria-interna/conversaciones
Crea una nueva conversación. Body:

```json
{
  "participanteId": "uuid",
  "contextoPacienteId?": "uuid",
  "contextoTurnoId?": "uuid"
}
```

Reglas:
- El participante debe ser un usuario activo del mismo tenant
- No se permite chat consigo mismo
- Si ya existe una conversación entre el par A-B, se reutiliza
- El contexto paciente/turno debe existir y ser visible para el usuario

### GET /api/mensajeria-interna/conversaciones/[id]/mensajes
Lista los mensajes de una conversación. Marca automáticamente como leídos los mensajes del otro participante.

### POST /api/mensajeria-interna/conversaciones/[id]/mensajes
Envía un mensaje. Body:

```json
{
  "contenido": "Hola, ¿viste el turno de Juan?",
  "urgente?": false
}
```

Al enviar:
1. Se inserta el mensaje en `mensajes_internos`
2. Se actualiza `ultimo_mensaje`, `ultimo_autor_id`, `ultima_interaccion` en la conversación
3. Se genera notificación push al destinatario (tipo `mensaje` o `urgencia`)
4. Si el contenido incluye `@nombre`, se notifica al usuario mencionado
5. Se emite evento SSE a ambos participantes

### GET /api/mensajeria-interna/no-leidos
Devuelve `{ count }` con la cantidad de mensajes no leídos.

### GET /api/mensajeria-interna/staff
Lista usuarios activos del tenant (excluyendo al usuario autenticado).

## Menciones @nombre

Cuando un mensaje contiene `@nombre` de otro usuario del tenant, el sistema:
1. Detecta menciones con regex: `(\s|^)@([A-Za-zÁÉÍÓÚÑáéíóúñ\s']+?)(?=[,.!?;:)]|\s|$)`
2. Busca usuarios activos del tenant cuyo nombre coincida (normalizado: sin tildes, minúsculas, sin espacios extra)
3. Genera una notificación dirigida a cada mencionado: "te mencionó en una conversación"

## Mensajes Urgentes

- Se marcan con `urgente: true` en el mensaje
- La notificación push usa prioridad `urgencia` en vez de `mensaje`
- En la UI aparecen con borde ámbar y el label "Urgente"

## Tiempo Real (SSE)

Se reutiliza el endpoint `/api/sse/events` extendido con soporte per-user:

- `emitEventToUser(userId, event)` — envía evento SSE a un usuario específico
- Tipos de eventos: `mensaje-interno` (nuevo mensaje), `mensaje-interno-entregado` (confirmación de envío)
- El cliente se conecta pasando `x-user-id` header
- Heartbeat cada 30 segundos

## Frontend

### Componentes

- `mensajeria-interna-client.tsx` — Panel completo con lista + conversación
- SSE listener que invalida queries en tiempo real
- Sonidos: `playSend` al enviar, `playReceive` al recibir (mismo sistema que conversaciones WhatsApp)
- Burbujas: propio → `justify-end bg-primary rounded-tr-sm`, otro → `justify-start bg-muted rounded-tl-sm`
- Chips de contexto: si la conversación está vinculada a un paciente/turno, se muestra con link directo

### Botones de acceso

- **Ficha paciente**: botón "Consultar en mensajería" (desktop y mobile dropdown)
- **Detalle turno**: botón "Consultar en mensajería" en el footer del modal
- Ambos abren `/dashboard/mensajeria-interna?contextoPacienteId=...` o `?contextoTurnoId=...`

### Badge de no leídos

- Contador en la navegación principal del sidebar
- Se actualiza cada 60s vía polling + SSE
- Muestra "99+" cuando supera 99

## Feature Gate

| Feature | Plan mínimo |
|---------|-------------|
| `mensajeria-interna` | Starter |

## Permisos y Multi-Sucursal

- Un usuario solo puede iniciar conversación con usuarios del mismo tenant (validación backend)
- La política multi-sucursal por defecto permite comunicación entre sucursales del mismo tenant
- El acceso al contexto paciente/turno sigue las mismas reglas de permisos que la ficha del paciente (`verifyPacienteAccess()`)

## Fuera de Alcance

- Mensajes vinculados al historial clínico legal del paciente
- Salas de conversación grupales (más de 2 personas)
- Mensajería entre distintos tenants
