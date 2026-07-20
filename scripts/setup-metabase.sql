-- ============================================================
-- Metabase Read-Only User Setup for PostgreSQL
-- ============================================================
-- Ejecutar en la base de datos consultorio_medico como superusuario
-- Requiere: METABASE_DB_PASSWORD configurado en secrets de Docker Swarm
-- ============================================================

-- 1. Crear base de datos para Metabase (metadata interna)
CREATE DATABASE metabase;

-- 2. Crear usuario para Metabase (metadata)
CREATE USER metabase_user WITH ENCRYPTED PASSWORD 'CAMBIAR_POR_SECRET_METABASE_DB_PASSWORD';

-- 3. Dar permisos a metabase_user sobre su propia DB
GRANT ALL PRIVILEGES ON DATABASE metabase TO metabase_user;
\c metabase
GRANT ALL ON SCHEMA public TO metabase_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO metabase_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO metabase_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO metabase_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO metabase_user;

-- 4. Crear usuario READ-ONLY para consultas de negocio (dashboard_data)
CREATE USER metabase_readonly WITH ENCRYPTED PASSWORD 'CAMBIAR_POR_SECRET_METABASE_READONLY_PASSWORD';

-- 5. Conceder permisos de solo lectura en consultorio_medico
\c consultorio_medico

-- Permisos a nivel de base de datos
GRANT CONNECT ON DATABASE consultorio_medico TO metabase_readonly;

-- Permisos a nivel de esquema
GRANT USAGE ON SCHEMA public TO metabase_readonly;

-- Permisos SELECT en todas las tablas existentes
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_readonly;

-- Permisos SELECT en tablas futuras (default privileges)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_readonly;

-- Permisos en secuencias (para IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO metabase_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO metabase_readonly;

-- 6. Verificar permisos
\dp public.*

-- ============================================================
-- CONFIGURACIÓN EN METABASE (después de iniciar el contenedor)
-- ============================================================
-- 1. Acceder a http://metabase.aicorebots.com (o puerto 3001 interno)
-- 2. Configurar cuenta admin inicial
-- 3. Agregar base de datos:
--    - Tipo: PostgreSQL
--    - Host: postgres (interno) / 51.222.207.250 (externo)
--    - Puerto: 5432
--    - Base de datos: consultorio_medico
--    - Usuario: metabase_readonly
--    - Contraseña: [la del secret metabase_readonly_password]
--    - SSL: prefer (o require si está configurado)
-- 4. Configurar sincronización: cada hora
-- 5. Crear dashboards y preguntas

-- ============================================================
-- SECRETS REQUERIDOS EN DOCKER SWARM
-- ============================================================
-- echo "password_metabase_db" | docker secret create metabase_db_password -
-- echo "password_metabase_readonly" | docker secret create metabase_readonly_password -
-- echo "clave_encriptacion_32_chars_min" | docker secret create metabase_encryption_key -