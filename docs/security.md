# 🔐 Seguridad — AiCoreMed Dashboard

## Estado actual (actualizado 19-May-2026)

| Nivel | Estado | Descripción |
|-------|--------|-------------|
| 🟢 Crítico | **6/6 completado** | ✅ Firewall, AUTH_SECRET, contraseñas, puertos, migraciones, .env |
| 🟡 Alto | **4/7 completado** | ✅ N8N_KEY, rate limiting, backup, HTTPS. Pendiente: MP real, Twilio real, CORS |
| 🟢 Buenas prácticas | **1/5 completado** | ✅ 2FA implementado. Pendiente: revisión periódica de logs, usuarios inactivos, pnpm audit, SW cache |

---

## Checklist para Producción

Estado actual de cada punto en el deployment de `med.aicorebots.com`:

### 🔴 Crítico — 6/6 ✅

- [x] **AUTH_SECRET generado con `openssl rand -base64 32`** → `VUrEuLJCQ+8wrgkE6ZCmlH6eimU5EkY508hk7X7eJnE=` — configurado en Dokploy env vars
- [x] **PostgreSQL contraseña fuerte** — rotada el 19-May-2026 para `dashboard_user` y superuser `reece.schmeler67`
- [x] **Puerto 5432 NO expuesto públicamente** — UFW bloquea 5432, solo accesible desde `172.18.0.1` (Docker gateway)
- [x] **Firewall configurado** — UFW activo: `allow 22,80,443,3000/tcp` | `deny 5432/tcp`
- [x] **scripts/migrate-prod.js** usa variables de entorno (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), sin credenciales hardcodeadas
- [x] **.env.local** no está en el repositorio — verificado con `git filter-repo` (secrets eliminados de 71 commits)

### 🟡 Alto — 4/7 ✅

- [x] **N8N_ENCRYPTION_KEY** configurado → `0PHtOqXBCiqRLggfEvEVPiAlxD4q0KJn` en `.env` de n8n
- [ ] **MercadoPago** usando credenciales de producción (no TEST) — ⏳ Pendiente: configurar desde Dashboard → Credenciales
- [ ] **Twilio** con Account SID y Auth Token reales — ⏳ Pendiente: configurar desde Dashboard → Credenciales
- [x] **Rate limiting** activo en middleware → 5 intentos/min login (`/api/auth/*`), 30/min APIs generales
- [ ] **CORS** configurado si hay dominios cruzados — ⏳ Pendiente: evaluar si se necesita
- [x] **Backup automático** configurado → script `scripts/backup-encriptado.sh` + workflow n8n WF-07 (cron 3 AM, GPG, rotación 30 días)
- [x] **HTTPS** funcionando → Traefik + Let's Encrypt, certificado activo para `med.aicorebots.com`

### 🟢 Buenas prácticas — 1/5 ✅

- [ ] Logs de auditoría revisados periódicamente — ⏳ Pendiente: tarea operativa recurrente
- [ ] Usuarios inactivos desactivados — ⏳ Pendiente: tarea operativa
- [x] **2FA habilitado para usuarios admin** — Implementado con speakeasy (TOTP, QR codes, backup codes). Disponible en Configuración → Perfil
- [ ] Versiones de dependencias actualizadas (`pnpm audit`) — ⏳ Pendiente: ejecutar periódicamente
- [ ] Service worker actualizado después de cada deploy (cache limpio) — ⏳ Pendiente: implementar PWA completa con SW

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
                    ┌──────────────────────────┐
                    │     Usuario (Browser)     │
                    └──────────┬───────────────┘
                               │ HTTPS (TLS 1.3)
                    ┌──────────▼───────────────┐
                    │      Cloudflare DNS       │
                    │    (proxy mode, ocultá IP) │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │      Traefik Proxy        │
                    │   🔒 SSL termination      │
                    │   (Let's Encrypt)          │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   Next.js Middleware       │
                    │  ┌─────────────────────┐  │
                    │  │ 🔒 Rate Limiting    │  │
                    │  │ 🔒 Security Headers │  │
                    │  │ 🔒 Session Check    │  │
                    │  └─────────────────────┘  │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │     API Routes            │
                    │  ┌─────────────────────┐  │
                    │  │ 🔑 Auth (NextAuth)  │  │
                    │  │ 🔑 2FA (TOTP)       │  │
                    │  │ 🔑 Password Policy   │  │
                    │  │ 🔑 Account Lockout   │  │
                    │  │ 🔑 CSRF Protection   │  │
                    │  │ 🔑 Feature Gating    │  │
                    │  └─────────────────────┘  │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │    PostgreSQL 17           │
                    │  🛡️ Firewall: 5432 DENIED  │
                    │  ┌─────────────────────┐  │
                    │  │ 🔒 bcrypt(10)       │  │
                    │  │ 🔒 AES-256-GCM      │  │
                    │  │ 🔒 Soft Delete      │  │
                    │  │ 📋 Auditoría        │  │
                    │  │ 🏢 Multitenant      │  │
                    │  └─────────────────────┘  │
                    └──────────────────────────┘

                    ┌──────────────────────────┐
                    │     n8n + Ollama          │
                    │  (red interna, sin exposición) │
                    │  🔑 N8N_API_KEY auth     │
                    │  🤖 Mistral local (Ollama)│
                    │  🔒 Prompt sanitization   │
                    └──────────────────────────┘
```

### Capas de defensa — Estado de implementación

| Capa | Mecanismo | Estado | Descripción |
|------|-----------|--------|-------------|
| **Red** | Firewall + Traefik | ✅ | Solo puertos 80/443 desde internet. HTTPS obligatorio con Let's Encrypt. |
| **Red** | Docker isolation | ✅ | PostgreSQL solo accesible vía `docker_gwbridge` (172.18.0.1), no expuesto públicamente |
| **Middleware** | Rate limiting | ✅ | 5 intentos/min para login (`/api/auth/*`), 30/min para APIs generales |
| **Middleware** | Security headers | ✅ | X-Frame-Options: DENY, HSTS, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy |
| **Middleware** | Session check | ✅ | Redirige a login si no hay cookie de sesión válida |
| **Auth** | NextAuth v5 | ✅ | JWT con expiración (30 min), renovación cada 5 min de uso activo |
| **Auth** | 2FA / MFA | ✅ | TOTP vía Google Authenticator / Authy con speakeasy + QR codes + backup codes |
| **Auth** | Password policy | ✅ | Validador: 8+ chars, mayúscula, minúscula, número, símbolo |
| **Auth** | Account lockout | ✅ | 5 intentos fallidos → 15 min de bloqueo con `account-lockout.ts` |
| **Auth** | CSRF tokens | ✅ | En todas las mutaciones de auth (NextAuth v5 lo maneja automáticamente) |
| **Auth** | Token recovery | ✅ | Tokens crypto.randomBytes(32), expiración 1 hora. SMTP pendiente (modo dev devuelve link en JSON) |
| **Auth** | Auto-logout | ✅ | Sesión expira a los 30 min de inactividad |
| **Auth** | Mensaje genérico | ✅ | "Email o contraseña incorrectos" — nunca revela si el usuario existe |
| **DB** | bcrypt hashing | ✅ | Passwords hasheados con bcrypt (salt rounds=10) |
| **DB** | Encryption at rest | ✅ | Credenciales encriptadas con AES-256-GCM usando AUTH_SECRET |
| **DB** | Soft delete | ✅ | `deleted_at` en 8 tablas, nada se borra físicamente |
| **DB** | Auditoría | ✅ | `auditoria_accesos` registra todas las operaciones con 7 índices |
| **DB** | Multitenant | ✅ | `tenant_id` en 22 tablas con índices |
| **IA** | Prompt sanitization | ✅ | Guía documentada en `docs/prompts-seguridad.md` (anti-jailbreak, anti-prompt injection) |
| **Twilio** | Signature verification | ✅ | Validación criptográfica de `X-Twilio-Signature` en webhooks |
| **Git** | Secrets cleanup | ✅ | Historial limpiado con `git filter-repo` — secrets eliminados de 71 commits |
| **Infra** | Backup encriptado | ✅ | pg_dump + GPG + rotación 30 días (script + workflow n8n WF-07) |
| **Infra** | Env vars seguras | ✅ | Sin `.env` en repo, todas las variables en Dokploy env vars o volumes de Docker |

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

## Variables de Entorno Sensibles — Estado

| Variable | Estado | Riesgo si se expone |
|----------|--------|---------------------|
| `AUTH_SECRET` | ✅ Configurado en Dokploy env vars | Permite forjar tokens JWT y desencriptar credenciales |
| `DATABASE_URL` | ✅ Configurado en Dokploy env vars (pass rotada) | Acceso completo a la base de datos |
| `TWILIO_AUTH_TOKEN` | ⏳ Pendiente (configurar desde Dashboard) | Enviar/recibir mensajes como el consultorio |
| `MERCADOPAGO_ACCESS_TOKEN` | ⏳ Pendiente (en modo TEST) | Procesar pagos, acceder a datos financieros |
| `N8N_API_KEY` | ✅ Configurado en Dokploy env vars (key "Aiden") | Acceso total a la API de n8n |
| `N8N_ENCRYPTION_KEY` | ✅ Configurado en `.env` de n8n Docker | Desencriptar credenciales de n8n |
| `OLLAMA_BASE_URL` | ✅ Configurado (http://172.18.0.1:11434) | Acceso al modelo de IA local |
| `SMTP_HOST / SMTP_USER / SMTP_PASS` | ⏳ Pendiente (configurar desde Dashboard) | Enviar emails como el dominio |

---

## Historial de acciones de seguridad

| Fecha | Acción |
|-------|--------|
| 19-May-2026 | ✅ Git filter-repo: secrets eliminados de 71 commits |
| 19-May-2026 | ✅ UFW firewall activado (22,80,443,3000 allow / 5432 deny) |
| 19-May-2026 | ✅ Passwords de DB rotadas (dashboard_user + superuser) |
| 19-May-2026 | ✅ AUTH_SECRET generado y configurado en Dokploy |
| 19-May-2026 | ✅ N8N_ENCRYPTION_KEY generada y configurada |
| 19-May-2026 | ✅ N8N_API_KEY configurada en dashboard env vars |
| 19-May-2026 | ✅ Backup descargado localmente (pre-rotación) |
| 19-May-2026 | ✅ Migración 008 aplicada: soft deletes + auditoría + constraints |
| 19-May-2026 | ✅ Feature gating implementado (plan-based access control) |
| 17-May-2026 | ✅ 2FA implementado (TOTP, QR, backup codes) |
| 17-May-2026 | ✅ Rate limiting + security headers en middleware |
| 17-May-2026 | ✅ Password validator + account lockout implementados |
| 17-May-2026 | ✅ Twilio signature verification implementada |
| 16-May-2026 | ✅ Credenciales encriptadas con AES-256-GCM |

## Referencias

- [Arquitectura del sistema](architecture.md)
- [Guía de ayuda para usuarios](../docs/help/index.md)
- [Guía de seguridad de prompts IA](prompts-seguridad.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/security)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [Speakeasy 2FA](https://github.com/speakeasyjs/speakeasy)
