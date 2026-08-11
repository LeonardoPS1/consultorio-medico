# Ocupación sensible al período — Design

**Fecha:** 2026-08-11
**Estado:** Aprobado

## Objetivo

Que la pestaña **Ocupación** de Reportes responda al selector superior **Semana / Mes / Año**, re-fetching el heatmap con la ventana de tiempo correspondiente.

## Semántica de ventanas (aprobada)

Ventanas **rodantes** (rolling) terminadas en el momento actual, aproximadas a semanas:

| Selector | Días | Semanas |
|----------|------|---------|
| Semana | últimos 7 días | 1 |
| Mes | últimos 30 días | 4 (~28 días) |
| Año | últimos 365 días | 52 (~364 días) |

## Cambios

### 1. API route `app/api/reportes/ocupacion/route.ts`
- Nuevo query param opcional `periodo=semana|mes|año`.
- Mapeo: `semana→1`, `mes→4`, `año→52`.
- Si `periodo` está presente, **gana** sobre `semanas`; si no, comportamiento actual (default 12).
- Ampliar clamp de `semanas` de `4-16` a `1-52` (backward compatible, permitir `semanas=1` directo).
- Sin cambios en service, demo ni componentes hijos.

### 2. `reportes-client.tsx`
- Agregar `periodo` al useEffect de Ocupación (deps) y al URL del fetch (`?demo=...&periodo=${periodo}`).

### 3. Helper de etiqueta `labelSemanas(n)` en `lib/services/ocupacion-grilla.ts`
- `1` → `'última semana'`
- `4` → `'último mes'`
- `52` → `'el último año'`
- resto → `'últimas N semanas'`
- Usar en header del tab Ocupación (`reportes-client.tsx:530`) y en heatmap (`heatmap-franjas.tsx:137`).

## No alcanza (YAGNI)
- Sin cambios en `calcularOcupacionFranjas`, `getDemoOcupacion`, ni componentes hijos.
- Sin nuevas tablas/columnas.