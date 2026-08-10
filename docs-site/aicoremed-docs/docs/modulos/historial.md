# Módulo Historial Clínico

## Arquitectura

```
Routes (app/dashboard/historial/)
  ├── page.tsx              → Server component (force-dynamic, data inicial)
  ├── historial-client.tsx  → Búsqueda, filtros, paginación, nuevo registro, export
  └── loading.tsx           → Skeleton

API (app/api/historial/)
  ├── route.ts              → GET (listado paginado + unificado) / POST (crear manual)
  └── exportar/route.ts     → GET (csv|excel|pdf, feature reportes-avanzados)

API (app/api/pacientes/[id]/historial/route.ts)  → CRUD por paciente (ficha)
API (app/api/portal/historial/route.ts)          → GET portal (solo visibleParaPaciente)

Lib (lib/)
  ├── services/historial.ts  → listarHistorial() unificado (merge historial_medico + notas_soap)
  ├── encuestas.ts           → storeSurveyResponse() inserta tipo 'encuesta'
  ├── services/documentos.ts → revisar('aprobar') inserta tipo 'otro'
  └── services/fhir-export.ts → exporta historial como FHIR Conditions

Service: lib/services/historial.ts
```

## Vista Unificada

`listarHistorial()` mergea en memoria dos orígenes:

| Origen | Tabla | Prefijo ID | Tipo forzado |
|--------|-------|-----------|--------------|
| `historial` | historial_medico | `h_<uuid>` | el del enum |
| `soap` | notas_soap | `s_<uuid>` | `evolucion`, título "Nota SOAP" |

- Ordena por fecha desc y pagina en JS (máx 200 filas por origen)
- Respuesta `success(res)` → `{ data: { data, total, page, limit, totalPages } }`
- Filtrar por `tipo` solo aplica al origen `historial`

## Schema (drizzle/medical.ts)

### historial_medico

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `pacienteId` | UUID FK→pacientes.id | NOT NULL |
| `medicoId` | UUID FK→medicos.id | Nullable (encuestas de portal no siempre) |
| `turnoId` | UUID FK→turnos.id | Nullable |
| `tipo` | historial_tipo enum | 13 valores |
| `titulo` | varchar(255) | NOT NULL |
| `descripcion` | text | |
| `diagnosticoCodigo` | varchar(10) | CIE-10 |
| `diagnosticoDescripcion` | text | |
| `archivos` | jsonb | default [] |
| `visibleParaPaciente` | boolean | default true (encuestas false) |
| `hashVerificacion` | varchar(64) | SHA-256 de certificados |
| `pdfGenerado` | boolean | |
| `createdAt` / `updatedAt` | timestamptz | |

Índices: `idx_historial_paciente_id`, `idx_historial_medico_id`, `idx_historial_hash_verificacion`.

### historial_tipo (13 valores)

```
consulta, urgencia, receta, certificado, orden_estudio, derivacion, evolucion,
anamnesis, examen_fisico, diagnostico, tratamiento, encuesta, otro
```

> El CHECK de la BD (migración 0054) admite 21 valores legacy (control, estudio, resultado, internacion, cirugia, alergia, vacuna, observacion).

## API Endpoints

| Método | Ruta | Params/Body | Respuesta |
|--------|------|-------------|-----------|
| GET | `/api/historial` | `search`, `tipo`, `origen`, `from`, `to`, `pacienteId`, `page`, `limit` (def 30, máx 100) | `{ data: { data, total, page, limit, totalPages } }` |
| POST | `/api/historial` | `{ pacienteId*, tipo*, titulo*, descripcion?, diagnosticoCodigo?, diagnosticoDescripcion?, visibleParaPaciente? }` | 201 `{ data: row }` |
| GET | `/api/historial/exportar` | `formato=csv\|excel\|pdf` + filtros | Archivo directo (attachment) |
| GET/POST/PATCH/DELETE | `/api/pacientes/[id]/historial` | CRUD por paciente | 201 POST; PATCH ?entryId=; DELETE ?entryId= |
| GET | `/api/portal/historial` | Cookie `portal_session` | `{ historial: [...] }` solo visible |
| GET | `/api/verificar-certificado/[id]` | id | Verificación pública por hash |

## Reglas de Negocio

- **Alimentación automática**: certificados (hash SHA-256 + PDF), encuestas (sentimiento IA, `visibleParaPaciente:false`), documentos OCR aprobados (tipo `otro` + `archivos`). Turnos y recetas NO insertan en historial_medico (viven en tablas propias; una receta puede llegar como entrada manual).
- **Notas SOAP**: viven en `notas_soap`, se integran solo en la vista.
- **Duplicados de encuesta**: rechazado por `turnoId` (idempotencia).
- **Soft vs hard delete**: DELETE en ficha es hard delete; eliminación de paciente en baja ARCO priva también en cascada.
- **Scoping**: `verifyPacienteAccess` en rutas por paciente; médicos solo sus pacientes.
- **Exportación**: gate `reportes-avanzados` (Professional+), `limit=200`, orden fecha asc.

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| historial | Starter |
| reportes-avanzados (export CSV/Excel/PDF) | Professional |

## Integraciones

- **Certificados**: hash SHA-256 + PDF con QR, verificación pública
- **Encuestas post-consulta**: sentimiento IA en `archivos`
- **Documentos OCR**: aprobación → entrada tipo `otro` + setea `documentos_medicos.historialId`
- **Portal paciente**: listado solo `visibleParaPaciente`
- **Alertas inteligentes**: leen `tipo:'diagnostico'`
- **FHIR export**: Conditions (excluye `turnoId NOT NULL`)
- **Baja ARCO**: DELETE en cascada al eliminar paciente

## Service (lib/services/historial.ts)

| Función | Descripción |
|---------|-------------|
| `listarHistorial()` | Vista unificada con filtros + paginación JS |
| `toCsv()` | Transforma a CSV (con `csvEscape`) |
| `csvEscape()` | Escapa valores CSV |