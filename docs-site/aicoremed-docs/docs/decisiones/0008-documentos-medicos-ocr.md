# ADR-0008: Documentos Médicos + OCR con IA

**Estado:** Aprobado
**Fecha:** 21/07/2026
**Reemplaza:** —

## Contexto

Los pacientes pueden tener documentos médicos externos (estudios de laboratorio, imágenes, certificados, recetas de otros médicos) en formato físico o digital. Actualmente no hay forma de que el paciente suba estos documentos y se integren automáticamente a su historial clínico.

## Decisión

Implementar un sistema de **subida de documentos con OCR por IA** en dos etapas:

1. **El paciente** sube una foto o PDF desde el Portal del Paciente
2. **Ollama llava** (modelo de visión) extrae datos estructurados del documento
3. **El paciente confirma** los datos extraídos (o los edita)
4. **El médico revisa** y aprueba/rechaza desde el Dashboard
5. **Al aprobar**, se inserta en `historial_medico` como entrada estructurada

## Arquitectura

```
PACIENTE                           SISTEMA                          MÉDICO
   │                                  │                                │
   ├── Sube foto/PDF ─────────────►   │                                │
   │  (Portal / POST documentos)      │                                │
   │                                  ├── Guarda archivo ──────────►   │
   │                                  ├── Ollama llava (OCR)          │
   │                                  │   → textoExtraido             │
   │                                  │   → datosEstructurados json   │
   │                                  │   → confianza (0-100)         │
   │                                  │                                │
   │◄── Resultado OCR ───────────────┤                                │
   │  (ve datos extraídos)           │                                │
   │                                  │                                │
   ├── Confirma / Edita ──────────►  │                                │
   │  (PATCH confirmar)              │                                │
   │                                  ├── extraccionEstado=confirmado │
   │                                  │   estadoRevision=pendiente    │
   │                                  │                                │
   │                                  │          ┌────────────────────┤
   │                                  │◄─────────┤ Médico revisa      │
   │                                  │ Aprueba   │ (Dashboard)        │
   │                                  │ o Rechaza └────────────────────┤
   │                                  │                                │
   │                                  ├── Aprueba → historial_medico  │
   │                                  ├── Rechaza → DELETE archivo    │
```

## Pipeline OCR

```
Imagen/PDF → base64 → Ollama llava (multimodal)
  → textoExtraido string
  → datosEstructurados (JSON: tipoDocumento, medico, fecha,
     diagnostico, medicamentos, observaciones)
  → confianzaExtraccion (0-100)
```

## Modelo de Datos

Tabla `documentos_medicos`:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | |
| pacienteId | UUID FK → pacientes | |
| tipo | varchar(50) | estudio, receta, certificado, orden, otro |
| archivoUrl | text | Ruta del archivo subido |
| extraccionEstado | varchar(30) | pendiente, completada, fallida, confirmado |
| datosExtraidos | jsonb | Datos estructurados del OCR |
| confianzaExtraccion | integer | 0-100 |
| textoOriginalOcr | text | Texto crudo del OCR |
| estadoRevision | varchar(20) | pendiente, aprobado, rechazado, editado |
| revisadoPor | UUID FK → usuarios | Médico que revisó |
| historialId | UUID FK → historial_medico | Link si fue aprobado |
| metadata | jsonb | Metadatos adicionales |
| tenantId | UUID | Multi-tenant |
| deletedAt | timestamptz | Soft delete |

## Alternativas Consideradas

| Alternativa | Motivo de Rechazo |
|-------------|-------------------|
| Tesseract.js OCR local | Menor precisión, sin extracción estructurada |
| Google Vision API | Datos salen del servidor, costo por API call |
| OpenAI GPT-4 Vision | Costo recurrente, dependencia externa |
| faster-whisper | No soporta imágenes |

## Consecuencias

**Positivas:**
- Documentos externos integrados al historial clínico digital
- Reducción de carga administrativa (OCR automático)
- Datos estructurados y buscables
- Todo el procesamiento es 100% local en el VPS

**Negativas:**
- Modelo llava (~4GB adicionales en Ollama)
- Precisión del OCR depende de la calidad de la imagen
- Fotos de baja calidad requieren intervención manual

**Neutras:**
- El paciente debe confirmar antes de pasar a revisión médica
- Feature gate en Starter+ para control de recursos
- FHIR-lite export planeado como Tarea 2 futura
