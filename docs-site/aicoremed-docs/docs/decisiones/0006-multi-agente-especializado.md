# ADR-0006: Multi-agente especializado con handoff conversacional

**Estado:** Aceptado (reemplaza ADR-0001)

## Contexto

El WF-01 (WhatsApp Inbound + Triaje IA) usaba un único AI Agent monolítico con un
system prompt que cubría todas las funciones: saludo, triaje, agenda (crear/cancelar/
modificar turnos), recetas y consultas clínicas. A medida que se agregaban más
funcionalidades, el prompt se hacía más frágil y propenso a:

- Olvidar instrucciones anteriores al agregar nuevas
- Generar respuestas incorrectas en contextos que requerían especialización
- Mayor latencia al procesar un prompt extenso en cada interacción

Evaluamos dos alternativas:

1. **Router con HTTP a Ollama** — Un Code node clasifica la intención con una
   llamada HTTP rápida (temp=0.1), luego enruta a diferentes prompts. Pero esto
   perdía la memoria conversacional y requería mantener dos sistemas de prompting
   (clasificador + generador).

2. **AI Agents especializados con handoff** — Cada sub-agente es un AI Agent de
   n8n con su propio system prompt acotado, compartiendo la misma Postgres Chat
   Memory. El agente de triaje detecta la intención y emite un marcador de handoff
   (`###HANDOFF###`) cuando necesita delegar a un especialista.

## Decisión

Se adopta el patrón **multi-agente con handoff conversacional**:

```
MENSAJE WHATSAPP
    │
    ▼
┌──────────────────────┐
│   TRIAGE AGENT       │ ← detecta intención + urgencia
│   (saludo, info,     │   saludo/info/urgencia → responde directo
│    clasificación)    │   crear/cancelar/modificar turno → HANDOFF agenda
│   temp=0.3           │   recetas/consultas clínicas → HANDOFF clínico
└──────┬───────────────┘
       │
       ▼ (Handoff detectado)
┌──────────────────────┐
│   AGENDA AGENT       │ ← especialista en turnos
│   (crear, cancelar,  │   comparte memoria con Triaje
│    modificar turnos) │   emite ###ACCION### para cambios en DB
│   temp=0.3           │
└──────────────────────┘
```

### Mecanismo de Handoff

El Triaje Agent incluye en su respuesta un marcador estructurado:
```
###HANDOFF###
{"destino": "agenda"}
###FIN###
```

Un Code node parsea el marcador y un IF node enruta al sub-agente correspondiente.
Si no hay handoff, la respuesta del Triaje Agent es la respuesta final.

### Memoria Compartida

Cada sub-agente tiene su propia instancia del nodo Postgres Chat Memory, pero ambas
usan el mismo `sessionKey` (número de teléfono). Como la memoria se almacena en
PostgreSQL, todos los agentes comparten el mismo historial conversacional. El
paciente no percibe el cambio de agente.

### Logging

Cada respuesta incluye el campo `subAgente` (`"triaje"` | `"agenda"` | `"clinico"`)
que se registra en `workflow_logs.nivel` para monitorear qué agente atendió cada
interacción.

## Consecuencias

- **Prompts más cortos y enfocados** — Cada sub-agente tiene ~15 líneas de prompt
  en vez de ~50, reduciendo drift y mejorando precisión.
- **Escalabilidad** — Agregar un nuevo dominio (ej: facturación) = crear un nuevo
  sub-agente + agregar la ruta al Triaje Agent. No tocar los existentes.
- **Misma latencia base** — El handoff ocurre en el mismo workflow (sin sub-workflow),
  por lo que no hay overhead de red entre agentes.
- **Complejidad de workflow** — El número de nodos aumenta (17 → 23), pero cada
  nodo individual es más simple.
- **Fase 2**: El sub-agente Clínico (recetas + consultas) se implementará en un
  sprint posterior, pero la arquitectura ya lo contempla.

## Referencias

- ADR-0001: AI Agents de n8n en lugar de HTTP (reemplazado por este ADR)
- ADR-0002: Pre-carga de datos vs toolCode (se mantiene vigente)
