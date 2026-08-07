# Módulo IA Clínica

Asistencia de inteligencia artificial local (Ollama + Gemma3) dentro del flujo clínico:
sugerencia de diagnóstico CIE-10, resumen longitudinal del paciente y alertas de
interacciones farmacológicas.

## Arquitectura

```
Lib (lib/)
  ├── ai-clinical.ts          → sugerirCie10(), generarResumenLongitudinal() (Ollama)
  └── farmaco-interacciones.ts→ ~20 interacciones FDA/BNF/Medscape + verificarInteracciones()

API (app/api/)
  ├── pacientes/[id]/resumen/route.ts → GET (cache resumenes_paciente) / POST (regenerar)
  └── recetas/verificar/route.ts      → GET (verificación de interacciones, plan Professional)

Schema (drizzle/medical.ts, migración 0059)
  ├── notas_soap.cie10_sugerido       → jsonb (sugerencia IA + confianza)
  └── resumenes_paciente              → tabla (pacienteId, contenido, fuente)
```

## Sugerencia CIE-10 (Professional)

1. El paciente transcribe una consulta (transcripción SOAP).
2. `sugerirCie10()` llama a Ollama Gemma3 con el texto de la consulta.
3. Devuelve el código CIE-10 más probable + descripción + confianza.
4. Se guarda en `notas_soap.cie10_sugerido` (jsonb).
5. La UI muestra un chip **"IA sugiere"** en el editor SOAP y en el pie de la ficha.
6. El médico confirma o edita el código final — la IA nunca decide sola.

- Feature gate: `cie10-sugerido` (Professional).
- Requiere Ollama corriendo en el servidor.

## Resumen Longitudinal (Starter)

1. `generarResumenLongitudinal()` consolida: últimas notas SOAP, alergias y recetas activas.
2. Se persiste en `resumenes_paciente` (con `revalidateTag` para invalidar caché).
3. La UI expone un botón en el tab SOAP (visible si el paciente tiene ≥2 notas).
4. Se puede regenerar bajo demanda.

- Feature gate: `resumen-longitudinal` (Starter).
- Requiere Ollama para la redacción del resumen consolidado.

## Alertas de Interacciones (Professional)

1. Al emitir una receta, `verificarInteracciones()` compara el medicamento contra el
   historial de recetas activas del paciente.
2. Base de datos local de ~20 interacciones relevantes (FDA/BNF/Medscape) con severidad.
3. Si hay conflicto, la UI muestra un **AlertDialog "Aceptar y continuar"**.
4. Al confirmar se registra en auditoría (`logAudit` acción `alerta_receta_confirmada`).

- Feature gate: `alertas-interacciones` (Professional).
- El médico decide; el sistema solo advierte.

## Stack

| Capa | Tecnología |
|------|-----------|
| Inferencia IA | Ollama + Gemma3 (local, sin llamadas externas) |
| Almacenamiento | PostgreSQL (notas_soap.cie10_sugerido + resumenes_paciente) |
| Interacciones | Base embebida en `farmaco-interacciones.ts` |
