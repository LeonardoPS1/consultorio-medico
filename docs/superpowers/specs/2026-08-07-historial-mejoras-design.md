# Diseño: Historial Clínico — Mejoras de utilidad

> Fecha: 07/08/2026 · Proyecto: AicoreMed · Versión objetivo: 1.36.x

## Contexto

La sección `/dashboard/historial` hoy lista **solo** registros de `historial_medico`
(15 tipos: consulta, control, diagnostico, estudio, resultado, receta, procedimiento,
internacion, cirugia, alergia, vacuna, observacion, certificado, nota, otro). Tiene
búsqueda por nombre de paciente + filtro por tipo + paginación (30/pág). No permite
filtrar por rango de fechas, expandir el detalle, crear registros, exportar, ni ver por
paciente. Tampoco incluye las **Notas SOAP** (tabla `notas_soap`) que son el formato
clínico estructurado más usado.

Este diseño agrega utilidad a la sección con enfoque en el uso real de un consultorio.

## Objetivos

1. Ver el historial tanto en **vista global cronológica** como **por paciente** (línea de tiempo).
2. Filtrar por **rango de fechas**, **tipo** y **paciente específico**.
3. **Expandir** cada registro para ver detalle completo (descripción, diagnóstico CIE-10).
4. **Crear nuevos registros** desde esta pantalla (tanto registro clínico estándar como Nota SOAP).
5. **Exportar** a Excel / PDF / CSV.
6. Incluir las **Notas SOAP** en la vista (son el registro clínico principal).

## Feature Gating

| Feature | Plan mínimo | Bloque afectado |
|---------|-------------|-----------------|
| `reportes-avanzados` | professional | Exportar (Excel/PDF/CSV) |
| `historial-mejora` | starter | Filtros, expandir, agrupar, crear, ver SOAP |

- La exportación se gatea server-side (no gastar bytes en planes sin acceso).
- Los controles de UI se gatean con `useCanAccess` / `canAccess`.

## Arquitectura (cambios)

### A. Modelo de datos — ninguna migración

No se crean tablas nuevas. Solo lectura combinada de `historial_medico` + `notas_soap`
(unificadas a un shape común para ambas vistas). No hay cambios de schema Drizzle.

### B. Unificación del shape en la vista

Se introduce el concepto de **origen** (`historial` | `soap`) para cada entrada devuelta.
Shape común devuelto por la API:

```ts
interface HistorialItem {
  id: string;
  origen: 'historial' | 'soap';         // tabla de procedencia
  tipo: string;                          // historial_tipo | 'soap'
  titulo: string | null;                 // SOAP: "Nota SOAP"
  descripcion: string | null;
  subjetivo: string | null;              // SOAP only
  objetivo: string | null;               // SOAP only
  assessment: string | null;             // SOAP only
  plan: string | null;                   // SOAP only
  diagnosticoCodigo: string | null;
  diagnosticoDescripcion: string | null;
  fecha: string;                         // ISO created_at
  pacienteId: string;
  pacienteNombre: string;
  pacienteTelefono: string;
  medicoId: string | null;               // para render nombre
  medicoNombre: string | null;
}
```

### C. Endpoints

Se mantiene `GET /api/historial` (ya soporta `search`, `tipo`, `from`, `to`, `page`,
`limit`). Se le añade:
- `origen` (filtro: `historial` | `soap` | vacío = todos).
- del response ahora incluye los campos `subjetivo/objetivo/assessment/plan` y `medicoNombre`
  (nullable según `origen`).

Nuevos endpoints:

```
POST   /api/historial            -> crear registro clínico estándar (zod, requireAuth, verifyPacienteAccess)
POST   /api/historial/soap       -> crear Nota SOAP (requireAuth, verifyPacienteAccess)
GET    /api/historial/exportar?formato=excel|pdf|csv&from=&to=&tipo=&origen=
```

**Eliminación / edición**: queda fuera de scope inicial (se mantiene el flujo existente en
la ficha paciente). Solo se contempla **crear** desde Historial.

### D. UI — `historial-client.tsx`

Nuevo estado y controles (todo client-side, sin nueva página server):
- Toggle de vista: **Global** (cronológico, único listado) / **Por paciente** (agrupa por
  paciente, línea de tiempo).
- Filtros: búsqueda nombre, `select` tipo, **rango de fechas** (dos `Input type=date`),
  filtro por paciente (reusa `PacienteSearchCombobox`), filtro origen.
- Lista de Cards: cada entrada se vuelve **expandible** (click → muestra detalle completo:
  descripción / SOAP, CIE-10 descripción + código, médico).
- Botón **"Nuevo registro"**: abre modal con selector paciente (requerido, reusa
  `PacienteSearchCombobox`) + tab `Registro clínico` / `Nota SOAP`.
  - Registro clínico: título, tipo, descripción, Cie10Search (reusa `Cie10Search`).
  - Nota SOAP: subjetivo/objetivo/assessment/plan + Cie10Search + derivar/requiere control.
- Botón **"Exportar"**: menú Excel/PDF/CSV, pasa los filtros activos como query params.
- Paginación 30/pág.

### E. Server component `page.tsx`

`getInitialData()` ahora también trae las últimas notas SOAP (sensor merged same shape) para
el render inicial `HistorialClient`. Sigue `force-dynamic`.

## Verificación

- `npm run build` 0 errores TS.
- Tests unitarios (Vitest): merge de shape historial+soap, parse de fecha para rango,
  construcción de filtros query para exportar.
- Verificación manual:
  - Filtro rango de fechas respeta `from`/`to`.
  - Vista por paciente agrupa e ordena cronológico.
  - Exportar Excel/PDF/CSV descarga archivo con los filtros aplicados.
  - Crear registro clínico + Nota SOAP aparecen en la lista y en la ficha paciente.

## No scope (fase 1)

- Editar / eliminar registros desde Historial (queda el flujo de ficha paciente).
- Adjuntar archivos al crear.
- Integrar `resumenes_paciente` / cápsulas de IA en esta vista.
- Lista de espera (design aparte).