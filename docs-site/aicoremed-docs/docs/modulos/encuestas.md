# Módulo Encuestas y Análisis de Sentimiento IA

## Arquitectura

```
Routes (app/dashboard/encuestas/)
  ├── page.tsx               → Server component (force-dynamic, self-fetch a /api/encuestas)
  ├── encuestas-client.tsx   → Listado "Respuestas Recientes" (star + sentimiento)
  └── loading.tsx            → Skeleton

API (app/api/encuestas/)
  ├── route.ts               → GET (stats) / POST (registrar respuesta)
  └── portal/encuestas/
      ├── route.ts           → GET encuestas del paciente (portal)
      └── responder/route.ts → POST responder desde portal

Components (components/charts/evolucion-encuestas-chart.tsx) → LineChart Recharts

Lib (lib/encuestas.ts) → sendSurveyWhatsApp, storeSurveyResponse, detectSurveyResponse,
                         analyzeSentiment, getSurveyStats (393 líneas)
```

> **Sin tabla propia**: las encuestas se almacenan en `historial_medico` con `tipo = 'encuesta'`. El sentimiento IA vive en el JSONB `archivos`.

## Flujo completo

```
turno → PATCH /api/turnos/[id] {estado:'atendido'}
  → sendSurveyWhatsApp(turnoId) [fire-and-forget]
  → WhatsApp: "respondé un número del 1 al 5"
Paciente responde → webhook Twilio → detectSurveyResponse(body) → storeSurveyResponse()
  → insert historial_medico { tipo:'encuesta', titulo:'Encuesta de satisfacción - X/5' }
  → analyzeSentiment(comentario) → archivos.{sentimiento, sentimientoScore}
Dashboard → GET /api/encuestas → getSurveyStats() → KPIs + charts
Portal → /portal/encuestas → GET /api/portal/encuestas + POST /aportal/.../responder
```

## Análisis de Sentimiento (Ollama)

- **Modelo**: `OLLAMA_MODEL` (default `gemma3`) vía `OLLAMA_BASE_URL` (default `http://localhost:11434`)
- **Endpoint**: `POST {ollamaUrl}/v1/chat/completions` (API compatible OpenAI)
- **Prompt**: pide JSON `{sentimiento: positivo|neutral|negativo, score: 0-1}`
- **Parámetros**: `temperature: 0.1`, `max_tokens: 50`, `stream: false`, **timeout 10s** (`AbortSignal.timeout`)
- **Fail-open**: si Ollama falla → retorna `null` y el comentario se guarda sin sentimiento (no rompe el flujo)
- **Persistencia**: `archivos = { sentimiento, sentimientoScore }` en `historial_medico.archivos`
- Solo se llama si comentario `trim().length >= 3` y no es "Sin comentarios"

## API Endpoints

| Método | Ruta | Params/Body | Respuesta |
|--------|------|-------------|-----------|
| GET | `/api/encuestas` | — | `{ data: EncuestaStats }` (total, promedio, distribución 1-5, última semana, tendencia, 20 recientes, evolución mensual 12 meses, distribución sentimiento) |
| POST | `/api/encuestas` | `{ pacienteId*, medicoId?, turnoId?, puntaje: 1-5*, comentario? ≤500 }` | 201 `{ success, data, registrada }` |
| GET | `/api/portal/encuestas` | Cookie `portal_session` | Array plano `[{id, titulo, descripcion, createdAt, archivos, turnoId, medicoNombre}]` |
| POST | `/api/portal/encuestas/responder` | `{ turnoId*, puntaje: 1-5*, comentario? ≤500 }` | 201 / 401 / 403 CSRF / 404 turno ajeno / 400 "Ya existe encuesta" |

> `/api/encuestas` usa `NextResponse.json` directo (no apiHandler).

## KPIs y Visualización

| KPI | Fuente |
|-----|--------|
| Total Encuestas | `getSurveyStats()` |
| Puntaje Promedio `/5` | promedio redondeado a 1 decimal |
| Última Semana | respuestas últimos 7 días |
| Tendencia | última vs penúltima semana (±20% → Subiendo/Estable/Bajando) |

- **Distribución**: barras horizontales 5→1 (Excelente/Bueno/Regular/Malo/Muy malo, emerald/amber/red)
- **Sentimiento IA**: 3 cards Positivo/Neutral/Negativo con barra de %
- **Evolución mensual**: LineChart promedio /5 (domain [0,5]), labels de mes, "Sin datos suficientes" si vacío
- Puntaje parseado del título con regex `/(\d+)\/5/`

## Reglas de Negocio

- **Disparo**: solo al marcar turno `atendido` (fire-and-forget, no bloquea la respuesta HTTP)
- **Detección WhatsApp**: regex acepta solo 1-5, número+texto (`"5 excelente"`, evita `"10"` con `\b`), "un/una N"
- **Idempotencia**: rechaza si ya existe encuesta para el `turnoId`
- **Portal**: valida que el turno pertenezca al paciente + CSRF (origin + cookie `portal_session`)
- **Visibilidad**: `visibleParaPaciente: false` para encuestas en historial

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| encuestas | Starter |

## Integraciones

- **WhatsApp (Twilio)**: envío + captura de respuesta en el webhook entrante
- **Portal paciente**: encuestas del paciente por magic link
- **Historial**: cada encuesta queda como entrada tipo `encuesta`

## Service (lib/encuestas.ts)

| Función | Descripción |
|---------|-------------|
| `sendSurveyWhatsApp()` | Envía encuesta por WhatsApp al marcar turno atendido |
| `storeSurveyResponse()` | Inserta en historial + analiza sentimiento |
| `detectSurveyResponse()` | Detecta número 1-5 en body del webhook |
| `analyzeSentiment()` | Ollama gemma3 → {sentimiento, score} (fail-open) |
| `getSurveyStats()` | KPIs: total, promedio, distribución, tendencia, evolución |