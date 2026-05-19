# 🔐 Seguridad — AiCoreMed Dashboard

## Checklist para Producción

Antes de poner el sistema en producción, verificá cada punto:

### 🔴 Crítico

- [ ] **AUTH_SECRET generado con `openssl rand -base64 32`** y configurado en las env vars de Dokploy
- [ ] **PostgreSQL contraseña fuerte** (no usar `postgres` / `postgres`)
- [ ] **Puerto 5432 NO expuesto públicamente** — solo permitir conexiones desde el dashboard
- [ ] **Firewall configurado**: solo puertos 80/443/3000 abiertos (según corresponda)
- [ ] **scripts/migrate-prod.js** usa variables de entorno, no credenciales hardcodeadas
- [ ] **.env.local** no está en el repositorio (confirmado con `git ls-files | grep env`)

### 🟡 Alto

- [ ] **N8N_ENCRYPTION_KEY** configurado (generar con `openssl rand -base64 32`)
- [ ] **MercadoPago** usando credenciales de producción (no TEST)
- [ ] **Twilio** con Account SID y Auth Token reales
- [ ] **Rate limiting** activo en middleware (5 intentos/min login, 30/min API)
- [ ] **CORS** configurado si hay dominios cruzados
- [ ] **Backup automático** configurado (pg_dump + GPG encriptado)
- [ ] **HTTPS** funcionando (Traefik + Let's Encrypt)

### 🟢 Buenas prácticas

- [ ] Logs de auditoría revisados periódicamente
- [ ] Usuarios inactivos desactivados
- [ ] 2FA habilitado para usuarios admin
- [ ] Versiones de dependencias actualizadas (`pnpm audit`)
- [ ] Service worker actualizado después de cada deploy (cache limpio)

---

## Gestión de Secretos

### Reglas generales

1. **NUNCA** hardcodear credenciales en el código
2. **NUNCA** commiteer `.env`, `.env.local`, `scripts/.env` al repositorio
3. **SIEMPRE** usar variables de entorno para producción (Dokploy env vars)
4. **Rotar** credenciales si se sospecha una filtración

### Dónde van los secretos

| Entorno | Dónde se configuran | Archivo local |
|---------|--------------------|---------------|
| Desarrollo local | `.env.local` (no trackeado) | `dashboard/.env.local` |
| Producción (Dokploy) | Variables de entorno en la UI de Dokploy | — |
| Migraciones DB | `scripts/.env` (no trackeado) | `scripts/.env` |

### Qué hacer si un secreto se filtró

1. **Rotar inmediatamente** la credencial comprometida
2. Si es una API key: revocarla desde el panel del proveedor
3. Si es una contraseña de DB: cambiarla y actualizar DATABASE_URL
4. Si es AUTH_SECRET: todos los tokens JWT existentes quedan inválidos (los usuarios deben volver a iniciar sesión)
5. Verificar logs de acceso en busca de actividad sospechosa

---

## Arquitectura de Seguridad

```
                    ┌──────────────────────┐
                    │   Usuario (Browser)   │
                    └──────────┬───────────┘
                               │ HTTPS
                    ┌──────────▼───────────┐
                    │    Traefik Proxy      │
                    │  (SSL termination)    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Next.js Middleware  │
                    │  ┌─────────────────┐ │
                    │  │ Rate Limiting   │ │
                    │  │ Security Headers│ │
                    │  │ Session Check   │ │
                    │  └─────────────────┘ │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   API Routes          │
                    │  ┌─────────────────┐ │
                    │  │ Auth (NextAuth) │ │
                    │  │ 2FA (TOTP)      │ │
                    │  │ CSRF Protection │ │
                    │  └─────────────────┘ │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   PostgreSQL          │
                    │  ┌─────────────────┐ │
                    │  │ bcrypt hashes   │ │
                    │  │ AES-256-GCM     │ │
                    │  │ enc. creds      │ │
                    │  └─────────────────┘ │
                    └──────────────────────┘
```

### Capas de defensa

| Capa | Mecanismo | Descripción |
|------|-----------|-------------|
| **Red** | Firewall + Traefik | Solo puertos 80/443 desde internet. HTTPS obligatorio. |
| **Middleware** | Rate limiting | 5 intentos/min para login, 30/min para APIs |
| **Middleware** | Security headers | X-Frame-Options, HSTS, X-Content-Type-Options, etc. |
| **Middleware** | Session check | Redirige a login si no hay cookie de sesión |
| **Auth** | NextAuth v5 | JWT con expiración (30 min), renovación cada 5 min |
| **Auth** | 2FA / MFA | TOTP vía Google Authenticator / Authy |
| **Auth** | Password policy | 8+ chars, mayúscula, número, símbolo |
| **Auth** | Account lockout | 5 intentos fallidos → 15 min de bloqueo |
| **Auth** | CSRF tokens | En todas las mutaciones de auth |
| **Auth** | Token recovery | Tokens de un solo uso, expiración 1 hora |
| **DB** | Encryption at rest | Credenciales encriptadas con AES-256-GCM |
| **DB** | Soft delete | `deleted_at`, nada se borra físicamente |
| **DB** | Auditoría | `auditoria_accesos` registra todas las operaciones |
| **IA** | Prompt sanitization | Anti-jailbreak, anti-prompt injection |
| **Twilio** | Signature verification | Validación criptográfica de webhooks |

---

## Encriptación de Credenciales

Las credenciales almacenadas (Twilio, MercadoPago, APIs) se encriptan con **AES-256-GCM** usando `AUTH_SECRET` como clave:

```
flowchart LR
    A[Credencial] --> B[Encrypt AES-256-GCM]
    B --> C[Base64: IV:Tag:Ciphertext]
    C --> D[PostgreSQL]
    D --> E[Decrypt AES-256-GCM]
    E --> F[Credencial original]
```

- `AUTH_SECRET` se hashea con SHA-256 para obtener la clave de 256 bits
- Cada encriptación usa un IV aleatorio de 16 bytes
- Cada encriptación genera un tag de autenticación GCM (detección de manipulación)
- En producción, `AUTH_SECRET` es **OBLIGATORIO** — sin él, las credenciales no pueden desencriptarse

---

## Variables de Entorno Sensibles

| Variable | Riesgo si se expone |
|----------|---------------------|
| `AUTH_SECRET` | Permite forjar tokens JWT y desencriptar credenciales |
| `DATABASE_URL` | Acceso completo a la base de datos |
| `TWILIO_AUTH_TOKEN` | Enviar/recibir mensajes como el consultorio |
| `MERCADOPAGO_ACCESS_TOKEN` | Procesar pagos, acceder a datos financieros |
| `N8N_API_KEY` | Acceso total a la API de n8n |
| `N8N_ENCRYPTION_KEY` | Desencriptar credenciales de n8n |

---

## Referencias

- [Arquitectura del sistema](architecture.md)
- [Guía de ayuda para usuarios](../docs/help/index.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/security)
