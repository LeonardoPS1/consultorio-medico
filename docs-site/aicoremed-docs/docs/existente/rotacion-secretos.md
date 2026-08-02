# 🔐 Rotación de Credenciales Sensibles — AicoreMed

> **Versión:** 1.0.0  
> **Última actualización:** 02/08/2026  
> **Estado:** ✅ Borrador  
> 
> Esta guía documenta el proceso seguro para rotar credenciales sensibles en el sistema AicoreMed. **NO automatiza** la rotación ni modifica valores reales — es exclusivamente documentación y un script de apoyo.

## 📋 Resumen de Credenciales Críticas

| Secreto | Archivo .env | Servicio Consumidor | Impacto si se rota mal |
|---------|--------------|---------------------|------------------------|
| `AUTH_SECRET` | dashboard/.env.example | NextAuth (dashboard) | Invalida **todas** las sesiones activas de todos los tenants simultáneamente |
| `INTERNAL_API_KEY` | dashboard/.env.example + ops-console/.env.example | Dashboard ↔ n8n (endpoints internos) | Rompe comunicación entre dashboard y n8n (WF-01 a WF-11, WF-14, WF-15) |
| `DB_PASSWORD` (postgres) | Docker Swarm secret (referenciado en docker-compose.yml) | todos los servicios conectados a PostgreSQL | Caída total de conexión a PostgreSQL en todos los servicios |
| `N8N_DB_PASSWORD` | Docker Swarm secret | n8n (base de datos interna) | n8n no puede iniciar ni ejecutar workflows |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` | .env | Twilio API (envíos WhatsApp/SMS) | Pérdida de capacidad para enviar/recibir mensajes vía Twilio |
| `CHATWOOT_SECRET_KEY` | Documentación del workspace (no en .env) | Chatwoot (webhooks) | Pérdida de verificación de webhooks de Chatwoot |
| `CHATWOOT_WEBHOOK_SECRET` | Documentación del workspace | Chatwoot (webhooks) | Pérdida de verificación de webhooks de Chatwoot |
| `EVOLUTION_API_KEY` | Documentación del workspace | Evolution API → Chatwoot | Pérdida de integración WhatsApp en Chatwoot |
| `LIVEKIT_API_KEY` | Documentación del workspace | LiveKit (videollamadas) | Pérdida de capacidad para gestionar videollamadas |

## 🔐 Pasos Seguros para Rotación de Credenciales

Para cada secreto crítico:

1. **Generar nuevo valor seguro**
   - Usar `scripts/generar-secreto.sh base64 32` (para AUTH_SECRET, INTERNAL_API_KEY)
   - Usar `scripts/generar-secreto.sh hex 32` (para otros que requieran 32 caracteres hex)
   - Usar `scripts/generar-secreto.sh hex 64` (para CHATWOOT_SECRET_KEY)
   - Usar `scripts/generar-secreto.sh alphanum X` (para contraseñas PostgreSQL, donde X es longitud adecuada)

2. **Almacenar en un lugar seguro y temporal**
   - Copiar el valor generado a un archivo temporal en un gestor de contraseñas o en un lugar seguro accesible solo para administradores

3. **Actualizar la configuración (en Producción)**
   - **NO** actualizar .env.example o cualquier archivo versionado
   - Actualizar el valor en el **almacén seguro de produzione** (Dokploy env vars para servicios específicos)
   - Ejemplo para NextAuth en Dokploy: Editar la variable `AUTH_SECRET` en servicios/dashboard/app/.env.production

4. **Actualizar la documentación de rotación**
   - Actualizar la tabla "última rotación conocida" en este documento con la fecha actual
   - Marar el valor anterior como "rotado en [fecha]" para auditoría

5. **Invalidar el valor antiguo**
   - Solo cuando el nuevo valor esté activo y verificado:
     - [ ] Esperar hasta que todos los servicios hayan leído el nuevo valor (variables de entorno deben recargarse)
     - [ ] Si usas Swarm secrets, eliminar el secreto antiguo con `docker secret rm <nombre>`
     - [ ] Si usas Docker secrets, actualizar el servicio y reiniciarlo

6. **Verificación post-rotación**
   - [ ] Probar que los servicios críticos siguen funcionando
   - [ ] Verificar que las sesiones no se ven interrumpidas inesperadamente
   - [ ] Monitorear logs de autenticación y errores durante las primeras horas

## 📝 Documentación de Tablas

### 📅 Última rotación conocida (placeholder para actualización manual)

| Secreto | Fecha última rotación | Rotado por | Comentario |
|---------|----------------------|------------|------------|
| AUTH_SECRET | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |
| INTERNAL_API_KEY | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |
| DB_PASSWORD | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |
| N8N_DB_PASSWORD | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |
| CHATWOOT_SECRET_KEY | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |
| CHATWOOT_WEBHOOK_SECRET | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |
| EVOLUTION_API_KEY | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |
| LIVEKIT_API_KEY | `[FECHA]` | `[NOMBRE]` | `[NOTAS]` |

## 🔧 Script de apoyo: `scripts/generar-secreto.sh`

Un script de utilidad para generar valores seguros:

```bash
# Generar para 32 bytes en Base64 (usuario típico para secrets)
./generar-secreto.sh base64 32

# Generar para 32 caracteres hexadecimales
./generar-secreto.sh hex 32

# Generar palabras de frase segura (6 palabras)
./generar-secreto.sh diceware 6
```

> **Nota:** Este script corre en Linux (como el servidor VPS). En Windows, puede usarse `docker run alpine` o copiar el script al servidor Linux.