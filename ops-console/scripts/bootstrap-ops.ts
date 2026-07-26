/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Bootstrap de AicoreOps
 *
 * Crea:
 *  1. Rol PostgreSQL `platform_admin_role` con BYPASSRLS
 *  2. Usuario `ops_console_user` con LOGIN
 *  3. Schema `platform` + tablas (ejecuta migración)
 *  4. Primer operador con setup_token
 *
 * ⚠️  Requiere conexión como superuser (postgres) para crear roles.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  ADVERTENCIA DE SEGURIDAD — Rol platform_admin_role
 *
 *   BYPASSRLS permite leer TODOS los datos del schema public (tenants).
 *   Este poder es necesario porque ops-console es un panel de plataforma
 *   que debe monitorear todos los tenants.
 *
 *   REGLAS ETERNAS:
 *   1. El rol `platform_admin_role` NUNCA debe ser usado por el código
 *      del dashboard de tenants ni por n8n.
 *   2. El usuario `ops_console_user` SOLO se conecta desde la app
 *      ops-console (contenedor separado, subdominio separado).
 *   3. Las tablas del schema `public` (datos de tenant) NO tienen
 *      permisos explícitos para `ops_console_user` — el acceso es
 *      exclusivamente vía BYPASSRLS, que es inherente al rol.
 *   4. Auditoría OBLIGATORIA: toda lectura cross-tenant se loggea
 *      en platform.platform_audit_log (append-only + trigger).
 *
 *   Esta excepción de seguridad está DOCUMENTADA y CONTROLADA.
 *   No existe en ningún otro lugar del sistema.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import postgres from 'postgres'
import { randomBytes } from 'crypto'
import { createHash } from 'crypto'

const rawUrl = process.env.OPS_SUPERUSER_URL || process.env.OPS_DATABASE_URL
if (!rawUrl) {
  console.error('❌ Se requiere OPS_SUPERUSER_URL o OPS_DATABASE_URL (con usuario postgres)')
  process.exit(1)
}
const SUPERUSER_URL: string = rawUrl

const SETUP_EMAIL = process.env.OPS_SETUP_EMAIL || 'leo@aicorebots.com'
const SETUP_NOMBRE = process.env.OPS_SETUP_NOMBRE || 'Leonardo Spedaletti'
const OPS_PASSWORD = process.env.OPS_PASSWORD || randomBytes(16).toString('hex')

function generateSetupToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('hex')
  const pepper = process.env.OPS_SETUP_TOKEN_PEPPER || 'dev-pepper'
  const hash = createHash('sha256').update(token + pepper).digest('hex')
  return { token, hash }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║      AicoreOps — Bootstrap de Plataforma        ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()

  const sql = postgres(SUPERUSER_URL, { max: 1 })

  try {
    // ── 1. Crear rol platform_admin_role ──────────────────────
    console.log('1. Creando rol platform_admin_role con BYPASSRLS...')
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_admin_role') THEN
          CREATE ROLE platform_admin_role WITH BYPASSRLS NOLOGIN;
          RAISE NOTICE 'Rol platform_admin_role creado con BYPASSRLS';
        ELSE
          RAISE NOTICE 'Rol platform_admin_role ya existe';
        END IF;
      END
      $$;
    `)
    console.log('   ✅  platform_admin_role listo')

    // ── 2. Crear usuario ops_console_user ─────────────────────
    console.log('2. Creando usuario ops_console_user...')
    await sql.unsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ops_console_user') THEN
          CREATE USER ops_console_user WITH PASSWORD '${OPS_PASSWORD}';
          GRANT platform_admin_role TO ops_console_user;
          RAISE NOTICE 'Usuario ops_console_user creado';
        ELSE
          RAISE NOTICE 'Usuario ops_console_user ya existe';
          -- Actualizar password por si cambió
          ALTER USER ops_console_user WITH PASSWORD '${OPS_PASSWORD}';
        END IF;
      END
      $$;
    `)
    console.log('   ✅  ops_console_user listo')

    // ── 3. Crear schema platform ──────────────────────────────
    console.log('3. Creando schema platform...')
    await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS platform;`)
    console.log('   ✅  Schema platform listo')

    // ── 4. Crear tablas ───────────────────────────────────────
    console.log('4. Creando tablas...')
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS platform.platform_operators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        activo BOOLEAN DEFAULT true NOT NULL,
        totp_secret VARCHAR(255),
        totp_verified BOOLEAN DEFAULT false NOT NULL,
        setup_token VARCHAR(255),
        setup_token_expires TIMESTAMPTZ,
        ultimo_acceso TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS platform.platform_passkeys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID NOT NULL REFERENCES platform.platform_operators(id) ON DELETE CASCADE,
        credential_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        transports TEXT[] DEFAULT '{}',
        device_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        last_used_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_passkeys_operator_id
        ON platform.platform_passkeys(operator_id);

      CREATE TABLE IF NOT EXISTS platform.platform_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID NOT NULL REFERENCES platform.platform_operators(id) ON DELETE CASCADE,
        jti VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked BOOLEAN DEFAULT false NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_operator_id
        ON platform.platform_sessions(operator_id);

      CREATE INDEX IF NOT EXISTS idx_sessions_jti
        ON platform.platform_sessions(jti);

      CREATE TABLE IF NOT EXISTS platform.platform_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_id UUID,
        operator_email VARCHAR(255) NOT NULL,
        accion VARCHAR(100) NOT NULL,
        tenant_afectado VARCHAR(255),
        recurso VARCHAR(255),
        motivo TEXT,
        ip_address INET,
        detalles JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_created_at
        ON platform.platform_audit_log(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_audit_operator_id
        ON platform.platform_audit_log(operator_id);

      CREATE INDEX IF NOT EXISTS idx_audit_accion
        ON platform.platform_audit_log(accion);
    `)
    console.log('   ✅  Tablas creadas')

    // ── 5. Trigger append-only en audit_log ──────────────────
    console.log('5. Creando trigger append-only...')
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION platform.audit_log_append_only()
      RETURNS TRIGGER AS $$
      BEGIN
          RAISE EXCEPTION 'platform_audit_log es append-only: no se permite UPDATE o DELETE'
                USING HINT = 'Inserte un nuevo registro en vez de modificar uno existente';
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_audit_log_append_only ON platform.platform_audit_log;
      CREATE TRIGGER trg_audit_log_append_only
          BEFORE UPDATE OR DELETE ON platform.platform_audit_log
          FOR EACH ROW EXECUTE FUNCTION platform.audit_log_append_only();
    `)
    console.log('   ✅  Trigger append-only listo')

    // ── 6. Permisos para ops_console_user ────────────────────
    console.log('6. Asignando permisos...')
    await sql.unsafe(`
      GRANT USAGE ON SCHEMA platform TO ops_console_user;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA platform TO ops_console_user;

      -- Revocar UPDATE/DELETE en audit_log por seguridad (defensa en profundidad)
      REVOKE UPDATE, DELETE ON platform.platform_audit_log FROM ops_console_user;
    `)
    console.log('   ✅  Permisos asignados')

    // ── 7. Crear primer operador ──────────────────────────────
    console.log('7. Creando primer operador...')
    const { token: setupToken, hash: setupTokenHash } = generateSetupToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

    await sql.unsafe(`
      INSERT INTO platform.platform_operators (email, nombre, setup_token, setup_token_expires)
      VALUES ('${SETUP_EMAIL}', '${SETUP_NOMBRE}', '${setupTokenHash}', '${expiresAt.toISOString()}')
      ON CONFLICT (email) DO UPDATE SET
        setup_token = '${setupTokenHash}',
        setup_token_expires = '${expiresAt.toISOString()}',
        updated_at = now();
    `)
    console.log('   ✅  Primer operador creado')

    // ── 8. Mostrar resumen ───────────────────────────────────
    console.log()
    console.log('╔══════════════════════════════════════════════════╗')
    console.log('║         🎉  Bootstrap completado                ║')
    console.log('╚══════════════════════════════════════════════════╝')
    console.log()
    console.log('📧 Email del operador:')
    console.log(`   ${SETUP_EMAIL}`)
    console.log()
    console.log('🔑 URL de setup (expira 24h):')
    console.log(`   https://ops.aicorebots.com/setup?token=${setupToken}`)
    console.log()
    console.log('🐘 Credenciales ops_console_user (guardar en secrets):')
    console.log(`   Password: ${OPS_PASSWORD}`)
    console.log(`   URL: postgresql://ops_console_user:${OPS_PASSWORD}@postgres:5432/consultorio_medico`)
    console.log()
    console.log('📋 Pasos siguientes:')
    console.log('   1. Agregar OPS_DATABASE_URL + OPS_JWT_SECRET a secrets de Dokploy')
    console.log('   2. Configurar ops.aicorebots.com en Dokploy (Traefik)')
    console.log('   3. Abrir URL de setup en el browser')
    console.log('   4. Registrar passkey + escanear QR TOTP')
    console.log()

  } catch (err) {
    console.error('❌ Error durante bootstrap:', err)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
