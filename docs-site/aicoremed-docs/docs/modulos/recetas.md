# Módulo Recetas

## Arquitectura

```
Routes (app/dashboard/recetas/)
  ├── page.tsx              → Server component (stats)
  ├── recetas-client.tsx    → Tabs (activas/vencidas/historial) + CRUD
  └── loading.tsx           → Skeleton

API (app/api/recetas/)
  ├── route.ts              → GET (list) / POST (create)
  ├── [id]/route.ts         → GET / PATCH / DELETE
  └── exportar/route.ts     → GET (excel/pdf)

API (app/api/)
  ├── verificar-receta/[id]/route.ts  → GET (verificación QR pública)
  └── portal/recetas/
      ├── route.ts                    → GET (portal list)
      └── [id]/route.ts               → GET (portal PDF)

Service: lib/services/recetas.ts (539 líneas)
```

## Schema (drizzle/medical.ts)

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | UUID PK | |
| `pacienteId` | UUID FK→pacientes.id | |
| `medicoId` | UUID FK→medicos.id | |
| `turnoId` | UUID FK→turnos.id | Opcional |
| `estado` | receta_estado enum | borrador, emitida, entregada, anulada, expirada, renovada, historial |
| `tipo` | receta_tipo enum | simple, crónica, estupefaciente, psicotropo, controlada |
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

**DB (7 estados PG enum):**
```
borrador → emitida → entregada
                 → anulada
                 → expirada
                 → renovada → nueva receta
                 → historial (soft-delete)
```

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
- **Renovación**: PATCH con `{ estado: 'activa' }` → actualiza fechas (+30 días)
- **Eliminación**: soft-delete a estado `historial`
- **Hash regeneración**: automática en update si cambian campos sensibles
- **Scoping**: médicos solo ven/modifican sus recetas; admins todas

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| recetas | Starter |
| firma-digital QR | Professional |

## Integraciones

- **WhatsApp**: `wa.me` desde dashboard; WF-06 envía PDF vía Twilio
- **n8n WF-06**: solicitud → Ollama extrae datos → busca receta activa → genera PDF → envía WhatsApp
- **Portal paciente**: listado + PDF imprimible con QR
- **Asistente IA**: detecta recetas por vencer como alerta proactiva

## Service (lib/services/recetas.ts)

| Función | Descripción |
|---------|-------------|
| `listar()` | Lista con filtros + stats (activas/vencidas/historial) |
| `obtener()` | Receta con joins a paciente/médico |
| `crear()` | Crea con hash SHA-256, vigencia 30 días |
| `actualizar()` | Actualiza, regenera hash si cambios sensibles |
| `generarHash()` | SHA-256 con payload + secret |
| `verificarHash()` | Compara hash almacenado vs recalculado |
| `getForExport()` | Datos planos para exportación |
| `generarExcel()` | Buffer .xlsx con librería xlsx |
| `generarHTMLPDF()` | HTML imprimible A4 |
