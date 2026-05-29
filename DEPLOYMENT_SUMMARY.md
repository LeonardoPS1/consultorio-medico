# Consultorio Médico - Deployment Summary
## Cancelaciones + Lista de Espera (WF-10)

### ✅ COMPLETADO

#### 1. Migración de Base de Datos (0014)
- **Tablas creadas**: `lista_espera`, `ofertas_turno`
- **Índices**: Optimizados para búsquedas FIFO y expiración
- **Triggers**: `updated_at` automático
- **Funciones**: `buscar_candidato_excluyendo()`, `crear_oferta_desde_turno_cancelado()`
- **Propietario**: `reece.schmeler67` (con permisos otorgados a `dashboard_user`)
- **Filas iniciales**: 0 en ambas tablas

#### 2. Servicio de Lista de Espera
- **Archivo**: `lib/services/waitlist.ts` (386 líneas)
- **Funcionalidades**:
  - CRUD completo para waitlist y ofertas
  - Lógica FIFO estricta
  - Límite: 3 ofertas/día/paciente + pausa 24h automática
  - Expiración de ofertas: 15 minutos
  - Pipeline de expiración (eliminar ofertas vencidas)
  - Integración con turnosService (trigger automático al cancelar)

#### 3. Integración con Turnos
- **Modificado**: `lib/services/turnos.ts`
- **Trigger automático**: En `update()` cuando se cancela un turno
- **Proceso**: 
  1. Turno cancelado → buscar candidato elegible
  2. Si existe → crear oferta (15 min expiración)
  3. Notificar vía WhatsApp (oferta + notificación al médico)
  4. Fire-and-forget (no bloquea respuesta del cancelamiento)

#### 4. Notificaciones WhatsApp
- **Archivo**: `lib/whatsapp-waitlist.ts`
- **Plantillas**:
  - `notificarOfertaTurno()`: Al paciente en espera
  - `notificarMedicoReasignacion()`: Al médico asignado
  - `notificarConfirmacionReasignacion()`: Confirmación final
- **Webhook Twilio**: Maneja respuestas `ACEPTAR` / `RECHAZAR`

#### 5. API REST Endpoints
- **Ruta**: `/api/waitlist/*`
- **Endpoints** (8 total, protegidos):
  - GET/POST `/api/waitlist` (listar/crear)
  - DELETE `/api/waitlist/[id]` (eliminar)
  - POST `/api/waitlist/[id]/oferta` (crear oferta manual)
  - GET/POST `/api/waitlist/ofertas` (listar ofertas)
  - POST `/api/waitlist/ofertas/[id]/aceptar`
  - POST `/api/waitlist/ofertas/[id]/rechazar`
  - POST `/api/waitlist/pipeline` (webhook para n8n)

#### 6. Workflow n8n (WF-10)
- **Archivo**: `n8n-workflows/current/workflow-10-expiracion-waitlist.json`
- **Programación**: Cron cada 5 minutos
- **Acción**: Llama a `POST /api/waitlist/pipeline` con webhook secret
- **Propósito**: Ejecutar pipeline de expiración de ofertas

#### 7. UI de Dashboard
- **Página**: `/dashboard/lista-espera`
- **Componentes**:
  - KPIs: esperando, ofertas enviadas, ofertas aceptadas, promedio espera
  - Tabla interactiva con pacientes en espera
  - Botón "Eliminar de lista"
  - Checkbox "Agregar a lista al cancelar" en formulario de turno
- **Sidebar**: Menú "Lista de Espera" (feature flag: `lista-espera`, plan: professional)

#### 8. Build y Despliegue Local
- **Build**: 0 errores TypeScript ✅
- **Commit**: `18839c2` pushed a `origin/main`

### 🔄 PENDIENTE EN PRODUCCIÓN

#### 1. Migración en Producción
- **Problema**: VPS no tiene `node` instalado globalmente
- **Solución alternativa**:
  ```bash
  # Usar postgres directamente vía docker
  PG_CONTAINER=$(sudo docker ps --format "{{.Names}}" | grep -i postgres-1 | head -1)
  sudo docker exec -i $PG_CONTAINER psql -U reece.schmeler67 -d consultorio_medico < dashboard/drizzle/migrations/0014_lista_espera_ofertas.sql
  ```

#### 2. Despliegue de WF-10 a n8n
- **Estado**: Archivo JSON copiado a `/home/node/.n8n/workflows/` en el contenedor n8n-1
- **Próximos pasos**:
  1. Verificar que n8n cargue workflows desde sistema de archivos
  2. Si no, usar API de n8n (requiere crear API key primero):
     ```bash
     # Obtener API key de n8n (una sola vez)
     curl -X POST https://n8n.aicorebots.com/rest/api-keys \
       -H "Content-Type: application/json" \
       -d '{"name":"deploy-script"}'
     ```
  3. Importar workflow vía API:
     ```bash
     curl -X POST https://n8n.aicorebots.com/rest/workflows \
       -H "Content-Type: application/json" \
       -H "X-N8N-API-KEY: <api-key>" \
       -d @n8n-workflows/current/workflow-10-expiracion-waitlist.json
     ```

#### 3. Verificación Final
- **Trigger**: Confirmar que al cancelar turno se crea oferta automáticamente
- **Expiración**: Verificar que WF-10 elimina ofertas vencidas cada 5 min
- **WhatsApp**: Probar flujo completo ACEPTAR/RECHAZAR
- **UI**: Validar que dashboard muestra KPIs y tabla correcta

### 📊 MÉTRICAS DE ÉXITO
- [x] Migración aplicada sin errores
- [x] Servicio waitlist creado y testeado localmente
- [x] Trigger en turnosService funcionando
- [x] Notificaciones WhatsApp implementadas
- [x] API endpoints creados y protegidos
- [x] UI dashboard integrada
- [x] Build 0 errores TS
- [ ] Migración en producción pendiente
- [ ] WF-10 activo en n8n pendiente

### 📝 NOTAS TÉCNICAS
- **Medico target**: Específico (no "cualquier médico") - respeta asignación existente
- **Límite ofertas**: 3/día/paciente, luego bloqueo 24h automático
- **Prioridad**: FIFO estricto por fecha de inscripción
- **Reintento**: Botón en onboarding IA si falla inicial
- **Seguridad**: Todos los endpoints protegidos, webhook n8n con secret
- **Escalabilidad**: Uso de triggers y índices optimizados