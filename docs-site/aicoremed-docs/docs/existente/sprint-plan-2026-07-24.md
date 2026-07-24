# Sprint Plan: Business Continuity & First Client Readiness

> Estado: **PLANIFICADO** — Pendiente de implementación.
> Última actualización: 24/07/2026

---

## TAREA 1: Migrar canal de mensajería Twilio → Evolution API + Chatwoot

### Estado Actual
- **Evolution API:** Desplegado en VPS (no en `docker-compose.prod.yml`)
- **Chatwoot:** No existe en `docker-compose.prod.yml`
- **Webhooks:** Usan Twilio en `docker-compose.prod.yml` (secretos: `twilio_account_sid`)
- **Workflows n8n afectados:** WF-01, WF-02, WF-03, WF-05, WF-06

### Diseño de Integración

#### 1. Despliegue de Chatwoot en docker-compose.prod.yml
```yaml
services:
  chatwoot:
    image: chartwoot/chatwoot:latest
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://chatwoot_user:chatwoot_password@postgres:5432/chatwoot_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
    volumes:
      - chatwoot_data:/var/www/html/public/assets
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == worker
      resources:
        limits:
          cpus: '1'
          memory: 512M
      restart_policy:
        condition: any
        delay: 5s
        max_attempts: 3
```

#### 2. Integración Evolution API con Chatwoot
- Evolution API webhook → Chatwoot inbox (configuración nativa)
- No requiere cambios en docker-compose para Evolution API (ya está desplegado)

#### 3. Migración de Webhooks en n8n
- Reemplazar nodos **Twilio** por **Webhook inbound** en WF-01, WF-02, WF-03, WF-05, WF-06
- URL de webhook: `https://n8n.aicorebots.com/webhooks/{{webhook_id}}`
- Validación: usar `evolution_webhook_secret` (análogo a HMAC de Twilio)

#### 4. Seguridad
- Secret `evolution_webhook_secret` en `.env`
- Validar firma de webhooks de Chatwoot/Evolution (equivalente a Twilio HMAC)

#### 5. Twilio como fallback
- Mantener Twilio detrás de flag `CANAL_MENSAJERIA=evolution|twilio`
- Default: `evolution`

#### 6. Pruebas en staging
- Flujo: WhatsApp → Evolution API → Chatwoot → n8n → Ollama → respuesta → Chatwoot → WhatsApp

#### 7. Documentación
- Actualizar `workflows-n8n.md` (sección WF-01, WF-03)
- Actualizar ADR correspondiente

---

## TAREA 2: Completar WF-01 — Sub-agente de recetas/consultas clínicas

### Estado Actual
- **Triaje Agent:** Detecta turnos, recetas (incompleto)
- **Agenda Agent:** Gestiona citas
- **Clinical Agent:** No implementado (Fase 2 en ADR-0006)

### Diseño del Sub-Agente Clínico

#### System Prompt
```markdown
Sistema:
Eres un experto en medicina clínica y farmacia.
Objetivo:
----------------------------------------
1. Interpretar síntomas o recetas
2. Consultar registros del paciente (Postgres)
3. Proponer medicamentos o seguimientos
4. Todo en español argentino
----------------------------------------
Política de privacidad:
----------------------------------------
- No generar diagnósticos definitivos
- Consultar siempre el historial completo del paciente:
```sql
SELECT * FROM pacientes_records
WHERE id = {{paciente_id}}
```
```

#### Reglas de Handoff (Triaje → Clínico)
- Si mensaje contiene: `/\breceta|\bmedfield|\bmedicamento|\binteraccion/`
- O en memoria previa: `SELECT EXISTS(SELECT 1 FROM pacientes_records_medicina WHERE paciente_id = {{paciente_id}})`
- Resultado: Invocar sub-agente clínico con contexto compartido

#### Memoria Compartida
- Mismo `sessionKey` (teléfono) en Postgres Chat Memory
- Todos los agentes comparten historial conversacional

#### Logging
- Campo `subAgente`: `"triaje"` | `"agenda"` | `"clinico"`

#### Testing
- Caso límite: paciente pregunta por turno y luego por receta en mismo hilo
- Handoff bidireccional entre los 3 agentes

#### Diagrama de Handoff Actualizado
```mermaid
graph TD
A[Triage] -->|saludo/info| A
A -->|crear turno| B[Agenda]
A -->|receta| C[Clínico]
C -->|accion de BD| D[Postgres]
B -->|accion de BD| D
```

#### ADR-0006
- Actualizar marcando los 3 sub-agentes como completos

---

## TAREA 3: Canal de soporte/feedback para clínicas (Chatwoot)

### Estado Actual
- Chatwoot será desplegado en Tarea 1
- No existe inbox de soporte separado

### Plan

#### 1. Segundo Inbox en Chatwoot
```yaml
inboxes:
- name: "Soporte Técnico"
  display_with_agent_avatar: false
  inbound_email:
    enabled: true
    address: soporte@clinicamedica.com
```

#### 2. Punto de entrada en Dashboard
- Botón "¿Necesitas ayuda?" en `components/layout/Mainnav.tsx`
- Link a `/soporte`

#### 3. Etiquetado por Tenant
- En componente de chat, agregar `tenantId` al contexto de Chatwoot
- Auto-etiquetar conversaciones con ID de tenant

#### 4. Separación de bandejas
- Inbox "Pacientes" (conversaciones clínicas)
- Inbox "Soporte" (consultas técnicas)
- No mezclar

---

## TAREA 4: Robustez del ciclo de cobro (MercadoPago)

### Estado Actual (Fase 1 — Hallazgos)
1. **Pagos fallidos:** `mercadopago.ts` no maneja reintentos automáticos
2. **Webhooks duplicados:** No validan IDs de evento de MercadoPago
3. **Período de gracia:** `planes.ts` no define lógica de bloqueo progresivo
4. **Downgrade:** No hay proceso para revertir suscripciones con data intacta

### Implementación Propuesta

#### 1. Reintentos automáticos
- Usar BullMQ colas con cron:
```js
const retryRetry = BullMQ.Cron({ cron: "0 *-1 * * *" }); // Diario
retryRetry.addTask({
  name: "retry_failed_payments",
  action: async () => { ... }
});
```

#### 2. Webhooks idempotente
```js
if (!uniqueEventIds.has(body.id)) {
  uniqueEventIds.add(body.id);
  // Procesar
}
```

#### 3. Período de gracia (5 días)
- Modificar `hasPlanOrAbove` en `planes.ts`:
```js
const GRAZA_DAYS = 5;
export function hasPlanOrAbove(current, required, daysElapsed) {
  if (hasPlanOrAbove(current, required)) return true;
  if (daysElapsed > GRAZA_DAYS) return false;
  // Mostrar advertencia en dashboard
}
```

#### 4. Downgrade post-pago
- Guardar datos en `db: pagos_emergentes`
- Revocar features vía `feature-gates.ts`:
```js
export async function cancelPlan(tenantId) {
  await db.query(`UPDATE tenants SET plan_id = 'free' WHERE id = ${tenantId}`);
  await invalidateFeatures(tenantId);
}
```

#### 5. Tests
- Pago fallido (reintentos + notificación)
- Webhook duplicado (idempotencia)
- Período de gracia (banner de advertencia)
- Cancelación (downgrade graceful)

---

## TAREA 5: Validar y mejorar el onboarding self-serve

### Fricciones Encontradas (prioridad)
1. **Auto-generación de API keys** — requiere intervención manual (Tech Debt)
2. **Orientación de integraciones** — falta explicación de Evolution API/Chatwoot
3. **Templates de WhatsApp** — no hay secuencia inicial predefinida
4. **Configuración de dominio** — requiere input manual de session keys
5. **Validación de pasos** — campos sin validación clara en formularios

### Prioridad Alta (atacar ahora)
1. Auto-generar API keys durante onboarding
2. Módulo de orientación explicando integraciones críticas
3. Templates de WhatsApp predefinidos para nuevos usuarios

---

## Próximos Pasos
- [ ] Revisar deploy de Chatwoot en Dokploy (`aicore-chatwoot-7h41ge`)
- [ ] Revisar deploy de Evolution API en Dokploy (`aicore-evolutionapi-ympyst`)
- [ ] Confirmar configuración de red entre servicios
- [ ] Decidir prioridad de implementación entre tareas
