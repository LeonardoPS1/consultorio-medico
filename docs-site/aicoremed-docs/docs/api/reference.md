# API Reference (v1)

> **Estado:** pendiente de generación automática. Esta página se completa como parte del
> Sprint 2 (ver roadmap), cuando se genera el spec OpenAPI desde los schemas Zod en
> `lib/validations.ts`.

## Cómo se va a generar

1. Anotar los schemas Zod existentes con `zod-to-openapi` (o equivalente).
2. Exponer el spec resultante en `app/api/v1/openapi.json`.
3. Renderizar esa spec dentro de este sitio con el plugin
   [`mkdocs-swagger-ui-tag`](https://pypi.org/project/mkdocs-swagger-ui-tag/) o
   [ReDoc](https://github.com/Redocly/redoc), en lugar de mantener esta página a mano.

Ejemplo de cómo quedaría embebido una vez generado el spec:

```markdown
<swagger-ui src="https://docs.aicorebots.com/openapi.json"/>
```

## Mientras tanto: endpoints documentados manualmente

Usa esta tabla como registro temporal de los endpoints públicos (los que consumen
integradores externos, no las rutas internas del dashboard) hasta que el spec
autogenerado reemplace esta sección.

| Método | Ruta | Descripción | Auth |
|---|---|---|---|---|
| `POST` | `/api/webhooks/twilio` | Webhook entrante de WhatsApp/SMS | Firma HMAC Twilio |
| `POST` | `/api/webhooks/mercadopago` | Webhook de confirmación de pago | Firma MercadoPago |
| `GET` | `/api/compliance` | Métricas de cumplimiento (tiempos espera, no-show, cancelaciones) | Sesión JWT |
| `GET` | `/api/auditoria-accesos` | Registro de accesos a datos (paginado, filtrable) | Sesión JWT |
| `GET` | `/api/auditoria-accesos/exportar` | Exportar CSV de accesos | Sesión JWT |
| `GET` | `/api/arco` | Listar solicitudes ARCO | Sesión JWT |
| `POST` | `/api/arco` | Crear solicitud ARCO | Sesión JWT |
| `POST` | `/api/internal/scores/actualizar` | Actualizar scores no-show (job nocturno WF-12) | `x-internal-key` |

*(completar a medida que se identifiquen los endpoints realmente consumidos por
integradores externos — no es necesario documentar aquí las rutas internas del dashboard,
esas se documentan en `docs/modulos/`)*
