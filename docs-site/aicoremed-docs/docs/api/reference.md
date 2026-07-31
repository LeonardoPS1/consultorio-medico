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
|---|---|---|---|
| `POST` | `/api/webhooks/twilio` | Webhook entrante de WhatsApp/SMS | Firma HMAC Twilio |
| `POST` | `/api/webhooks/chatwoot` | Webhook de eventos de Chatwoot (soporte) | `x-chatwoot-signature` HMAC-SHA256 |
| `POST` | `/api/webhooks/mercadopago` | Webhook de confirmación de pago | Firma MercadoPago |
| `GET` | `/api/compliance` | Métricas de cumplimiento (tiempos espera, no-show, cancelaciones) | Sesión JWT |
| `GET` | `/api/auditoria-accesos` | Registro de accesos a datos (paginado, filtrable) | Sesión JWT |
| `GET` | `/api/auditoria-accesos/exportar` | Exportar CSV de accesos | Sesión JWT |
| `GET` | `/api/arco` | Listar solicitudes ARCO | Sesión JWT |
| `POST` | `/api/arco` | Crear solicitud ARCO | Sesión JWT |
| `POST` | `/api/internal/scores/actualizar` | Actualizar scores no-show (job nocturno WF-12) | `x-internal-key` |
| `POST` | `/api/internal/suscripciones-vencidas` | Cron nocturno: downgrade de suscripciones en `past_due` vencidas | `x-internal-key` |
| `POST` | `/api/privacidad/anonimizar` | Anonimización post-retención (WF-09) | `x-webhook-secret` |
| `POST` | `/api/novedades/generar` | Generar entradas de novedades desde commits (WF-11) | Admin o `x-internal-key` |
| `GET` | `/api/portal/recetas/{id}` | PDF de receta del portal del paciente | Sesión portal |
| `GET` | `/verificar-receta/{id}` | Verificación pública de receta (firma QR SHA-256) | Pública |
| `POST` | `/api/deploy/dokploy` | Proxy interno de despliegue (GHA → Dokploy API) | `x-internal-key` |

### Ops Console (ops.aicorebots.com)

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/recuperacion/crear-backup` | Backup per-tenant (`docker exec psql \copy` CSV, tabla por tabla) | Operador |
| `GET` | `/api/recuperacion?tenantId=` | Listar backups de un tenant | Operador |
| `POST` | `/api/recuperacion/trigger` | Ejecutar `recover.sh --force` vía SSH | Operador |
| `GET` | `/api/recuperacion/verify` | Verificar integridad de un backup | Operador |
| `DELETE` | `/api/recuperacion/delete` | Eliminar un backup | Operador |
| `POST` | `/api/auth/impersonate/start` | Iniciar impersonación "Entrar Como" (TOTP + proxy) | Operador + 2FA |

### Dashboard — Impersonación

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| `POST` | `/api/internal/impersonate` | Crear token de impersonación + enviar link por email | Red interna/operador |
| `GET` | `/api/auth/impersonate` | Validar token y fijar sesión de impersonación | Token HS256 |
| `POST` | `/api/auth/impersonate/exit` | Salir del modo impersonación | Sesión |

*(completar a medida que se identifiquen los endpoints realmente consumidos por
integradores externos — no es necesario documentar aquí las rutas internas del dashboard,
esas se documentan en `docs/modulos/`)*
