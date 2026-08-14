# Módulo Reportes y Analítica

## Arquitectura

```
Routes (app/dashboard/reportes/)
  ├── page.tsx              → Server component (force-dynamic, canAccess reportes-avanzados)
  ├── reportes-client.tsx   → Tabs, KPIs, periodo (semana/mes/año), toggle Demo/Reales, export
  ├── types.ts              → Tipos re-exportados + ReporteApiResponse
  ├── loading.tsx           → Skeleton
  └── error.tsx             → Error boundary con reintentar

Components (components/reportes/)
  ├── heatmap-franjas.tsx        → Ocupación por franja (mobile-first, 4 niveles semánticos)
  ├── benchmark-comparativa.tsx  → Tu clínica vs bucket anónimo (≥5 tenants)
  ├── comparativa-mensual.tsx    → KPIs actual vs período anterior + BarChart
  ├── prediccion-demanda.tsx     → AreaChart real vs estimado (30 días)
  └── conversion-funnel.tsx      → Embudo leads→pacientes (5 etapas)

API (app/api/reportes/)
  ├── route.ts              → GET KPIs (NextResponse.json directo, params periodo + demo)
  ├── ocupacion/route.ts    → GET ocupación franjas (apiHandler + ok, params demo)
  └── benchmark/route.ts    → GET benchmark (apiHandler + ok, _opsError si ops caído)

Lib (lib/)
  ├── services/ocupacion-franjas.ts → Server service (drizzle + postgres)
  ├── services/ocupacion-grilla.ts  → Cliente-safe (mismo contrato, sin imports server)
  ├── benchmark.ts                  → Bucketing puro compartido dashboard/ops-console
  ├── reportes-demo-data.ts         → getDemoReportes(periodo)
  ├── reportes-export-html.ts       → generarHTMLReporte (PDF imprimible, CSS puro)
  └── export-reporte-excel.ts       → exportReporteExcel (5 hojas xlsx)
```

## Gráficos y Vistas

| Vista | Componente | Tipo |
|-------|-----------|------|
| KPIs y métricas | Tab General (`TabGeneral`, `KpiCard`, `StatCard`) | Cards |
| Demanda (30 días) | `prediccion-demanda.tsx` | AreaChart real (azul) vs estimado (púrpura dashed) |
| Comparativa mensual | `comparativa-mensual.tsx` | KPIs + BarChart actual/anterior + tabla intenciones + cards WhatsApp |
| Embudo de conversión | `conversion-funnel.tsx` | BarChart vertical 5 etapas leads→pacientes |
| Ocupación por franja | `heatmap-franjas.tsx` | Barras horizontales 08:00-20:00, insight cards, 4 niveles |
| Benchmark anónimo | `benchmark-comparativa.tsx` | StatCards tu-clínica vs promedio bucket + barras |

### Niveles de ocupación (heatmap)

| Nivel | Color |
|-------|-------|
| Baja | emerald |
| Media | amber |
| Alta | orange |
| Saturada | rose |

### Periodo de Ocupación

- `semana` (default, semanas=1): barras por hora por día + tendencia **por día** (`EXTRACT(DOW)`, lunes→domingo, zero-fill)
- `mes` (semanas=4): tendencia semanal
- `año` (semanas=52): tendencia mensual
- La tendencia usa `labelSemanas` client-safe y se renderiza desde `heatmap-franjas.tsx` con `porDia=data.semanas===1`

## API Endpoints

| Método | Ruta | Params | Respuesta |
|--------|------|--------|-----------|
| GET | `/api/reportes` | `periodo=semana\|mes\|año`, `demo=true` | `NextResponse.json` directo (KPIs, turnos, pacientes, whatsapp, intenciones, comparativa, predicción, embudo, ejecutivo) |
| GET | `/api/reportes/ocupacion` | `demo=true\|false`, `periodo=semana\|mes\|año`, `sucursalId`, `medicoId` | `ok(grillaOcupacion)` vía apiHandler |
| GET | `/api/reportes/benchmark` | — | `ok(comparativa)` con `_opsError` si el ops-console está caído |

## Reglas de Negocio

- **Períodos**: `semana`, `mes`, `año` — cambia el rango de las queries
- **Modo Demo**: el server tiene el toggle Demo/Reales; `demo=true` usa `lib/reportes-demo-data.ts` (dataset de referencia)
- **Benchmark anti-identificación**: umbral `UMBRAL_TENANTS = 5` tenants mínimo para publicar bucket (Professional+)
- **Export Excel**: `exportReporteExcel` genera `.xlsx` con 5 hojas (Resumen, Turnos, Intenciones, Obra Social, Canales)
- **Export PDF**: `generarHTMLReporte` produce HTML imprimible con charts en CSS puro (sin librerías) + `window.print()`
- **Feature gate**: el access a la página exige plan `reportes-avanzados`

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| reportes-avanzados (acceso página + export + benchmark) | Professional |
| ocupacion-franjas | Professional |

## Integraciones

- **Ops Console**: `/api/internal/benchmark` (post, `x-internal-key`) recalcula snapshots nocturnos del benchmark anónimo
- **WF-16**: cron nocturno recalcula `platform.benchmark_snapshot`
- **Recharts**: gráficos (AreaChart, BarChart, LineChart)

## Service (lib/services/ocupacion-franjas.ts)

| Función | Descripción |
|---------|-------------|
| `calcularOcupacionFranjas()` | Ocupación normalizada al pico histórico por día |
| `getDemoOcupacion()` | Dataset demo de ocupación |
| `construirGrillaOcupacion()` | Arma la grilla día×franja |
| `calcularOcupacionTenant()` | Cálculo por tenant |

## Utils (lib/benchmark.ts)

| Util | Descripción |
|------|-------------|
| `BUCKETS` | Budgets por tamaño de clínica |
| `UMBRAL_TENANTS` | 5 (mínimo anti-identificación) |
| `bucketForPacientes()` | Asigna bucket según pacientes activos |