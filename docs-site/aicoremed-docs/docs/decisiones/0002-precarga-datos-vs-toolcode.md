# ADR-0002: Pre-carga de datos en el prompt en lugar de toolCode/toolWorkflow

**Estado:** Aceptado

## Contexto

El nodo `code` de n8n corre en un sandbox sin acceso directo a PostgreSQL. Usar
`toolCode` o `toolWorkflow` para que el agente consulte la base de datos por sí mismo
añade complejidad y latencia adicional por cada consulta que el agente decide hacer.

## Decisión

En lugar de que el agente consulte la base de datos como una tool, el flujo pre-carga
todo el contexto necesario (paciente, turnos próximos, recetas activas) antes de invocar
al agente:

```
En vez de:  Agente → toolCode → query DB
Hacemos:    PG query → Code (genera prompt con datos) → Agente
```

## Consecuencias

- El agente nunca decide "cuándo" consultar la base de datos — siempre tiene el contexto
  completo desde el primer turno, lo que hace las respuestas más predecibles.
- El costo es que el contexto se carga siempre, incluso si el agente no lo necesita para
  esa interacción puntual.
