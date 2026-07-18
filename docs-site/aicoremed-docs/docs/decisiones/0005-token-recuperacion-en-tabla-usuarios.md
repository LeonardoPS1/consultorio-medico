# ADR-0005: Token de recuperación de contraseña en la tabla `usuarios`

**Estado:** Aceptado

## Contexto

Al implementar recuperación de contraseña había que decidir si el token de reset vivía
en una tabla separada o como columnas adicionales en `usuarios`.

## Decisión

Se agregaron las columnas `reset_token` y `reset_token_expires` directamente en la
tabla `usuarios`, en lugar de crear una tabla dedicada.

## Consecuencias

- Una consulta menos por flujo de recuperación (no hace falta un JOIN).
- El token se limpia automáticamente al usarse.
- Expira a la hora por diseño, limitando la ventana de uso indebido.
- Trade-off aceptado: si en el futuro se necesita historial de tokens emitidos
  (por ejemplo para detección de abuso), esta decisión debería revisarse.
