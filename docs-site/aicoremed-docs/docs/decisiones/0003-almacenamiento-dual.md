# ADR-0003: Almacenamiento dual — PostgreSQL (producción) + JSON (desarrollo)

**Estado:** Aceptado

## Contexto

Se quería que cualquier desarrollador pudiera levantar el proyecto en local sin depender
de tener una instancia de PostgreSQL corriendo desde el primer momento.

## Decisión

- **Producción:** PostgreSQL vía Drizzle ORM.
- **Desarrollo:** archivos JSON en `.data/` con datos semilla (seed) automáticos.
- La detección del modo es automática: si PostgreSQL no responde, el sistema cae a JSON
  sin configuración manual.

## Consecuencias

- Onboarding de nuevos desarrolladores más rápido (clonar y correr, sin infraestructura previa).
- Riesgo a vigilar: cualquier lógica que dependa de features específicas de PostgreSQL
  (transacciones, constraints avanzados) debe probarse también contra el modo JSON o
  documentarse como "solo disponible en modo producción".
