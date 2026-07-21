# ADR-0007: Transcripción Automática + SOAP por IA

**Estado:** Aprobado  
**Fecha:** 21/07/2026  
**Reemplaza:** —  

## Contexto

Las consultas virtuales generan contenido clínico valioso que actualmente no se captura de forma estructurada. El médico debe tomar notas manualmente durante o después de cada videollamada, lo que:
- Consume tiempo que podría dedicarse al paciente
- Genera notas inconsistentes en formato y detalle
- Depende de la memoria del médico para registrar todo lo conversado

## Decisión

Implementar un pipeline automático de transcripción + generación de notas SOAP:

1. **Grabación** de la videollamada via LiveKit Egress (con consentimiento del paciente)
2. **Transcripción** del audio a texto via whisper.cpp (modelo small, local)
3. **Estructuración** del texto en formato SOAP via Ollama Gemma3 (temp=0.2)
4. **Revisión** por el médico (aprobar/rechazar/editar antes de que quede definitiva)

## Arquitectura

```
Videollamada (LiveKit)
    │
    ▼ (consentimiento aceptado)
LiveKit Egress graba audio
    │
    ▼ (egress_ended webhook)
n8n WF → POST /api/transcripcion/webhook
    │
    ▼
TranscripcionService
    ├── whisper.cpp → texto
    └── Ollama Gemma3 → SOAP JSON
    │
    ▼
Guarda nota_soap (ia_generated=true, estado_revision='pendiente')
    │
    ▼
Notifica médico (Twilio + in-app)
    │
    ▼
Médico revisa, edita, aprueba o rechaza
    ├── Aprueba → estado='aprobado', elimina audio
    └── Rechaza → DELETE, elimina audio
```

## Detalles Técnicos

### whisper.cpp
- Servicio Docker independiente en el compose de producción
- Modelo `small` (~500MB) — balance accuracy/recursos
- API compatible con OpenAI (`/v1/audio/transcriptions`)
- Volumen compartido `recordings/` para acceso a archivos de audio
- Sin GPU (CPU es suficiente para modelo small en consultas de ~15min)

### Pipeline de Transcripción
- Orchestrado por `TranscripcionService` (`lib/services/transcripcion.ts`)
- Timeouts generosos: whisper 120s, Ollama 60s
- Fallback: si Ollama falla al generar SOAP, guarda transcripción raw
- Doble flag: `iaGenerated` (fue generado por IA) + `createdByIa` (creado por pipeline automático)

### Retención de Audio
- **Inmediata**: al aprobar o rechazar la nota, se elimina el audio
- **Timeout**: 48h (configurable vía `retencionAudioHoras` en `config_ia`)
- Se conserva la transcripción textual en DB (no el audio raw)

### Consentimiento del Paciente
- Pantalla full-screen en el portal antes de entrar a la videollamada
- SI acepta → `consentimiento_log` (tipo='grabacion', accion='accept') + auto-start Egress
- NO acepta → entra sin grabación (solo consulta en vivo)
- El médico puede iniciar grabación manualmente si auto-start falló

## Consecuencias

### Positivas
- Notas clínicas estructuradas sin esfuerzo médico
- Cobertura completa de documentación de consultas virtuales
- Consistencia en formato SOAP
- Reducción de carga administrativa

### Negativas
- Dependencia de whisper.cpp (nuevo servicio en infra)
- Procesamiento post-consulta (no en tiempo real, demora ~1-2min)
- El médico debe revisar y aprobar (no es completamente automático)

### Riesgos
- Precisión de transcripción en español chileno (acento, modismos)
- Ollama puede alucinar datos clínicos si la transcripción es pobre
- El consentimiento debe ser explícito y auditable

## Feature Gate

`'transcripcion-soap'` en plan **Starter+**.

## Configuración

En `config_ia` del tenant:
- `transcripcionHabilitada: boolean` (default false)
- `retencionAudioHoras: number` (default 0 = desactivado)

## Alternativas Consideradas

| Alternativa | Motivo de Rechazo |
|-------------|-------------------|
| faster-whisper | Imagen Docker ~2GB vs whisper.cpp ~50MB, requiere GPU |
| OpenAI Whisper API | Datos salen del VPS (seguridad), costo por minuto |
| Deepgram | Tercerizado, datos sensibles fuera del servidor |

## Migración

- Migration 0048: nuevas columnas en `notas_soap` + update `config_ia`
- Feature toggle: `'transcripcion-soap'` en Starter+
- whisper.cpp: nuevo servicio en `docker-compose.prod.yml`
