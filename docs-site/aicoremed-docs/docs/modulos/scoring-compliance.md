# Scoring No-Show y Compliance Ley 21.719

## Arquitectura

```
Scoring No-Show
  ├── lib/services/scoring-pacientes.ts   → Algoritmo determinista
  ├── app/api/pacientes/scoring/route.ts   → GET (score individual)
  ├── app/api/internal/scores/route.ts     → POST (batch update)
  ├── components/ui/risk-badge.tsx         → Badge visual de riesgo
  ├── drizzle/migrations/0047_scoring.sql   → Columnas risk_score, risk_nivel
  └── scripts/backfill-no-show-scores.ts   → Backfill histórico

Compliance Dashboard
  ├── app/dashboard/compliance/
  │   ├── page.tsx                         → Server component (feature gate)
  │   ├── compliance-client.tsx            → KPIs + charts + tabla
  │   ├── loading.tsx                      → Skeleton
  │   └── error.tsx                        → Error boundary
  ├── app/api/compliance/route.ts          → GET (métricas agregadas)
  ├── lib/services/compliance.ts           → Queries DB + demo data
  ├── lib/features.ts                      → Feature gate 'compliance'
  └── components/charts/
      ├── compliance-tiempo-chart.tsx       → ComposedChart (bar + line)
      └── compliance-medicos-chart.tsx      → BarChart horizontal
```

## Scoring No-Show

### Algoritmo Determinista

El scoring evalúa el riesgo de inasistencia de cada turno usando una fórmula ponderada:

| Factor | Peso | Descripción |
|--------|------|-------------|
| No-shows históricos | 40% | Proporción de turnos `no_asistio` sobre el total del paciente |
| Cancelaciones previas | 25% | Proporción de turnos `cancelada` sobre el total del paciente |
| Confirmación de asistencia | 20% | -20 pts si `confirmo_asistencia = TRUE`, +10 si no respondió |
| Recordatorios 24h | 10% | -10 pts si se envió y no se canceló |
| Asistencia reciente | 5% | +5 si el último turno fue `no_asistio` o `cancelada` |

**Score final**: `0-100` (0 = mínimo riesgo, 100 = máximo riesgo)

**Niveles de riesgo**:

| Nivel | Rango | Color | Acción |
|-------|-------|-------|--------|
| Bajo | 0–24 | Verde | Sin acción |
| Medio | 25–49 | Amarillo | Monitoreo |
| Alto | 50–74 | Naranja | Recordatorio 48h anticipado |
| Crítico | 75–100 | Rojo | Recordatorio 48h + confirmación obligatoria |

### RiskBadge UI

Componente `RiskBadge` en `components/ui/risk-badge.tsx`:

- Bajo → `bg-green-100 text-green-800`
- Medio → `bg-yellow-100 text-yellow-800`
- Alto → `bg-orange-100 text-orange-800`
- Crítico → `bg-red-100 text-red-800`

Se renderiza en la tabla de turnos de forma inline para cada fila.

### Migration 0047

Agrega a la tabla `turnos`:

| Columna | Tipo | Default | Descripción |
|---------|------|---------|-------------|
| `risk_score` | `decimal(4,1)` | `0` | Score de 0 a 100 (1 decimal) |
| `risk_nivel` | `varchar(10)` | `'bajo'` | Nivel: bajo, medio, alto, critico |
| `recordatorio_48h_enviado` | `boolean` | `false` | Flag para recordatorio anticipado |

Se agrega un índice compuesto `idx_turnos_risk` sobre `(risk_nivel, fecha_hora)` para consultas eficientes.

### WF-12: Workflow Nocturno de Scoring

| Propiedad | Valor |
|-----------|-------|
| **Archivo** | `n8n-workflows/current/workflow-12-scores-no-show.json` |
| **Trigger** | Cron diario 3:30 AM |
| **Nodos** | 3 (cron, httpRequest, noOp) |
| **Estado** | ✅ **ACTIVO** |

**Flujo**:
1. Cron a las 3:30 AM
2. POST a `https://med.aicorebots.com/api/internal/scores/actualizar` con `x-internal-key`
3. Endpoint ejecuta `scoringPacientesService.actualizarScoresBatch(diasAntelacion = 30)`
4. Calcula scores para turnos próximos y envía recordatorios 48h si corresponde
5. Loggea resultados en `workflow_logs`

### WF-03 Modificado: Recordatorio 48h

El workflow WF-03 fue modificado para incluir un tercer bloque de recordatorios:

- **Bloque original**: recordatorio 24h y 1h
- **Nuevo bloque**: consulta turnos con `risk_nivel IN ('alto', 'critico')` Y `recordatorio_48h_enviado = FALSE` Y fecha en 48h
- Envía mensaje personalizado con énfasis en la importancia de confirmar o cancelar
- Marca `recordatorio_48h_enviado = TRUE`

### Backfill Script

`scripts/backfill-no-show-scores.ts` actualiza scores para turnos históricos:

```bash
npm run backfill-scores
```

- Procesa todos los turnos con `risk_score = 0` (lote de 500)
- Calcula score basado en el historial del paciente hasta la fecha del turno
- Usa transacciones por lote para consistencia
- Reporta: total, actualizados, errores, duración

## Compliance Dashboard (Ley 21.719)

### Propósito

Monitorear el cumplimiento de la **Ley 21.719 sobre Garantías de Oportunidad** (Chile), que establece plazos máximos para la atención de salud.

### Feature Gate

| Plan | Acceso |
|------|--------|
| Free | ❌ |
| Starter | ❌ |
| Professional | ✅ |
| Premium | ✅ |
| Enterprise | ✅ |

### API Endpoint

**`GET /api/compliance`**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `periodo` | `semana`, `mes`, `año` | `mes` | Período de agregación |
| `demo` | `true`, `false` | `false` | Usa datos demo si no hay datos reales |
| `sucursalId` | UUID | — | Filtrar por sucursal |

**Respuesta**: `ComplianceData`

```typescript
interface ComplianceData {
  metricas: ComplianceMetricas;     // KPIs generales
  tiempoEsperaMensual: TiempoEsperaMes[];  // Tendencias mensuales
  cumplimientoPorMedico: CumplimientoMedico[];  // Por médico
  cancelaciones: CancelacionData[];  // Detalle de cancelaciones
  _demo: boolean;
  periodo: string;
}
```

### KPIs

| KPI | Descripción | Cálculo | Objetivo |
|-----|-------------|---------|----------|
| Tiempo Espera Promedio | Días entre solicitud y atención | AVG(fecha_hora - created_at) | ≤7 días |
| Cumplimiento Plazos | % de turnos dentro del plazo | COUNT(plazo ≤ 30d) / TOTAL | ≥90% |
| No-Show Rate | % de inasistencias | COUNT(no_asistio) / TOTAL | ≤10% |
| Cancelación Anticipada | % de cancelaciones con +24h aviso | COUNT(>24h) / TOTAL | ≥80% |

### Charts

#### Tiempo Espera y Cumplimiento (ComposedChart)

Eje X: meses del período. Barras azules para días de espera promedio, línea verde para % de cumplimiento. Dual Y-axis.

#### Cumplimiento por Médico (BarChart horizontal)

Cada médico con su % de cumplimiento. Barras coloreadas (verde ≥90%, amarillo ≥75%, rojo <75%).

### Reglas de Negocio

- Plazo máximo de 30 días naturales para atención de salud general
- Cancelaciones con más de 24h de anticipación se consideran "responsables"
- El score de cumplimiento se calcula sobre turnos `completada`, `atendido`, `no_asistio`
- Turnos cancelados por el médico cuentan como incumplimiento
- No-show del paciente NO cuenta como incumplimiento del médico
