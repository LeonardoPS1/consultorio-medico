# ADR-0001: AI Agents de n8n en lugar de múltiples llamadas HTTP a Ollama

**Estado:** Aceptado

## Contexto

Los workflows originales usaban nodos HTTP Request para llamar a Ollama directamente,
lo que implicaba 2-3 llamadas separadas por workflow (clasificar intención, generar
respuesta, extraer entidades), sin memoria entre llamadas, y parseo manual de las
respuestas JSON de cada una.

## Decisión

Se migró a nodos AI Agent (`@n8n/n8n-nodes-langchain.agent`), que ejecutan clasificación,
razonamiento y generación de respuesta en una sola pasada, con memoria conversacional
nativa vía Postgres Chat Memory y un system prompt dinámico construido con datos reales
del paciente.

## Consecuencias

- Menos latencia por interacción (una ejecución en vez de 2-3).
- Memoria conversacional sin implementarla a mano.
- La salida se controla vía instrucciones en el prompt en lugar de parseo manual —
  requiere disciplina en el diseño del prompt para mantener la estructura de salida estable.
