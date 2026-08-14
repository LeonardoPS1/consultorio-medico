# Módulo Recetas

## Arquitectura

```
Routes (app/dashboard/recetas/)
  ├── page.tsx              → Server component (stats)
  ├── recetas-client.tsx    → Tabs (activas/vencidas/historial) + CRUD + vista previa
  └── loading.tsx           → Skeleton

Components (components/recetas/)
  └── receta-preview-dialog.tsx → Dialog con iframe del HTML de la receta (dashboard y portal)

Lib (lib/)
  ├── receta-pdf.ts         → generarHtmlReceta(), descargarReceta, enviarRecetaWhatsApp, imprimirReceta
  ├── receta-utils.ts       → mapEstadoDisplay(), ESTADOS_ACTIVOS/HISTORIAL
  └── services/recetas.ts   → Service principal (listar/crear/renovar/actualizar/exportar)

API (app/api/recetas/)
  ├── route.ts              → GET (list, acepta estado + pacienteId) / POST (create)
  ├── [id]/route.ts         → GET / PATCH / DELETE
  ├── [id]/renovar/route.ts → POST (renovación en transacción)
  └── exportar/route.ts     → GET (excel/pdf, acepta estado + pacienteId)

API (app/api/)
  ├── verificar-receta/[id]/route.ts  → GET (verificación QR pública)
  └── portal/recetas/
      ├── route.ts                    → GET (portal list)
      └── [id]/route.ts               → GET (portal PDF)

Service: lib/services/recetas.ts
```

## Schema (drizzle/medical.ts)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `pacienteId` | UUID FK→pacientes.id | |
| `medicoId` | UUID FK→medicos.id | |
| `turnoId` | UUID FK→turnos.id | Opcional |
| `estado` | varchar (legacy, no enum) | borrador, emitida, entregada, anulada, expirada, renovada, historial |
| `medicamento` | varchar(255) | |
| `presentacion` | varchar(255) | |
| `dosis` | varchar(255) | |
| `frecuencia` | varchar(255) | |
| `duracion` | varchar(255) | |
| `cantidadTotal` | varchar(100) | |
| `indicaciones` | text | |
| `fechaInicio` | date | default CURRENT_DATE |
| `fechaFin` | date | |
| `requiereAutorizacion` | boolean | default false |
| `hashVerificacion` | varchar(64) | SHA-256 |
| `recetaAnteriorId` | UUID FK→recetas.id | Auto-referencia renovaciones |
| `pdfGenerado` | boolean | |
| `whatsappEnviado` | boolean | |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

Índices: `idx_recetas_paciente_id`, `idx_recetas_medico_id`, `idx_recetas_hash_verificacion`.

## Estados

**DB (7 estados, columna `estado` varchar legacy):**
```
borrador → emitida → entregada
                 → anulada
                 → expirada
                 → renovada → nueva receta
                 → historial (soft-delete)
```

> **Nota**: `estado` es `varchar` en producción (el enum `receta_estado` no existe). El CHECK `recetas_estado_check` (migración 0062) admite la unión de estados: borrador, emitida, entregada, anulada, expirada, renovada, historial, activa, vencida, cancelada — con DEFAULT `emitida`.

**Service (3 estados lógicos):**
| Lógico | DB | UI |
|--------|-----|-----|
| `activa` | emitida | Tab Activas |
| `vencida` | expirada | Tab Vencidas |
| `historial` | historial, anulada, renovada | Tab Historial |

## Firma Digital QR

### Generación del hash

```typescript
const payload = [
  id, pacienteId,
  medicamento.trim().toLowerCase(),
  dosis.trim().toLowerCase(),
  fechaInicio,
  RECETA_HASH_SECRET,
].join('||');
return createHash('sha256').update(payload).digest('hex');
```

- Algoritmo: SHA-256 → hex 64 chars
- Secret: env `RECETA_HASH_SECRET`

### Verificación pública

```
Usuario escanea QR → /verificar-receta/{id}
  → recetasService.obtener(id) + verificarHash()
  → { valida: boolean, receta, vencida: boolean }
```

Endpoint público (sin autenticación) en `app/api/verificar-receta/[id]/route.ts`.

### Regeneración automática
El hash se regenera si cambian campos sensibles: `medicamento`, `dosis`, `pacienteId`, `fechaInicio`.

## Reglas de Negocio

- **Vigencia**: 30 días por defecto desde `fechaInicio`
- **Renovación**: POST `/api/recetas/[id]/renovar` → transacción (marca la anterior `renovada`/`historial`, crea nueva con `recetaAnteriorId` y +30 días)
- **Eliminación**: soft-delete a estado `historial`
- **Hash regeneración**: automática en update si cambian campos sensibles
- **Scoping**: médicos solo ven/modifican sus recetas; admins todas
- **Filtro historial**: GET `/api/recetas?estado=...&pacienteId=...` filtra por estado del tab y paciente (server-side, no cae fuera del limit 100)

## Vista Previa

Al hacer click en una receta (dashboard y portal) se abre `RecetaPreviewDialog`:

- Genera el HTML completo de la receta (organización, logo, prescripción, QR, firma) en tiempo real con `generarHtmlReceta()` de `lib/receta-pdf.ts`
- Muestra el documento en un iframe (`sandbox="allow-same-origin"`)
- Botones: **WhatsApp** (envía PDF), **Imprimir** y **Descargar**
- Montaje condicional con `key` por receta: estado fresco en cada apertura

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| recetas | Starter |
| firma-digital QR | Professional |

## Integraciones

- **WhatsApp**: `wa.me` desde dashboard; WF-06 envía PDF vía Twilio
- **n8n WF-06**: solicitud → Ollama extrae datos → busca receta activa → genera PDF → envía WhatsApp
- **Portal paciente**: listado + vista previa al click + PDF imprimible con QR
- **Asistente IA**: detecta recetas por vencer como alerta proactiva

## Service (lib/services/recetas.ts)

| Función | Descripción |
|---------|-------------|
| `listar()` | Lista con filtros (estado/pacienteId/medicoId) + stats (activas/vencidas/historial) |
| `obtener()` | Receta con joins a paciente/médico |
| `crear()` | Crea con hash SHA-256, vigencia 30 días |
| `actualizar()` | Actualiza, regenera hash si cambios sensibles |
| `renovar()` | Renovación transaccional (anterior → renovada, nueva con +30 días) |
| `generarHash()` | SHA-256 con payload + secret |
| `verificarHash()` | Compara hash almacenado vs recalculado |
| `getForExport()` | Datos planos para exportación |
| `generarExcel()` | Buffer .xlsx con librería xlsx |
| `generarHTMLPDF()` | HTML imprimible A4 |

## Utils (lib/receta-utils.ts)

| Util | Descripción |
|------|-------------|
| `mapEstadoDisplay(estado, fechaFin)` | Convierte estado DB → lógico (activa/vencida/historial) |
| `ESTADOS_ACTIVOS` | borrador, emitida, entregada |
| `ESTADOS_HISTORIAL` | anulada, renovada, historial |
| `ESTADO_DISPLAY_LABELS` | Labels UI para los 3 estados lógicos |
