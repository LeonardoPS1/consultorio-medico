# ADR-0004: Feature gating con single source of truth en `lib/planes.ts`

**Estado:** Aceptado

## Contexto

Los planes de suscripción (features incluidas, límites, precios) se necesitan en
múltiples puntos del sistema: el sidebar del dashboard, la protección de rutas, el
cálculo de pagos, y la landing page pública de planes. Mantener esa información
duplicada en cada punto es una fuente segura de inconsistencias.

## Decisión

Centralizar la definición de planes y features en `lib/planes.ts` como fuente única
de verdad, de la que dependen:

```
lib/planes.ts (canon) ─┬→ lib/features.ts (gating)
                        ├→ lib/mercadopago.ts (pagos en CLP)
                        ├→ landing page / planes
                        └→ Config → Suscripción (UI)
```

## Consecuencias

- Cambiar un precio o una feature de un plan actualiza el sistema completo desde un
  único archivo.
- Los features requeridos por plan quedan tipados, lo que previene errores de
  "olvidé bloquear esta ruta para el plan básico".
- El sidebar, las rutas protegidas y los tabs de UI se bloquean de forma consistente
  entre sí.
