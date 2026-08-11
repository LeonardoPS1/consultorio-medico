# Rediseño de Ocupación — Reportes

**Fecha:** 10/08/2026
**Versión:** 1.0
**Estado:** Aprobado

---

## Objetivo

Rediseñar la pestaña "Ocupación" de la página de Reportes para que sea profesional, fácil de leer, funcione correctamente y brinde más y mejor información.

---

## Layout general

```
┌──────────────────────────────────────────────────────────┐
│  🔥 Ocupación por día y horario           [Demo│Reales]  │
│  Últimas 12 semanas · 847 turnos analizados              │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  📊 68%  │  🔥 Jue  │  📉 Mar  │  📈 +12% │              │
│  Ocupac. │  10:00   │  14:00   │  vs mes  │              │
│  general │  Pico    │  + flojo │  anterior│              │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│  Filtros: [Sucursal ▼] [Médico ▼]  [12 semanas ▼]       │
├───────────────────────────────┬──────────────────────────┤
│     HEATMAP SEMANAL 7×13      │     PANEL DETALLE        │
│  Hora  Lu Ma Mi Ju Vi Sa Do   │                          │
│  08:00 ░░ ░░ ░░ ░░ ░░ ░░ ·· │  Jueves 10:00            │
│  09:00 ▓▓ ▓▓ ▓▓ ██ ██ ▓▓ ·· │  24 turnos               │
│  10:00 ██ ██ ██ ██ ██ ░░ ·· │  92% ocupación           │
│  11:00 ▓▓ ██ ▓▓ ██ ▓▓ ░░ ·· │  Nivel: Saturada         │
│  ...                          │  No-show: 8%             │
│  19:00 ░░ ░░ ·· ░░ ·· ·· ·· │  Promedio: 18.3 t/sem    │
│  20:00 ·· ·· ·· ·· ·· ·· ·· │                          │
│                               │  💡 Esta franja está     │
│  ░░ Baja  ▓▓ Media           │  saturada. Considerá     │
│  ██ Alta  ██ Saturada        │  abrir más cupos.        │
├───────────────────────────────┴──────────────────────────┤
│  📈 TENDENCIAS (12 semanas)                              │
│  [Gráfico Recharts: línea ocupación + barra turnos]      │
│  Muestra evolución semana a semana con línea de promedio │
├──────────────────────────────────────────────────────────┤
│  💡 RECOMENDACIONES                                     │
│  • Martes 14:00 tiene solo 15% ocupación → promocionar   │
│  • Jueves 10:00 saturado al 92% → abrir más cupos        │
│  • Viernes 16:00 creció 40% en últimas 4 semanas         │
└──────────────────────────────────────────────────────────┘
```

---

## API

### `GET /api/reportes/ocupacion`

#### Parámetros (query string)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `demo` | boolean | `true` | Usar datos demo |
| `semanas` | number | `12` | Ventana de análisis (4-16) |
| `sucursalId` | uuid | — | Filtrar por sucursal |
| `medicoId` | uuid | — | Filtrar por médico |
| `incluirTendencias` | boolean | `true` | Incluir datos de tendencia |

#### Respuesta (extendida sobre OcupacionReporte actual)

```typescript
interface OcupacionReporte {
  // Campos existentes
  franjas: FranjaOcupacion[];
  maxPorDia: { dia: number; max: number }[];
  totalTurnos: number;
  semanas: number;
  totalPorDia: { dia: number; total: number }[];
  _demo?: boolean;

  // Nuevos campos
  tendencias: TendenciaSemanal[];
  noShowPorFranja: NoShowFranja[];
  resumen: ResumenOcupacion;
}

interface TendenciaSemanal {
  semana: number;       // número de semana en la ventana (1..semanas)
  ocupacion: number;    // 0-1
  totalTurnos: number;
}

interface NoShowFranja {
  dia: number;
  hora: number;
  tasaNoShow: number;   // 0-1
}

interface ResumenOcupacion {
  ocupacionGeneral: number;
  franjaPico: { dia: number; hora: number; ocupacion: number };
  franjaMasFloja: { dia: number; hora: number; ocupacion: number };
  tendenciaVsAnterior: number;  // delta % vs ventana anterior
}
```

---

## Cambios en servicios backend

### `lib/services/ocupacion-franjas.ts`

Nuevas funciones:

```typescript
calcularTendencias(reporte: OcupacionReporte): TendenciaSemanal[]
  // Agrupa franjas por semana usando date_trunc('week', fechaHora)
  // Calcula ocupación promedio y total de turnos por semana

calcularNoShowPorFranja(sucursalIds: string[], semanas: number): NoShowFranja[]
  // Agrupa turnos con estado = 'no_asistio' por (dia, hora)
  // Calcula tasa sobre total de turnos en esa franja

generarResumen(reporte: OcupacionReporte): ResumenOcupacion
  // Calcula ocupación general, franja pico, franja más floja, tendencia
```

Consulta SQL existente se extiende con filtros opcionales:
```sql
-- Parámetros adicionales en WHERE:
AND (${medicoId}::uuid IS NULL OR t.medico_id = ${medicoId}::uuid)
```

### `lib/services/ocupacion-grilla.ts` (cliente-safe)

Nuevos tipos exportados + función pura:

```typescript
generarRecomendaciones(data: OcupacionReporte): Recomendacion[]
  // Analiza franjas y tendencias, genera 3-5 recomendaciones
  // Reglas: franjas <20% → promocionar, >85% → abrir cupos,
  //   tendencia creciente >30% → monitorear
```

---

## Componentes

### Archivos modificados

| Archivo | Acción |
|---------|--------|
| `components/reportes/heatmap-franjas.tsx` | Reescribir completo |
| `app/api/reportes/ocupacion/route.ts` | Extender con nuevos params |
| `app/dashboard/reportes/reportes-client.tsx` | Adaptar integración |
| `lib/services/ocupacion-franjas.ts` | Agregar funciones de cálculo |
| `lib/services/ocupacion-grilla.ts` | Agregar tipos + recomendaciones |

### Archivos nuevos

| Archivo | Propósito |
|---------|-----------|
| `components/reportes/kpis-ocupacion.tsx` | Fila de 4 KPI cards |
| `components/reportes/panel-detalle-franja.tsx` | Panel lateral de detalle |
| `components/reportes/tendencias-ocupacion.tsx` | Gráfico de tendencia (Recharts) |
| `components/reportes/recomendaciones-ocupacion.tsx` | Lista de recomendaciones |

### HeatmapFranjas (reescrito)

Estructura del componente:

```
<HeatmapFranjas data={} loading={}>
  <KPIsOcupacion />       {/* 4 cards: ocupación gral, pico, flojo, tendencia */}
  <Filtros />              {/* Sucursal, Médico, Semanas */}
  <div className="grid lg:grid-cols-[1fr_280px]">
    <HeatmapGrid />        {/* Grilla 7×13 con celdas coloreadas */}
    <PanelDetalle />       {/* Info de la franja seleccionada */}
  </div>
  <TendenciasOcupacion />  {/* Gráfico Recharts líneas+barras */}
  <Recomendaciones />      {/* Cards de sugerencias */}
</HeatmapFranjas>
```

---

## Estados y edge cases

### Loading
- Esqueleto con grid 7×13 de celdas grises + placeholders KPIs + placeholder gráfico

### Vacío (0 turnos)
- Mensaje: "No hay turnos en el período analizado. Ajustá los filtros o esperá a tener más datos."
- Botón para cambiar a datos demo

### Error
- Toast destructivo + mensaje inline con botón "Reintentar"
- Si fallback demo disponible, se muestra automáticamente con aviso

### Filtros
- Solo 1 sucursal → filtro oculto
- Sin médicos configurados → filtro oculto
- Cambiar cualquier filtro → refetch con nuevo parámetro

### Accesibilidad
- Celdas: `role="gridcell"`, `aria-label="Lunes 09:00: 18 turnos, 76% ocupación"`
- Navegación por teclado en el heatmap (Tab/Shift+Tab, Enter para seleccionar)
- `useReducedMotion()` en animaciones
- Gráfico de tendencias con `aria-label` y descripción textual

### Demo vs Reales
- Toggle existente se mantiene
- Badge "⚡ Demo" visible cuando corresponda
- Si `?demo=false` y no hay turnos → fallback a demo con aviso "No hay datos reales, mostrando demo"

### Compatibilidad
- Todos los campos nuevos son opcionales en la respuesta
- Tipos en `ocupacion-grilla.ts` agregan campos opcionales
- Ningún consumidor existente se rompe
