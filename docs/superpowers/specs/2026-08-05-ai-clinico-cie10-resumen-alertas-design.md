# Diseño: IA Clínica — CIE-10 sugerido, Resumen longitudinal y Alertas al recetar

> Fecha: 05/08/2026 · Proyecto: AicoreMed · Versión objetivo: 1.36.0

## Contexto

El sistema ya cuenta con: transcripción de audio + nota SOAP por IA (ADR-0007), OCR de
documentos (ADR-0008), scoring de inasistencia, verificación Isapre/Fonasa y recetas
digitales con firma QR. Este diseño agrega tres capacidades de IA **por encima** del
flujo existente, sin modificar la transcripción/SOAP actual:

- **T1** — Sugerencia automática de códigos CIE-10 en la nota SOAP (después de generar la nota).
- **T2** — Resumen longitudinal del paciente bajo demanda.
- **T3** — Alertas de alergias e interacciones medicamentosas al recetar.

## Feature Gating

| Feature | Plan mínimo |
|---------|-------------|
| `cie10-sugerido` | professional |
| `resumen-longitudinal` | starter |
| `alertas-interacciones` | professional |

- Las llamadas a Ollama se gatean **server-side** (no se gasta inferencia en planes sin acceso).
- Los bloques de UI se gatean con `useCanAccess` / `canAccess`.

## Arquitectura

Nuevo helper transversal `dashboard/lib/ai-clinical.ts`:

- `sugerirCie10(assessment, subjetivo)` → `{ sugerencias: Cie10Sugerencia[] } | null`
  - Prompt a Ollama (Gemma3, temp 0.2) pidiendo 1-3 códigos CIE-10 candidatos con descripción.
  - Valida que los códigos existan en `CIE10_DATA` (fuzzy match por código/descripción).
  - Fail-open: si Ollama falla o no parsea, devuelve `null`.
- `generarResumenLongitudinal({ notas, recetas, alergias })` → `string`
  - Prompt a Ollama (temp 0.3) con últimas 5 notas SOAP + recetas vigentes + alergias.
  - Máximo 4-5 líneas. Fail-open: devuelve mensaje de error amigable.
- `verificarReceta({ medicamento, alergiasPaciente, recetasActivas })` → `{ alertas: AlertaReceta[] }`
  - Cruza contra alergias (mapeo de sustancia, ej. amoxicilina → penicilinas) e
    interacciones del dataset local. Fail-open: ante error devuelve `[]`.

Dataset estático `dashboard/lib/farmaco-interacciones.ts`: pares de interacciones de alto
riesgo conocidas en atención primaria (warfarina+aspirina, IECA+ahorradores de K,
ISRS+triptanes, penicilinas, macrólidos+estatinas, etc.), ~30-40 pares, con `fuente`
(guías públicas: AEMPS, FDA, BNF, UpToDate refs). No se inventan interacciones.

## Migración 0059

```sql
ALTER TABLE notas_soap ADD COLUMN IF NOT EXISTS cie10_sugerido jsonb;

CREATE TABLE IF NOT EXISTS resumenes_paciente (
  paciente_id uuid PRIMARY KEY REFERENCES pacientes(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  generado_en timestamptz NOT NULL DEFAULT now()
);
```

`resumenes_paciente` es una tabla de caché 1:1 con paciente (PK = paciente_id).

## T1 — CIE-10 sugerido

1. En `procesarAudioCompleto()` (lib/services/transcripcion.ts), después de generar el SOAP
   (sección A), se llama `sugerirCie10()` y se guarda en `notas_soap.cie10_sugerido`.
   Si no hay acceso por plan o falla → `null` (fail-open).
2. Schema: campo `cie10Sugerido: jsonb('cie10_sugerido')` en `notasSoap`.
3. UI: en el formulario SOAP de la ficha del paciente, junto al `Cie10Search`, se muestran
   chips con la sugerencia (si existe). Click → acepta (setea `cie10Codigo` +
   `cie10Descripcion`). Tooltip: "Sugerencia de IA — el diagnóstico final es responsabilidad
   del médico". **Nunca se guarda automáticamente.**
4. API notas-soap GET expone `cie10Sugerido` para render.

## T2 — Resumen longitudinal

1. Botón "Generar resumen" en la sección historial de la ficha. Oculto si `count(notas_soap) < 2`.
2. `POST /api/pacientes/[id]/resumen` (feature `resumen-longitudinal`):
   - Server: fetch últimas 5 notas SOAP + recetas vigentes + alergias → `generarResumenLongitudinal`.
   - Upsert en `resumenes_paciente` (generado_en = now()).
   - Devuelve `{ contenido, generadoEn }`.
3. UI: muestra "Generado el [fecha]" + botón "Regenerar". Si existe caché con consultas
   nuevas después del último generado, se muestra el cacheado igualmente con opción a regenerar.

## T3 — Alertas al recetar

1. En `NuevaRecetaModal.handleSubmit`, antes de cerrar/submit:
   - `GET /api/recetas/verificar?pacienteId=X&medicamento=Y` (o endpoint POST):
     server cruza alergias del paciente + recetas activas + dataset → `{ alertas }`.
   - Si hay alertas: `AlertDialog` bloqueante con detalle de cada una.
     - "Aceptar y continuar" → procede con el POST y registra `logAudit` (accion nueva
       `alerta_receta_confirmada`, entidad `receta`) con detalle de las alertas.
     - "Cancelar" → aborta.
2. API `/api/recetas/verificar`: feature-gated server-side; fail-open → `{ alertas: [] }`.
3. La confirmación se registra en auditoría (trazabilidad clínica).

## Enums de auditoría

`AccionAudit` gana `'alerta_receta_confirmada'`.

## Verificación

- `npm run build` 0 errores TS.
- Tests unitarios: parse de sugerencia CIE-10, cruce de alergias, cruce de interacciones.
- Verificación real con pacientes de prueba:
  - T1: nota SOAP con diagnóstico claro → sugerencia CIE-10 razonable.
  - T2: paciente con 3+ consultas → resumen coherente.
  - T3: paciente con alergia a penicilina → alerta al recetar amoxicilina.

## No scope

- No se modifica el flujo transcripción→SOAP existente.
- No se usa el CIE-10 sugerido para diagnóstico automático.
- No se bloquean recetas de forma irreversible (alerta, no prohibición).
